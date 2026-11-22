"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";
import { rateLimit } from "@/lib/auth/rate-limit";

export interface QuestionView {
  id: string;
  stemBn: string;
  optionsBn: string[];
  marks: number;
}

export interface StartResult {
  ok: boolean;
  error?: string;
  attemptId?: string;
  questions?: QuestionView[];
  durationMinutes?: number;
  attemptNumber?: number;
  maxAttempts?: number;
}

/**
 * Start an exam attempt: validates enrollment, attempt limits, and returns
 * questions WITHOUT the correct answers (server keeps those for scoring).
 */
export async function startExamAction(examId: string): Promise<StartResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: "লগইন প্রয়োজন" };

  const h = await headers();
  const _ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`exam:${ctx.user.id}`, 20, 300);
  if (!rl.ok) return { ok: false, error: "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।" };

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { order: "asc" }, include: { question: true } } },
  });
  if (!exam || !exam.isPublished) return { ok: false, error: "পরীক্ষা পাওয়া যায়নি" };
  if (exam.courseId) {
    const access = await assertCourseAccess(ctx.user.id, exam.courseId);
    if (!access.allowed) return { ok: false, error: "এই পরীক্ষায় অংশ নিতে কোর্সে এনরোলমেন্ট প্রয়োজন" };
  }
  const now = new Date();
  if (exam.availableFrom && exam.availableFrom > now) return { ok: false, error: "পরীক্ষা এখনো শুরু হয়নি" };
  if (exam.availableTo && exam.availableTo < now) return { ok: false, error: "পরীক্ষার সময় শেষ" };

  const priorCount = await prisma.examAttempt.count({ where: { examId, userId: ctx.user.id } });
  if (exam.maxAttempts > 0 && priorCount >= exam.maxAttempts) {
    return { ok: false, error: `আপনার চেষ্টার সীমা (${exam.maxAttempts} বার) শেষ।` };
  }

  // Expire stale in-progress attempts
  await prisma.examAttempt.updateMany({
    where: { examId, userId: ctx.user.id, status: "IN_PROGRESS", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  const ongoing = await prisma.examAttempt.findFirst({
    where: { examId, userId: ctx.user.id, status: "IN_PROGRESS", expiresAt: { gt: now } },
  });
  if (ongoing) return { ok: false, error: "একটি চেষ্টা চলমান আছে — সেটি জমা দিন বা মেয়াদ শেষ হতে দিন।" };

  let questions = exam.questions.map((q) => q);
  if (exam.shuffleQuestions) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  const attempt = await prisma.examAttempt.create({
    data: {
      examId,
      userId: ctx.user.id,
      attemptNumber: priorCount + 1,
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      answers: [],
      expiresAt: new Date(now.getTime() + exam.durationMinutes * 60_000),
    },
  });

  return {
    ok: true,
    attemptId: attempt.id,
    durationMinutes: exam.durationMinutes,
    attemptNumber: attempt.attemptNumber,
    maxAttempts: exam.maxAttempts,
    questions: questions.map((link) => ({
      id: link.question.id,
      stemBn: link.question.stemBn,
      optionsBn: link.question.optionsBn as string[],
      marks: link.marks,
    })),
  };
}

export interface SubmitInput {
  attemptId: string;
  answers: { questionId: string; selected: number | null }[];
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
  score?: number;
  totalMarks?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  pass?: boolean;
  review?: { stemBn: string; optionsBn: string[]; selected: number | null; correctIndex: number; explanationBn: string | null }[];
}

/** Submit answers → server-side scoring. Correct answers returned only now. */
export async function submitExamAction(input: SubmitInput): Promise<SubmitResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, error: "লগইন প্রয়োজন" };

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: input.attemptId, userId: ctx.user.id },
    include: { exam: true },
  });
  if (!attempt) return { ok: false, error: "চেষ্টা পাওয়া যায়নি" };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "চেষ্টাটি ইতিমধ্যে জমা হয়েছে" };

  const examLinks = await prisma.examQuestion.findMany({
    where: { examId: attempt.examId },
    include: { question: true },
  });

  let score = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const answerRows: unknown[] = [];
  const review: NonNullable<SubmitResult["review"]> = [];

  for (const q of examLinks) {
    const given = input.answers.find((a) => a.questionId === q.question.id);
    const selected = given && given.selected !== null && given.selected >= 0 && given.selected <= 3 ? given.selected : null;
    const isCorrect = selected === q.question.correctIndex;
    const marks = isCorrect ? q.marks : selected === null ? 0 : -attempt.exam.negativePerWrong;
    score += marks;
    if (selected === null) skipped += 1;
    else if (isCorrect) correct += 1;
    else wrong += 1;
    answerRows.push({ questionId: q.question.id, selected, correct: isCorrect, marks });
    review.push({
      stemBn: q.question.stemBn,
      optionsBn: q.question.optionsBn as string[],
      selected,
      correctIndex: q.question.correctIndex,
      explanationBn: q.question.explanationBn,
    });
  }

  score = Math.max(0, Math.round(score * 100) / 100);
  const passed = attempt.exam.passMarks > 0 ? score >= attempt.exam.passMarks : score >= attempt.totalMarks / 2;

  await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      score,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      answers: answerRows as never,
    },
  });

  return {
    ok: true,
    score,
    totalMarks: attempt.totalMarks,
    correctCount: correct,
    wrongCount: wrong,
    skippedCount: skipped,
    pass: passed,
    review,
  };
}

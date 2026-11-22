"use client";

import { useEffect, useState, useTransition } from "react";
import { Clock, CircleCheck, CircleX, CircleMinus } from "lucide-react";
import { startExamAction, submitExamAction, type QuestionView, type SubmitResult } from "@/lib/actions/exams";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { bnDigits } from "@/lib/format";

export function ExamRunner({
  examId,
  titleBn,
  courseTitle,
  description,
  negativePerWrong,
  passMarks,
}: {
  examId: string;
  titleBn: string;
  courseTitle: string | null;
  description: string | null;
  negativePerWrong: number;
  passMarks: number;
}) {
  const [questions, setQuestions] = useState<QuestionView[] | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [started, setStarted] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [starting, startStart] = useTransition();

  const remaining = started !== null ? Math.max(0, duration * 60 - Math.floor((Date.now() - started) / 1000)) : duration * 60;

  // countdown tick
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (started === null || result) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [started, result]);

  function begin() {
    startStart(async () => {
      const res = await startExamAction(examId);
      if (!res.ok) {
        setError(res.error ?? "শুরু করা যায়নি");
        return;
      }
      setQuestions(res.questions ?? []);
      setAttemptId(res.attemptId ?? null);
      setDuration(res.durationMinutes ?? 15);
      setStarted(Date.now());
      setAnswers({});
    });
  }

  // auto-submit at zero
  useEffect(() => {
    if (started !== null && remaining <= 0 && !result && attemptId) {
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function doSubmit() {
    if (!attemptId || !questions) return;
    startSubmit(async () => {
      const res = await submitExamAction({
        attemptId,
        answers: questions.map((q) => ({ questionId: q.id, selected: answers[q.id] ?? null })),
      });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (error && !questions) {
    return <Alert tone="danger">{error}</Alert>;
  }

  if (!questions) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="display text-[24px] font-bold text-ink">{titleBn}</h1>
        {courseTitle && <p className="mt-1 text-[14px] text-muted">কোর্স: {courseTitle}</p>}
        {description && <p className="mt-3 text-[14px] leading-relaxed text-muted">{description}</p>}
        <Card className="mt-6 p-6">
          <h2 className="font-semibold text-ink">নিয়মাবলি</h2>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-[14px] text-muted">
            <li>প্রতিটি প্রশ্নে একটি সঠিক উত্তর আছে; সময় শেষ হলে স্বয়ংক্রিয়ভাবে জমা হবে।</li>
            {negativePerWrong > 0 && (
              <li>
                ভুল উত্তরে <b className="text-danger">{bnDigits(negativePerWrong)}</b> নম্বর কাটা যাবে; না-লেখার মানে শূন্য।
              </li>
            )}
            <li>পরীক্ষা চলাকালীন পেজ রিফ্রেশ করলে এই চেষ্টা বাতিল হবে।</li>
          </ul>
          <div className="mt-5">
            <Button size="lg" onClick={begin} disabled={starting}>
              {starting ? "প্রস্তুত হচ্ছে…" : "পরীক্ষা শুরু করুন"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="rule-frame-tight p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="display text-[22px] font-bold text-ink">ফলাফল — {titleBn}</h1>
              <p className="mt-1 text-[13.5px] text-muted">রেজাল্ট সাথে সাথেই হিসাব হয়েছে।</p>
            </div>
            <div className="text-right">
              <p className="display tabnum text-[34px] font-extrabold text-ink">
                {bnDigits(result.score ?? 0)}
                <span className="text-[18px] text-muted"> / {bnDigits(result.totalMarks ?? 0)}</span>
              </p>
              <Badge tone={result.pass ? "success" : "danger"}>
                {result.pass ? "উত্তীর্ণ" : `উত্তীর্ণ হতে হবে ${bnDigits(passMarks)}+`}
              </Badge>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line text-center">
            {[
              { icon: CircleCheck, k: "সঠিক", v: result.correctCount ?? 0, tone: "text-success" },
              { icon: CircleX, k: "ভুল", v: result.wrongCount ?? 0, tone: "text-danger" },
              { icon: CircleMinus, k: "শূন্য", v: result.skippedCount ?? 0, tone: "text-muted" },
            ].map((s) => (
              <div key={s.k} className="px-3 py-3.5">
                <dt className={`flex items-center justify-center gap-1.5 text-[12.5px] ${s.tone}`}>
                  <s.icon size={14} /> {s.k}
                </dt>
                <dd className="display tabnum mt-1 text-[20px] font-bold text-ink">{bnDigits(s.v)}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <h2 className="display mt-8 text-[19px] font-bold text-ink">উত্তরপত্র পর্যালোচনা</h2>
        <div className="mt-4 space-y-4">
          {result.review?.map((r, i) => {
            const sel = r.selected;
            return (
              <Card key={i} className="p-5">
                <p className="flex items-start gap-2.5 text-[15px] font-medium text-ink">
                  <span className="display tabnum shrink-0 text-gold">{bnDigits(i + 1)}.</span>
                  {r.stemBn}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {r.optionsBn.map((opt, oi) => {
                    const isCorrect = oi === r.correctIndex;
                    const isPicked = oi === sel;
                    return (
                      <li
                        key={oi}
                        className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-[14px] ${
                          isCorrect
                            ? "border-success/50 bg-success-wash text-ink"
                            : isPicked
                              ? "border-danger/50 bg-danger-wash text-ink"
                              : "border-line text-muted"
                        }`}
                      >
                        <span className="display w-5">{bnDigits(oi + 1)}.</span>
                        {opt}
                        {isCorrect && <CircleCheck size={15} className="ml-auto text-success" />}
                        {isPicked && !isCorrect && <CircleX size={15} className="ml-auto text-danger" />}
                      </li>
                    );
                  })}
                </ul>
                {r.explanationBn && (
                  <p className="mt-3 rounded-md bg-gold-wash px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
                    <b className="text-gold">ব্যাখ্যা:</b> {r.explanationBn}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-sm md:mx-0 md:px-0">
        <div className="flex items-center justify-between">
          <h1 className="display text-[17px] font-bold text-ink">{titleBn}</h1>
          <span
            className={`tabnum inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[14px] font-bold ${
              remaining < 60 ? "bg-danger-wash text-danger" : "bg-teal/10 text-teal"
            }`}
            aria-live="polite"
          >
            <Clock size={15} /> {bnDigits(String(mm).padStart(2, "0"))}:{bnDigits(String(ss).padStart(2, "0"))}
            <span className="sr-only">টিক {tick}</span>
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <Card key={q.id} className="p-5">
            <p className="flex items-start gap-2.5 text-[15px] font-medium text-ink">
              <span className="display tabnum shrink-0 text-gold">{bnDigits(qi + 1)}.</span>
              {q.stemBn}
            </p>
            <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
              {q.optionsBn.map((opt, oi) => {
                const picked = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className={`flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-[14px] transition-colors ${
                      picked
                        ? "border-teal bg-teal/10 font-medium text-ink"
                        : "border-line text-muted hover:border-teal hover:text-ink"
                    }`}
                  >
                    <span className={`display w-5 ${picked ? "text-teal" : "text-muted"}`}>{bnDigits(oi + 1)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
        <p className="text-[13px] text-muted">
          উত্তর দেওয়া হয়েছে: {bnDigits(Object.values(answers).filter((v) => v !== null && v !== undefined).length)}/{bnDigits(questions.length)}
        </p>
        <Button size="lg" onClick={doSubmit} disabled={submitting}>
          {submitting ? "জমা হচ্ছে…" : "জমা দিন"}
        </Button>
      </div>
    </div>
  );
}

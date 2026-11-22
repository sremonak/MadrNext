import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";
import { ExamRunner } from "./exam-runner";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const ctx = (await getAuthContext())!;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { course: { select: { id: true, titleBn: true } } },
  });
  if (!exam || !exam.isPublished) notFound();
  if (exam.course) {
    const access = await assertCourseAccess(ctx.user.id, exam.course.id);
    if (!access.allowed) redirect("/learn/exams");
  }

  return (
    <div>
      <ExamRunner
        examId={exam.id}
        titleBn={exam.titleBn}
        courseTitle={exam.course?.titleBn ?? null}
        description={exam.description}
        negativePerWrong={exam.negativePerWrong}
        passMarks={exam.passMarks}
      />
    </div>
  );
}

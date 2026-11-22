import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, Card, EmptyState } from "@/components/ui";
import { bnDigits, formatDateTimeBn } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "পরীক্ষা" };

export default async function ExamsPage() {
  const ctx = (await getAuthContext())!;
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: ctx.user.id, status: "ACTIVE" },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);

  const exams = await prisma.exam.findMany({
    where: { isPublished: true, OR: [{ courseId: null }, { courseId: { in: courseIds } }] },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { titleBn: true, slug: true } },
      subject: { select: { nameBn: true } },
      _count: { select: { questions: true } },
      attempts: { where: { userId: ctx.user.id }, orderBy: { attemptNumber: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">পরীক্ষা</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        প্র্যাকটিস, চ্যাপ্টার টেস্ট ও মডেল টেস্ট — রেজাল্ট জমার সাথে সাথেই।
      </p>
      {exams.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="কোনো পরীক্ষা নেই" body="কোর্সে এনরোল করলে সেই কোর্সের পরীক্ষাগুলো এখানে দেখা যাবে।" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {exams.map((exam) => {
            const last = exam.attempts[0];
            const typeLabel =
              exam.type === "MCQ_PRACTICE" ? "প্র্যাকটিস" : exam.type === "CHAPTER_TEST" ? "চ্যাপ্টার টেস্ট" : "মডেল টেস্ট";
            return (
              <Card key={exam.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{typeLabel}</Badge>
                    {exam.subject && <Badge>{exam.subject.nameBn}</Badge>}
                  </div>
                  <h2 className="display mt-2 text-[16.5px] font-bold text-ink">{exam.titleBn}</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    {exam.course && `কোর্স: ${exam.course.titleBn} · `}
                    {bnDigits(exam._count.questions)}টি প্রশ্ন · {bnDigits(exam.durationMinutes)} মিনিট
                    {exam.maxAttempts > 0 && ` · সর্বোচ্চ ${bnDigits(exam.maxAttempts)} বার`}
                  </p>
                </div>
                {last?.status === "SUBMITTED" && (
                  <div className="text-right">
                    <p className="text-[12px] text-muted">সর্বশেষ রেজাল্ট</p>
                    <p className="display tabnum text-[18px] font-bold text-teal">
                      {bnDigits(last.score ?? 0)}/{bnDigits(last.totalMarks)}
                    </p>
                    <p className="text-[11.5px] text-muted">{formatDateTimeBn(last.submittedAt!)}</p>
                  </div>
                )}
                <Link
                  href={`/learn/exams/${exam.id}`}
                  className="inline-flex h-10 items-center rounded-md bg-teal px-5 text-[14px] font-semibold text-white hover:bg-teal-deep"
                >
                  {last?.status === "IN_PROGRESS" ? "চালিয়ে যান" : last ? "আবার দিন" : "শুরু করুন"}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

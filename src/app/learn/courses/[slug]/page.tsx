import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, FileText, Video, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { assertCourseAccess } from "@/lib/access";
import { requireAuth } from "@/lib/auth/session";
import { ButtonLink, Card } from "@/components/ui";
import { bnDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LearnCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireAuth();
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: { lessons: { where: { isPublished: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const access = await assertCourseAccess(ctx.user.id, course.id);
  if (!access.allowed) {
    const reason = access.reason;
    if (reason === "NOT_ENROLLED") redirect(`/courses/${slug}`);
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <h1 className="display text-[20px] font-bold text-ink">
          {reason === "PENDING"
            ? "এনরোলমেন্ট যাচাই চলছে"
            : reason === "EXPIRED"
              ? "এনরোলমেন্টের মেয়াদ শেষ"
              : reason === "SUSPENDED"
                ? "এনরোলমেন্ট স্থগিত"
                : "অ্যাক্সেস বাতিল"}
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          {reason === "PENDING"
            ? "পেমেন্ট যাচাই হলে স্বয়ংক্রিয়ভাবে কোর্স খুলে যাবে। নোটিফিকেশন দেখুন।"
            : "বিস্তারিত জানতে সাপোর্টে যোগাযোগ করুন।"}
        </p>
        <div className="mt-5">
          <ButtonLink href="/learn" variant="secondary">ড্যাশবোর্ডে ফিরুন</ButtonLink>
        </div>
      </Card>
    );
  }

  const enrollId = access.enrollmentId!;
  const progress = await prisma.lessonProgress.findMany({
    where: { userId: ctx.user.id, enrollmentId: enrollId },
    select: { lessonId: true, completedAt: true },
  });
  const completedSet = new Set(progress.filter((p) => p.completedAt).map((p) => p.lessonId));

  const firstIncomplete = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => !completedSet.has(l.id));

    return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-[24px] font-bold text-ink">{course.titleBn}</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {bnDigits(completedSet.size)}/{bnDigits(course.modules.flatMap((m) => m.lessons).length)} পাঠ সম্পন্ন
          </p>
        </div>
        {firstIncomplete && (
          <ButtonLink href={`/learn/courses/${slug}/lesson/${firstIncomplete.id}`} size="md">
            {completedSet.size === 0 ? "শুরু করুন" : "চালিয়ে যান"}
          </ButtonLink>
        )}
      </div>

      <div className="mt-7 space-y-4">
        {course.modules.map((mod, mi) => (
          <Card key={mod.id} className="overflow-hidden">
            <div className="flex items-baseline gap-3 border-b border-line bg-paper px-5 py-3.5">
              <span className="display tabnum text-[15px] font-bold text-gold">{bnDigits(mi + 1)}.</span>
              <h2 className="flex-1 text-[15.5px] font-semibold text-ink">{mod.titleBn}</h2>
              <span className="text-[12.5px] text-muted">
                {bnDigits(mod.lessons.filter((l) => completedSet.has(l.id)).length)}/{bnDigits(mod.lessons.length)} সম্পন্ন
              </span>
            </div>
            <ol className="divide-y divide-line">
              {mod.lessons.map((lesson, li) => {
                const done = completedSet.has(lesson.id);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/courses/${slug}/lesson/${lesson.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-paper"
                    >
                      {done ? (
                        <CheckCircle2 size={17} className="shrink-0 text-success" />
                      ) : lesson.type === "VIDEO" ? (
                        <Video size={16} className="shrink-0 text-teal" />
                      ) : lesson.type === "DOCUMENT" ? (
                        <FileText size={16} className="shrink-0 text-teal" />
                      ) : (
                        <BookOpen size={16} className="shrink-0 text-teal" />
                      )}
                      <span className="flex-1 text-[14.5px] text-ink">{lesson.titleBn}</span>
                      <span className="tabnum text-[12px] text-muted">পাঠ {bnDigits(li)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}

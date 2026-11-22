import { prisma } from "@/lib/db";
import { CourseCard, type CourseCardData } from "@/components/course/CourseCard";
import { EmptyState, SectionTitle } from "@/components/ui";
import { getAuthContext } from "@/lib/auth/session";
import { bnDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "দাখিল কোর্স" };

export default async function DakhilCoursesPage() {
  const [courses, ctx] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED", level: "DAKHIL" },
      orderBy: [{ classNumber: "asc" }, { isFeatured: "desc" }],
      include: {
        instructor: { select: { nameBn: true } },
        modules: { where: { isPublished: true }, select: { _count: { select: { lessons: { where: { isPublished: true } } } } } },
      },
    }),
    getAuthContext(),
  ]);
  const enrolledIds = ctx
    ? (await prisma.enrollment.findMany({ where: { userId: ctx.user.id, status: "ACTIVE" }, select: { courseId: true } })).map((e) => e.courseId)
    : [];

  const cards: CourseCardData[] = courses.map((c) => ({
    id: c.id, slug: c.slug, titleBn: c.titleBn, subtitleBn: c.subtitleBn, level: c.level,
    pricePaisa: c.pricePaisa, discountPaisa: c.discountPaisa, discountEndsAt: c.discountEndsAt,
    durationMinutes: c.durationMinutes, thumbnailSeed: c.thumbnailSeed,
    instructorName: c.instructor?.nameBn, lessonCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0), isFree: c.pricePaisa === 0,
    isEnrolled: enrolledIds.includes(c.id),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <SectionTitle
        title="দাখিল কোর্সসমূহ"
        sub={`${bnDigits(cards.length)}টি কোর্স — ৯ম ও ১০ম শ্রেণির (এসএসসি সমমান) পূর্ণাঙ্গ প্রস্তুতি।`}
      />
      {cards.length === 0 ? (
        <EmptyState title="দাখিল কোর্স শীঘৈ আসছে" body="নতুন কোর্স প্রকাশের সাথে সাথেই এখানে যুক্ত হবে।" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}

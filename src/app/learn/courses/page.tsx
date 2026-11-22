import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { CourseCover } from "@/components/course/CourseCover";
import { bnDigits } from "@/lib/format";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "আমার কোর্স" };

export default async function MyCoursesPage() {
  const ctx = await requireAuth();
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        select: {
          slug: true, titleBn: true, thumbnailSeed: true, level: true, status: true,
          modules: { where: { isPublished: true }, select: { lessons: { where: { isPublished: true }, select: { id: true } } } },
        },
      },
      progress: { where: { completedAt: { not: null } }, select: { lessonId: true } },
    },
  });

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">আমার কোর্স</h1>
      {enrollments.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="কোনো এনরোলমেন্ট নেই"
            body="কোর্স কিনলে বা ফ্রি এনরোল করলে সেগুলো এখানে দেখা যাবে।"
            action={<ButtonLink href="/courses">কোর্স ক্যাটালগ</ButtonLink>}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((en) => {
            const total = en.course.modules.flatMap((m) => m.lessons).length;
            const done = en.progress.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={en.id} className="overflow-hidden">
                <div className="relative">
                  <CourseCover seed={en.course.thumbnailSeed} title={en.course.titleBn} className="h-28 w-full" />
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-line">
                    <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/learn/courses/${en.course.slug}`} className="display text-[15.5px] font-bold leading-snug text-ink hover:text-teal">
                      {en.course.titleBn}
                    </Link>
                    <Badge
                      tone={en.status === "ACTIVE" ? "success" : en.status === "PENDING" ? "warn" : "danger"}
                    >
                      {en.status === "ACTIVE"
                        ? "সক্রিয়"
                        : en.status === "PENDING"
                          ? "যাচাই চলছে"
                          : en.status === "EXPIRED"
                            ? "মেয়াদ শেষ"
                            : en.status === "SUSPENDED"
                              ? "স্থগিত"
                              : "বাতিল"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[12.5px] text-muted">
                    {bnDigits(done)}/{bnDigits(total)} পাঠ · {bnDigits(pct)}% সম্পন্ন
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

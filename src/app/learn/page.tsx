import Link from "next/link";
import { ArrowRight, BookOpen, Megaphone, PlayCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, ButtonLink, Card, EmptyState } from "@/components/ui";
import { CourseCover } from "@/components/course/CourseCover";
import { bnDigits, relativeTimeBn } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "ড্যাশবোর্ড" };

export default async function LearnDashboardPage() {
  const ctx = (await getAuthContext())!;
  const userId = ctx.user.id;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { lastActivityAt: "desc" },
    include: {
      course: {
        select: {
          id: true, slug: true, titleBn: true, thumbnailSeed: true, level: true, durationMinutes: true,
          modules: {
            where: { isPublished: true },
            select: { lessons: { where: { isPublished: true }, select: { id: true } } },
          },
        },
      },
      progress: { where: { completedAt: { not: null } }, select: { lessonId: true, lastViewedAt: true } },
    },
  });

  const continueItems = await Promise.all(
    enrollments.slice(0, 3).map(async (en) => {
      const lastViewed = await prisma.lessonProgress.findFirst({
        where: { userId, enrollmentId: en.id },
        orderBy: { lastViewedAt: "desc" },
        include: {
          lesson: {
            select: { id: true, titleBn: true, moduleId: true },
          },
        },
      });
      const allLessonIds = en.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
      const completed = en.progress.filter((p) => allLessonIds.includes(p.lessonId)).length;
      const percent = allLessonIds.length ? Math.round((completed / allLessonIds.length) * 100) : 0;
      return {
        course: en.course,
        lastViewed,
        percent,
        completed,
        totalLessons: allLessonIds.length,
      };
    }),
  );

  const [announcements, notifications] = await Promise.all([
    prisma.announcement.findMany({
      where: { isPublished: true, OR: [{ courseId: null }, { courseId: { in: enrollments.map((e) => e.courseId) } }] },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const greeting = new Date().getHours() < 12 ? "শুভ সকাল" : new Date().getHours() < 17 ? "শুভ অপরাহ্ন" : "শুভ সন্ধ্যা";

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[26px] font-bold text-ink">
            {greeting}, {ctx.user.name}
          </h1>
          <p className="mt-1 text-[14.5px] text-muted">
            {enrollments.length > 0
              ? `${bnDigits(enrollments.length)}টি সক্রিয় কোর্স আছে — আজ কোথায় থামিয়েছিলেন সেখান থেকেই শুরু করুন।`
              : "আপনার লার্নিং যাত্রা শুরু করুন — কোর্স ক্যাটালগ দেখে পছন্দের বিষয়ে এনরোল করুন।"}
          </p>
        </div>
        <ButtonLink href="/courses" variant="secondary" size="sm">
          নতুন কোর্স <ArrowRight size={14} />
        </ButtonLink>
      </section>

      {/* Continue learning */}
      <section>
        <h2 className="display mb-4 flex items-center gap-2 text-[19px] font-bold text-ink">
          <PlayCircle size={19} className="text-teal" /> শেখা চালিয়ে যান
        </h2>
        {enrollments.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={34} />}
            title="এখনো কোনো কোর্সে এনরোল করেননি"
            body="কোর্স ক্যাটালগ থেকে আপনার শ্রেণির কোর্স বেছে নিন। ফ্রি প্রিভিউ পাঠ দিয়েই শুরু করতে পারেন।"
            action={<ButtonLink href="/courses">কোর্স দেখুন</ButtonLink>}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {continueItems.map((item) => (
              <Card key={item.course.id} className="overflow-hidden">
                <div className="relative">
                  <CourseCover seed={item.course.thumbnailSeed} title={item.course.titleBn} className="h-28 w-full" />
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-line">
                    <div className="h-full bg-gold" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="display text-[15.5px] font-bold leading-snug text-ink">{item.course.titleBn}</h3>
                  <p className="mt-1.5 text-[12.5px] text-muted">
                    {bnDigits(item.completed)}/{bnDigits(item.totalLessons)} পাঠ সম্পন্ন ({bnDigits(item.percent)}%)
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {item.lastViewed
                      ? `সর্বশেষ: ${item.lastViewed.lesson.titleBn}`
                      : "এখনো শুরু করেননি"}
                  </p>
                  <Link
                    href={`/learn/courses/${item.course.slug}${item.lastViewed ? `/lesson/${item.lastViewed.lesson.id}` : ""}`}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-teal py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-teal-deep"
                  >
                    {item.lastViewed ? "চালিয়ে যান" : "শুরু করুন"} <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* All courses with progress */}
      {enrollments.length > 0 && (
        <section>
          <h2 className="display mb-4 text-[19px] font-bold text-ink">আমার কোর্সসমূহ</h2>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-line bg-paper text-[12.5px] text-muted">
                  <th className="px-5 py-3 font-medium">কোর্স</th>
                  <th className="px-5 py-3 font-medium">প্রগ্রেস</th>
                  <th className="px-5 py-3 font-medium">স্ট্যাটাস</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {enrollments.map((en) => {
                  const total = en.course.modules.flatMap((m) => m.lessons).length;
                  const done = en.progress.length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={en.id}>
                      <td className="px-5 py-3.5">
                        <Link href={`/learn/courses/${en.course.slug}`} className="font-medium text-ink hover:text-teal">
                          {en.course.titleBn}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line">
                            <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabnum text-[12.5px] text-muted">{bnDigits(pct)}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone="success">সক্রিয়</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/learn/courses/${en.course.slug}`} className="text-[13px] font-semibold text-teal">
                          খুলুন →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Announcements + notifications */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="display mb-4 flex items-center gap-2 text-[19px] font-bold text-ink">
            <Megaphone size={18} className="text-gold" /> ঘোষণা
          </h2>
          {announcements.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong p-5 text-[13.5px] text-muted">
              কোনো ঘোষণা নেই।
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Card key={a.id} className="p-4">
                  <p className="text-[14.5px] font-semibold text-ink">{a.titleBn}</p>
                  <p className="mt-1 line-clamp-2 text-[13.5px] text-muted">{a.bodyBn}</p>
                  <p className="mt-2 text-[12px] text-muted">{relativeTimeBn(a.publishedAt)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="display mb-4 text-[19px] font-bold text-ink">সাম্প্রতিক নোটিফিকেশন</h2>
          {notifications.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong p-5 text-[13.5px] text-muted">
              নতুন নোটিফিকেশন নেই।
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.linkUrl ?? "/learn/notifications"}
                  className="block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-teal"
                >
                  <p className="text-[14px] font-semibold text-ink">{n.titleBn}</p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{n.bodyBn}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

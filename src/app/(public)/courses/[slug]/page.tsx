import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Clock,
  FileText,
  Layers,
  Lock,
  MonitorPlay,
  ShieldCheck,
  Video,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { CourseCover } from "@/components/course/CourseCover";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { bnDigits, formatDurationBn, formatTaka } from "@/lib/format";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

const LEVEL_LABEL = { DAKHIL: "দাখিল", ALIM: "আলিম", GENERAL: "জেনারেল" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({ where: { slug }, select: { titleBn: true, subtitleBn: true } });
  if (!course) return { title: "কোর্স পাওয়া যায়নি" };
  return { title: course.titleBn, description: course.subtitleBn ?? undefined };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      category: true,
      subject: true,
      instructor: true,
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, titleBn: true, type: true, durationSeconds: true, isPreview: true } },
          _count: { select: { lessons: { where: { isPublished: true } } } },
        },
      },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!course || (course.status !== "PUBLISHED" && course.status !== "ARCHIVED")) notFound();

  const ctx = await getAuthContext();
  const access = ctx ? await assertCourseAccess(ctx.user.id, course.id) : null;
  const enrolled = access?.allowed ?? false;

  const hasDiscount = course.discountPaisa !== null && course.discountPaisa < course.pricePaisa;
  const currentPrice = hasDiscount ? course.discountPaisa! : course.pricePaisa;
  const isFree = currentPrice === 0;

  const lessonCount = course.modules.reduce((sum, m) => sum + m._count.lessons, 0);
  const examCount = await prisma.exam.count({ where: { courseId: course.id, isPublished: true } });

  return (
    <>
      {/* Course header band */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr_340px] md:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
              <Badge tone="info">{LEVEL_LABEL[course.level]}</Badge>
              {course.classNumber && <Badge>ক্লাস {bnDigits(course.classNumber)}</Badge>}
              {course.subject && <Badge>{course.subject.nameBn}</Badge>}
            </div>
            <h1 className="display mt-3 text-[30px] font-extrabold leading-tight text-ink md:text-[36px]">
              {course.titleBn}
            </h1>
            {course.subtitleBn && <p className="mt-3 max-w-2xl text-[15.5px] text-muted">{course.subtitleBn}</p>}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Layers size={14} /> {bnDigits(lessonCount)} পাঠ
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} /> {formatDurationBn(course.durationMinutes)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={14} /> {bnDigits(examCount)}টি পরীক্ষা
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={14} /> {bnDigits(course._count.enrollments)} শিক্ষার্থী এনরোল্ড
              </span>
            </div>

            {course.instructor && (
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-paper p-4">
                <div className="display flex h-12 w-12 items-center justify-center rounded-full bg-teal text-[17px] font-bold text-white" aria-hidden="true">
                  {course.instructor.nameBn.charAt(0)}
                </div>
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">{course.instructor.nameBn}</p>
                  <p className="text-[13px] text-gold">{course.instructor.designationBn}</p>
                </div>
                <Link href="/teachers" className="ml-auto text-[13px] font-medium text-teal hover:text-teal-deep">
                  শিক্ষক পরিচিতি →
                </Link>
              </div>
            )}
          </div>

          {/* Purchase panel */}
          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rule-frame-tight rounded-lg bg-surface p-5">
              <CourseCover seed={course.thumbnailSeed} title={course.titleBn} level={LEVEL_LABEL[course.level]} className="mb-4 h-36 w-full rounded-md" />
              <div className="flex items-baseline gap-2.5">
                {isFree ? (
                  <span className="display text-[24px] font-bold text-success">ফ্রি</span>
                ) : (
                  <>
                    <span className="display text-[24px] font-bold text-ink">{formatTaka(currentPrice)}</span>
                    {hasDiscount && (
                      <span className="text-[14px] text-muted line-through">{formatTaka(course.pricePaisa)}</span>
                    )}
                  </>
                )}
              </div>
              {hasDiscount && (
                <p className="mt-1 text-[12.5px] text-danger">
                  ডিসকাউন্ট চলছে — মূল্য {formatTaka(course.pricePaisa)}
                </p>
              )}
              <div className="mt-4">
                {enrolled ? (
                  <ButtonLink href={`/learn/courses/${course.slug}`} size="lg" className="w-full">
                    ক্লাসে যান <ArrowRight size={16} />
                  </ButtonLink>
                ) : isFree ? (
                  <BuyPanel courseId={course.id} slug={course.slug} isFree label="ফ্রি এনরোল করুন" loggedIn={Boolean(ctx)} />
                ) : (
                  <BuyPanel courseId={course.id} slug={course.slug} isFree={false} label="কোর্স কিনুন" loggedIn={Boolean(ctx)} />
                )}
              </div>
              <ul className="mt-4 space-y-2 text-[13px] text-muted">
                <li className="flex items-center gap-2">
                  <MonitorPlay size={14} className="text-teal" /> HD ভিডিও, সেভড প্রগ্রেস
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal" /> সার্ভার-ভেরিফায়েড এনরোলমেন্ট
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen size={14} className="text-teal" /> নোট ও পরীক্ষা অন্তর্ভুক্ত
                </li>
                {course.hasCertificate && (
                  <li className="flex items-center gap-2">
                    <BadgeCheck size={14} className="text-teal" /> কোর্স শেষে সার্টিফিকেট
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Description + curriculum */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_340px] md:px-6">
        <div>
          {course.descriptionBn && (
            <section aria-labelledby="desc">
              <h2 id="desc" className="display text-[22px] font-bold text-ink">
                কোর্স সম্পর্কে
              </h2>
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
                {course.descriptionBn.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12" aria-labelledby="curriculum">
            <h2 id="curriculum" className="display text-[22px] font-bold text-ink">
              সিলেবাস
            </h2>
            <p className="mt-1.5 text-[13.5px] text-muted">
              {bnDigits(course.modules.length)}টি মডিউল, {bnDigits(lessonCount)}টি পাঠ।{" "}
              <span className="text-gold">প্রিভিউ</span> চিহ্নিত পাঠগুলো এনরোলমেন্ট ছাড়াই দেখা যায়।
            </p>
            <div className="mt-5 space-y-4">
              {course.modules.map((mod, mi) => (
                <Card key={mod.id} className="overflow-hidden">
                  <div className="flex items-baseline gap-3 border-b border-line bg-paper px-5 py-3.5">
                    <span className="display tabnum text-[15px] font-bold text-gold">{bnDigits(mi + 1)}.</span>
                    <h3 className="flex-1 text-[15.5px] font-semibold text-ink">{mod.titleBn}</h3>
                    <span className="text-[12.5px] text-muted">{bnDigits(mod._count.lessons)} পাঠ</span>
                  </div>
                  <ol className="divide-y divide-line">
                    {mod.lessons.map((lesson, li) => (
                      <li key={lesson.id} className="flex items-center gap-3 px-5 py-2.5 text-[14px]">
                        <span className="tabnum w-9 shrink-0 text-[12.5px] text-muted">
                          {bnDigits(mi + 1)}.{bnDigits(li + 1)}
                        </span>
                        {lesson.type === "VIDEO" ? (
                          <Video size={15} className="shrink-0 text-teal" />
                        ) : lesson.type === "DOCUMENT" ? (
                          <FileText size={15} className="shrink-0 text-teal" />
                        ) : (
                          <BookOpen size={15} className="shrink-0 text-teal" />
                        )}
                        <span className="flex-1 text-ink">{lesson.titleBn}</span>
                        {lesson.isPreview && !enrolled && (
                          <Link
                            href={ctx ? `/learn/courses/${course.slug}/lesson/${lesson.id}` : "/login"}
                            className="inline-flex items-center gap-1 rounded-xs bg-gold-wash px-2 py-0.5 text-[12px] font-semibold text-gold"
                          >
                            <MonitorPlay size={12} /> প্রিভিউ
                          </Link>
                        )}
                        {!lesson.isPreview && !enrolled && <Lock size={13} className="text-muted" />}
                        <span className="tabnum w-14 text-right text-[12.5px] text-muted">
                          {lesson.durationSeconds > 0
                            ? `${bnDigits(Math.round(lesson.durationSeconds / 60))} মি`
                            : lesson.type === "DOCUMENT"
                              ? "PDF"
                              : "নোট"}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function BuyPanel({
  slug,
  isFree,
  label,
  loggedIn,
}: {
  courseId: string;
  slug: string;
  isFree: boolean;
  label: string;
  loggedIn: boolean;
}) {
  const href = loggedIn ? `/courses/${slug}/checkout?free=${isFree}` : "/login";
  return (
    <ButtonLink href={href} size="lg" variant={isFree ? "secondary" : "primary"} className="w-full">
      {label} <ArrowRight size={16} />
    </ButtonLink>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Video, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";
import { SecureVideoPlayer } from "@/components/learn/SecureVideoPlayer";
import { SecurePdfViewer } from "@/components/learn/SecurePdfViewer";
import { Badge, Button, Card } from "@/components/ui";
import { bnDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const ctx = (await getAuthContext())!;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true, titleBn: true,
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: { lessons: { where: { isPublished: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const access = await assertCourseAccess(ctx.user.id, course.id);
  if (!access.allowed) redirect(`/learn/courses/${slug}`);

  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.titleBn })));
  const index = flat.findIndex((l) => l.id === lessonId);
  if (index === -1) notFound();
  const lesson = flat[index];
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: ctx.user.id, lessonId } },
  });
  const completed = Boolean(progress?.completedAt);

  async function markComplete() {
    "use server";
    const ctx = (await getAuthContext())!;
    const p = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { moduleId: true, module: { select: { courseId: true } } },
    });
    if (!p) return;
    const a = await assertCourseAccess(ctx.user.id, p.module.courseId);
    if (!a.allowed) return;
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: ctx.user.id, lessonId } },
      create: { userId: ctx.user.id, lessonId, enrollmentId: a.enrollmentId!, completedAt: new Date() },
      update: { completedAt: new Date() },
    });
    redirect(`/learn/courses/${slug}/lesson/${next?.id ?? ""}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/learn/courses/${slug}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-teal">
            <ArrowLeft size={14} /> {course.titleBn}
          </Link>
          <h1 className="display mt-2 text-[22px] font-bold text-ink">
            পাঠ {bnDigits(index + 1)}: {lesson.titleBn}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted">{lesson.moduleTitle}</p>
        </div>
        {completed && (
          <Badge tone="success">
            <CheckCircle2 size={13} /> সম্পন্ন
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden">
        {lesson.type === "VIDEO" && lesson.videoAssetId && (
          <div className="p-4 md:p-5">
            <SecureVideoPlayer lessonId={lesson.id} />
            <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
              <Video size={13} className="mt-0.5 shrink-0 text-teal" />
              ভিডিওতে আপনার নাম ও সেশন শনাক্তকারী ওয়াটারমার্ক হিসেবে দেখা যায়। রেকর্ড/শেয়ার নিষিদ্ধ —
              শনাক্ত হলে এনরোলমেন্ট বাতিল হতে পারে। (সম্পূর্ণ রেকর্ড-প্রতিরোধ কোনো ব্রাউজার নিশ্চিত করতে
              পারে না — তাই ব্যক্তিগত ব্যবহারের অঙ্গীকারই মূল ভিত্তি।)
            </p>
          </div>
        )}
        {lesson.type === "DOCUMENT" && lesson.documentAssetId && (
          <div className="p-4 md:p-5">
            <SecurePdfViewer lessonId={lesson.id} />
          </div>
        )}
        {lesson.type === "TEXT" && (
          <div className="p-5">
            <div className="prose-bn space-y-3 text-[15px] leading-relaxed text-body">
              {(lesson.contentBn ?? "").split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}
        {lesson.contentBn && lesson.type !== "TEXT" && (
          <div className="border-t border-line bg-paper p-5">
            <h2 className="display mb-3 flex items-center gap-2 text-[16px] font-bold text-ink">
              <BookOpen size={16} className="text-teal" /> পাঠের সারসংক্ষেপ
            </h2>
            <div className="space-y-3 text-[14.5px] leading-relaxed text-muted">
              {lesson.contentBn.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link
            href={`/learn/courses/${slug}/lesson/${prev.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-4 py-2 text-[13.5px] text-ink hover:border-teal hover:text-teal"
          >
            <ArrowLeft size={14} /> পূর্ববর্তী: {prev.titleBn}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {!completed && lesson.type !== "DOCUMENT" && (
            <form action={markComplete}>
              <Button type="submit" variant="secondary">
                <CheckCircle2 size={15} /> সম্পন্ন হিসেবে চিহ্নিত করুন
              </Button>
            </form>
          )}
          {next ? (
            <Link
              href={`/learn/courses/${slug}/lesson/${next.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-teal-deep"
            >
              পরবর্তী: {next.titleBn} <ArrowRight size={14} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[13.5px] text-muted">
              <FileText size={14} /> এটিই শেষ পাঠ — অভিনন্দন!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

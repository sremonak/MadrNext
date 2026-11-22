import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

import { hasPermission } from "@/lib/auth/rbac";
import { ButtonLink, Card } from "@/components/ui";
import { bnDigits } from "@/lib/format";
import { CourseSettingsPanel, CurriculumBuilder } from "./course-manage";
import { requirePagePermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePagePermission(ctx, "courses.view");
  if (!hasPermission(ctx, "courses.manage")) {
    return <Card className="p-6 text-[14px] text-muted">কোর্স সম্পাদনার অনুমতি নেই।</Card>;
  }
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      instructor: { select: { nameBn: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-[24px] font-bold text-ink">{course.titleBn}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {course.instructor?.nameBn ?? "শিক্ষক নির্বাচিত নয়"} · {bnDigits(course._count.enrollments)} এনরোলমেন্ট
          </p>
        </div>
        <ButtonLink href={`/courses/${course.slug}`} variant="secondary" size="sm">
          পাবলিক পেজ দেখুন ↗
        </ButtonLink>
      </div>

      <CourseSettingsPanel
        courseId={course.id}
        status={course.status}
        pricePaisa={course.pricePaisa}
        discountPaisa={course.discountPaisa}
        isFeatured={course.isFeatured}
        enrollmentLimit={course.enrollmentLimit}
      />

      <h2 className="display mt-8 text-[19px] font-bold text-ink">সিলেবাস ({bnDigits(course.modules.length)} মডিউল)</h2>
      <CurriculumBuilder courseId={course.id} modules={course.modules.map((m) => ({
        id: m.id,
        titleBn: m.titleBn,
        lessons: m.lessons.map((l) => ({ id: l.id, titleBn: l.titleBn, type: l.type, isPreview: l.isPreview })),
      }))} />
    </div>
  );
}

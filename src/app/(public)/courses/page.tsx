import Link from "next/link";
import { prisma } from "@/lib/db";
import { CourseCard, type CourseCardData } from "@/components/course/CourseCard";
import { EmptyState, Pagination, SectionTitle } from "@/components/ui";
import { bnDigits } from "@/lib/format";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "সব কোর্স" };

const PAGE_SIZE = 9;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; level?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const level = sp.level === "DAKHIL" || sp.level === "ALIM" ? (sp.level as "DAKHIL" | "ALIM") : undefined;

  const where = {
    status: "PUBLISHED" as const,
    ...(level ? { level } : {}),
    ...(sp.category
      ? { category: { is: { slug: sp.category } } }
      : {}),
  };

  const [courses, total, categories, ctx] = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        instructor: { select: { nameBn: true } },
        modules: { where: { isPublished: true }, select: { _count: { select: { lessons: { where: { isPublished: true } } } } } },
      },
    }),
    prisma.course.count({ where }),
    prisma.courseCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    getAuthContext(),
  ]);

  const enrolledIds = ctx
    ? (
        await prisma.enrollment.findMany({
          where: { userId: ctx.user.id, status: "ACTIVE" },
          select: { courseId: true },
        })
      ).map((e) => e.courseId)
    : [];

  const cards: CourseCardData[] = courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    titleBn: c.titleBn,
    subtitleBn: c.subtitleBn,
    level: c.level,
    pricePaisa: c.pricePaisa,
    discountPaisa: c.discountPaisa,
    discountEndsAt: c.discountEndsAt,
    durationMinutes: c.durationMinutes,
    thumbnailSeed: c.thumbnailSeed,
    instructorName: c.instructor?.nameBn,
    lessonCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0),
    isFree: c.pricePaisa === 0,
    isEnrolled: enrolledIds.includes(c.id),
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const makeHref = (p: number) => {
    const q = new URLSearchParams();
    if (sp.category) q.set("category", sp.category);
    if (level) q.set("level", level);
    if (p > 1) q.set("page", String(p));
    return `/courses?${q.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <SectionTitle
        title="সব কোর্স"
        sub={`${bnDigits(total)}টি প্রকাশিত কোর্স — দাখিল ও আলিমের প্রতিটি বিষয়ে।`}
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <FilterChip href={`/courses${sp.category ? `?category=${sp.category}` : ""}`} active={!level}>
          সব লেভেল
        </FilterChip>
        <FilterChip
          href={`/courses?level=DAKHIL${sp.category ? `&category=${sp.category}` : ""}`}
          active={level === "DAKHIL"}
        >
          দাখিল
        </FilterChip>
        <FilterChip
          href={`/courses?level=ALIM${sp.category ? `&category=${sp.category}` : ""}`}
          active={level === "ALIM"}
        >
          আলিম
        </FilterChip>
        <span className="mx-2 hidden w-px bg-line sm:block" aria-hidden="true" />
        {categories.map((cat) => (
          <FilterChip
            key={cat.id}
            href={`/courses?category=${cat.slug}${level ? `&level=${level}` : ""}`}
            active={sp.category === cat.slug}
          >
            {cat.nameBn}
          </FilterChip>
        ))}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="এই ফিল্টারে কোনো কোর্স নেই"
          body="অন্য কোনো বিষয় বা লেভেল বেছে নিন — বা সব কোর্স দেখুন।"
          action={
            <Link href="/courses" className="text-[14px] font-semibold text-teal">
              সব কোর্স দেখুন →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
      <Pagination page={page} total={totalPages} makeHref={makeHref} />
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-teal px-4 py-1.5 text-[13px] font-semibold text-white"
          : "rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-muted transition-colors hover:border-teal hover:text-teal"
      }
    >
      {children}
    </Link>
  );
}

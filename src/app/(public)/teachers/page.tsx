import { prisma } from "@/lib/db";
import { EmptyState, SectionTitle } from "@/components/ui";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষকবৃন্দ" };

export default async function TeachersPage() {
  const teachers = await prisma.teacherProfile.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { courses: { where: { status: "PUBLISHED" } } } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <SectionTitle
        title="আমাদের শিক্ষকবৃন্দ"
        sub="মাদরাসা ও জেনারেল উভয় বিভাগে অভিজ্ঞ শিক্ষকমণ্ডলী।"
      />
      {teachers.length === 0 ? (
        <EmptyState title="শিক্ষক তালিকা শীঘৈ আসছে" body="আমরা ধাপে ধাপে নতুন শিক্ষকদের যুক্ত করছি।" />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t) => (
            <article key={t.id} className="rounded-lg border border-line bg-surface p-6">
              <div className="flex items-center gap-4">
                <div
                  className="display flex h-16 w-16 items-center justify-center rounded-full border-2 border-line text-[22px] font-bold text-white"
                  style={{ background: t.accentColor === "gold" ? "#b98a2f" : "#0c5b53" }}
                  aria-hidden="true"
                >
                  {initials(t.nameBn)}
                </div>
                <div>
                  <h2 className="display text-[18px] font-bold text-ink">{t.nameBn}</h2>
                  <p className="text-[13.5px] text-gold">{t.designationBn}</p>
                  {t.education && <p className="mt-0.5 text-[12.5px] text-muted">{t.education}</p>}
                </div>
              </div>
              {t.bioBn && <p className="mt-4 text-[14px] leading-relaxed text-muted">{t.bioBn}</p>}
              <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
                <b className="text-ink">{t._count.courses.toLocaleString("bn-IN")}টি</b> কোর্স পরিচালনা করছেন
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

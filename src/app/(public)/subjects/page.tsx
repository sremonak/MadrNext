import Link from "next/link";
import { prisma } from "@/lib/db";
import { SectionTitle } from "@/components/ui";
import { bnDigits } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "বিষয়সমূহ" };

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    where: { isActive: true },
    orderBy: [{ level: "asc" }, { order: "asc" }],
    include: { category: true, _count: { select: { courses: { where: { status: "PUBLISHED" } } } } },
  });

  const dakhil = subjects.filter((s) => s.level === "DAKHIL");
  const alim = subjects.filter((s) => s.level === "ALIM");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <SectionTitle
        title="বিষয় অনুযায়ী কোর্স"
        sub="প্রতিটি বিষয়ে চ্যাপ্টারভিত্তিক কোর্স, পরীক্ষা ও নোট পাবেন।"
      />
      {[
        { title: "দাখিল (৯ম–১০ম)", items: dakhil },
        { title: "আলিম (১১শ–১২শ)", items: alim },
      ].map((group) => (
        <section key={group.title} className="mb-12">
          <h2 className="display text-[20px] font-bold text-ink">{group.title}</h2>
          <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((s, i) => (
              <Link
                key={s.id}
                href={`/courses?category=${s.category?.slug ?? ""}`}
                className="flex items-baseline gap-3 bg-surface px-5 py-4 transition-colors hover:bg-paper"
              >
                <span className="display tabnum text-[14px] font-semibold text-gold">
                  {bnDigits(i + 1)}.
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-medium text-ink">{s.nameBn}</span>
                  <span className="text-[12.5px] text-muted">{s.nameEn}</span>
                </span>
                <span className="text-[12.5px] text-muted">{bnDigits(s._count.courses)} কোর্স</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

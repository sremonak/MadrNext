import { prisma } from "@/lib/db";
import { ChevronDown } from "lucide-react";
import { SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "সাধারণ জিজ্ঞা" };

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  const groups = Object.groupBy(faqs, (f) => f.category);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <SectionTitle title="সাধারণ জিজ্ঞা" sub="প্রায়ই জিজ্ঞাসিত প্রশ্ন ও উত্তর। আরও কিছু জানার থাকলে যোগাযোগ করুন।" />
      {Object.entries(groups).map(([cat, items]) => (
        <section key={cat} className="mb-10">
          <h2 className="text-[13px] font-semibold text-gold">
            {cat === "general" ? "সাধারণ" : cat === "payment" ? "পেমেন্ট ও এনরোলমেন্ট" : cat === "security" ? "নিরাপত্তা" : cat}
          </h2>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {(items ?? []).map((f) => (
              <details key={f.id} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.questionBn}
                  <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-[14.5px] leading-relaxed text-muted">{f.answerBn}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

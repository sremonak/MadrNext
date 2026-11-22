import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { bnDigits, relativeTimeBn } from "@/lib/format";
import { ContentForms } from "./content-forms";
import { requirePagePermission } from "@/lib/auth/rbac";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "কনটেন্ট ব্যবস্থাপনা" };

export default async function AdminContentPage() {
  const ctx = (await getAuthContext())!;
  requirePagePermission(ctx, "content.view");
  const [faqs, testimonials, announcements, courses] = await Promise.all([
    prisma.faq.findMany({ orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
    prisma.announcement.findMany({ orderBy: { publishedAt: "desc" }, take: 10, include: { course: { select: { titleBn: true } } } }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { id: true, titleBn: true } }),
  ]);

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">কনটেন্ট ব্যবস্থাপনা</h1>
      <p className="mt-1.5 text-[14px] text-muted">FAQ, টেস্টিমোনিয়াল, ঘোষণা ও হোমপেজ কনটেন্ট।</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper px-5 py-3">
            <h2 className="display text-[15px] font-bold text-ink">FAQ ({bnDigits(faqs.length)})</h2>
          </div>
          <ul className="divide-y divide-line">
            {faqs.map((f) => (
              <li key={f.id} className="flex items-start gap-3 px-5 py-3 text-[13.5px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{f.questionBn}</p>
                  <p className="line-clamp-1 text-[12.5px] text-muted">{f.answerBn}</p>
                </div>
                {f.isActive ? <Badge tone="success">সক্রিয়</Badge> : <Badge tone="neutral">নিষ্ক্রিয়</Badge>}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper px-5 py-3">
            <h2 className="display text-[15px] font-bold text-ink">টেস্টিমোনিয়াল ({bnDigits(testimonials.length)})</h2>
          </div>
          <ul className="divide-y divide-line">
            {testimonials.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-5 py-3 text-[13.5px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{t.nameBn} — {t.roleBn}</p>
                  <p className="line-clamp-1 text-[12.5px] text-muted">{t.quoteBn}</p>
                </div>
                {t.isActive ? <Badge tone="success">সক্রিয়</Badge> : <Badge tone="neutral">নিষ্ক্রিয়</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line bg-paper px-5 py-3">
          <h2 className="display text-[15px] font-bold text-ink">ঘোষণা ({bnDigits(announcements.length)})</h2>
        </div>
        <ul className="divide-y divide-line">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-[13.5px]">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{a.titleBn}</p>
                <p className="line-clamp-1 text-[12.5px] text-muted">{a.bodyBn}</p>
              </div>
              <span className="text-[12px] text-muted">
                {a.course ? a.course.titleBn : "সার্বজনীন"} · {relativeTimeBn(a.publishedAt)}
              </span>
            </li>
          ))}
          {announcements.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">কোনো ঘোষণা নেই।</li>}
        </ul>
      </Card>

      <ContentForms courses={courses} />
    </div>
  );
}

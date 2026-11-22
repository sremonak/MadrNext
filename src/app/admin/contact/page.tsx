import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { bnDigits, formatDateTimeBn } from "@/lib/format";
import { ContactRowActions } from "./contact-actions";
import { requirePagePermission } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "যোগাযোগ বার্তা" };

export default async function AdminContactPage() {
  const ctx = await requireAuth();
  requirePagePermission(ctx, "contact.view");
  const messages = await prisma.contactMessage.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 50 });

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">যোগাযোগ বার্তা</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        {bnDigits(messages.filter((m) => m.status === "NEW").length)}টি নতুন বার্তা।
      </p>
      <div className="mt-6 space-y-4">
        {messages.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              {m.status === "NEW" ? <Badge tone="info">নতুন</Badge> : m.status === "READ" ? <Badge tone="neutral">পঠিত</Badge> : <Badge tone="success">উত্তর দেওয়া হয়েছে</Badge>}
              <span className="text-[13px] font-semibold text-ink">{m.name}</span>
              <span className="text-[12.5px] text-muted">({m.email} {m.phone && `· ${m.phone}`})</span>
              <span className="ml-auto text-[12px] text-muted">{formatDateTimeBn(m.createdAt)}</span>
            </div>
            <p className="mt-2.5 text-[14.5px] font-semibold text-ink">{m.subject}</p>
            <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-muted">{m.message}</p>
            <div className="mt-3">
              <ContactRowActions id={m.id} status={m.status} />
            </div>
          </Card>
        ))}
        {messages.length === 0 && <p className="text-[14px] text-muted">কোনো বার্তা নেই।</p>}
      </div>
    </div>
  );
}

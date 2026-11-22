import { prisma } from "@/lib/db";
import { Badge, Card, Pagination } from "@/components/ui";
import { bnDigits, formatDateTimeBn, formatTaka } from "@/lib/format";
import { PaymentRowActions } from "./payment-actions";
import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { requirePagePermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "পেমেন্ট ব্যবস্থাপনা" };

const PAGE_SIZE = 15;

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ctx = (await getAuthContext())!;
  requirePagePermission(ctx, "payments.view");
  const canApprove = hasPermission(ctx, "payments.approve");
  const canRefund = hasPermission(ctx, "payments.refund");

  const where = sp.status
    ? { status: sp.status as "INITIATED" | "PENDING_REVIEW" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" }
    : {};

  const [payments, total, pendingCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        course: { select: { titleBn: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  const statuses = [
    { key: "", label: "সব" },
    { key: "PENDING_REVIEW", label: "যাচাইয়ের অপেক্ষায়" },
    { key: "PAID", label: "পরিশোধিত" },
    { key: "FAILED", label: "ব্যর্থ" },
    { key: "REFUNDED", label: "রিফান্ড" },
  ];

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">পেমেন্ট ব্যবস্থাপনা</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        {pendingCount > 0 && (
          <Badge tone="warn" className="mr-2">
            {bnDigits(pendingCount)}টি ম্যানুয়াল পেমেন্ট যাচাইয়ের অপেক্ষায়
          </Badge>
        )}
        ম্যানুয়াল পেমেন্ট যাচাই, রিফান্ড ও রিপোর্ট।
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <a
            key={s.key}
            href={`/admin/payments${s.key ? `?status=${s.key}` : ""}`}
            className={
              (sp.status ?? "") === s.key
                ? "rounded-full bg-teal px-4 py-1.5 text-[13px] font-semibold text-white"
                : "rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-muted"
            }
          >
            {s.label}
          </a>
        ))}
        <a
          href="/api/admin/payments/export"
          className="rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-teal hover:border-teal"
        >
          CSV এক্সপোর্ট ↓
        </a>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-3 font-medium">ইনভয়েস</th>
                <th className="px-4 py-3 font-medium">শিক্ষার্থী</th>
                <th className="px-4 py-3 font-medium">কোর্স</th>
                <th className="px-4 py-3 font-medium">পরিমাণ</th>
                <th className="px-4 py-3 font-medium">মাধ্যম</th>
                <th className="px-4 py-3 font-medium">স্ট্যাটাস</th>
                <th className="px-4 py-3 font-medium">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-paper">
                  <td className="tabnum px-4 py-3">
                    <span className="font-semibold text-ink">{p.invoiceNo}</span>
                    <p className="text-[11.5px] text-muted">{formatDateTimeBn(p.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{p.user.name}</p>
                    <p className="text-[11.5px] text-muted">{p.user.email ?? p.user.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">{p.course.titleBn}</td>
                  <td className="tabnum px-4 py-3 font-semibold text-ink">{formatTaka(p.amountPaisa)}</td>
                  <td className="px-4 py-3 text-muted">
                    {p.method === "MANUAL" ? "ম্যানুয়াল" : p.method}
                    {p.manualTxnId && (
                      <p className="tabnum text-[11.5px] text-muted">TrxID: {p.manualTxnId}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "PAID" && <Badge tone="success">পরিশোধিত</Badge>}
                    {p.status === "PENDING_REVIEW" && <Badge tone="warn">যাচাই চলছে</Badge>}
                    {p.status === "FAILED" && <Badge tone="danger">ব্যর্থ</Badge>}
                    {p.status === "REFUNDED" && <Badge tone="warn">রিফান্ড</Badge>}
                    {p.status === "INITIATED" && <Badge tone="info">চালু</Badge>}
                    {p.status === "CANCELLED" && <Badge tone="neutral">বাতিল</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {canApprove && p.status === "PENDING_REVIEW" && (
                      <PaymentRowActions paymentId={p.id} canRefund={false} />
                    )}
                    {canRefund && p.status === "PAID" && (
                      <PaymentRowActions paymentId={p.id} canRefund refundPaisa={p.amountPaisa} />
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    এই ফিল্টারে কোনো লেনদেন নেই।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination
        page={page}
        total={Math.ceil(total / PAGE_SIZE)}
        makeHref={(p) => `/admin/payments?page=${p}${sp.status ? `&status=${sp.status}` : ""}`}
      />
    </div>
  );
}

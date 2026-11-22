import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState } from "@/components/ui";
import { bnDigits, formatDateTimeBn, formatTaka } from "@/lib/format";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "পেমেন্ট ইতিহাস" };

export default async function BillingPage() {
  const ctx = await requireAuth();
  const payments = await prisma.payment.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    include: { course: { select: { titleBn: true, slug: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="display text-[26px] font-bold text-ink">পেমেন্ট ইতিহাস</h1>
      <p className="mt-1.5 text-[14px] text-muted">আপনার সব লেনদেন ও এনরোলমেন্ট স্ট্যাটাস।</p>
      {payments.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="কোনো পেমেন্ট নেই" body="কোর্স কিনলে এখানে ইনভয়েস ও স্ট্যাটাস দেখতে পাবেন।" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                  <span className="tabnum font-semibold text-ink">{p.invoiceNo}</span>
                  <span>·</span>
                  <span>{formatDateTimeBn(p.createdAt)}</span>
                  <span>·</span>
                  <span>
                    {p.method === "MANUAL" ? "ম্যানুয়াল (বিকাশ/নগদ)" : p.method === "BKASH" ? "বিকাশ" : p.method === "NAGAD" ? "নগদ" : p.method === "SSLCOMMERZ" ? "SSLCommerz" : "ফ্রি"}
                  </span>
                </div>
                <p className="display mt-1.5 text-[15.5px] font-bold text-ink">{p.course.titleBn}</p>
                {p.manualTxnId && <p className="mt-0.5 text-[12.5px] text-muted">TrxID: <span className="tabnum">{p.manualTxnId}</span></p>}
              </div>
              <div className="text-right">
                <p className="display tabnum text-[17px] font-bold text-ink">{formatTaka(p.amountPaisa)}</p>
                <div className="mt-1">
                  {p.status === "PAID" && <Badge tone="success">পরিশোধিত</Badge>}
                  {p.status === "PENDING_REVIEW" && <Badge tone="warn">যাচাই চলছে</Badge>}
                  {p.status === "INITIATED" && <Badge tone="info">চালু আছে</Badge>}
                  {p.status === "FAILED" && <Badge tone="danger">ব্যর্থ</Badge>}
                  {p.status === "CANCELLED" && <Badge tone="neutral">বাতিল</Badge>}
                  {p.status === "REFUNDED" && <Badge tone="warn">রিফান্ড</Badge>}
                </div>
              </div>
              {p.status === "PAID" && (
                <Link href={`/learn/courses/${p.course.slug}`} className="text-[13.5px] font-semibold text-teal">
                  কোর্সে যান →
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 text-[12.5px] text-muted">
        মোট {bnDigits(payments.length)}টি লেনদেন · সামগ্রিক স্ট্যাটাস সার্ভারে যাচাইকৃত।
      </p>
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

import { hasPermission } from "@/lib/auth/rbac";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { bnDigits, formatDateTimeBn, formatTaka, relativeTimeBn } from "@/lib/format";
import { StudentActions } from "./student-actions";
import { requirePagePermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireAuth();
  requirePagePermission(ctx, "students.view");
  const canManage = hasPermission(ctx, "students.manage");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      studentProfile: true,
      enrollments: { include: { course: { select: { titleBn: true, slug: true, pricePaisa: true } } }, orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, include: { course: { select: { titleBn: true } } } },
      sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, include: { device: true } },
      loginHistory: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!user || user.role !== "STUDENT") notFound();

  const failedLogins = user.loginHistory.filter((l) => !l.success).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-[24px] font-bold text-ink">{user.name}</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {user.email ?? "—"} {user.phone && ` · ${user.phone}`} · শনাক্তকারী{" "}
            <span className="tabnum">{user.studentProfile?.studentId.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.status === "ACTIVE" ? <Badge tone="success">সক্রিয়</Badge> : user.status === "SUSPENDED" ? <Badge tone="danger">স্থগিত</Badge> : <Badge tone="warn">অযাচাইকৃত</Badge>}
          {canManage && <StudentActions userId={user.id} status={user.status} enrollments={user.enrollments.map((e) => ({ courseId: e.courseId, courseTitle: e.course.titleBn, status: e.status }))} />}
        </div>
      </div>

      {user.status === "SUSPENDED" && user.suspensionReason && (
        <Card className="mt-4 border-danger/40 bg-danger-wash p-4 text-[13.5px]">
          <b className="text-danger">স্থগিত করার কারণ:</b> {user.suspensionReason} ({relativeTimeBn(user.suspendedAt!)})
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper px-5 py-3">
            <h2 className="display text-[15px] font-bold text-ink">এনরোলমেন্ট ({bnDigits(user.enrollments.length)})</h2>
          </div>
          <ul className="divide-y divide-line">
            {user.enrollments.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{e.course.titleBn}</p>
                  <p className="text-[12px] text-muted">
                    {e.source === "PAYMENT" ? "পেমেন্ট" : e.source === "MANUAL_GRANT" ? "ম্যানুয়াল প্রদান" : "ফ্রি"} · {formatDateTimeBn(e.createdAt)}
                  </p>
                </div>
                {e.status === "ACTIVE" && <Badge tone="success">সক্রিয়</Badge>}
                {e.status === "PENDING" && <Badge tone="warn">যাচাই চলছে</Badge>}
                {e.status === "REVOKED" && <Badge tone="danger">বাতিল</Badge>}
                {e.status === "EXPIRED" && <Badge tone="neutral">মেয়াদ শেষ</Badge>}
                {e.status === "SUSPENDED" && <Badge tone="warn">স্থগিত</Badge>}
              </li>
            ))}
            {user.enrollments.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">কোনো এনরোলমেন্ট নেই।</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper px-5 py-3">
            <h2 className="display text-[15px] font-bold text-ink">পেমেন্ট ইতিহাস ({bnDigits(user.payments.length)})</h2>
          </div>
          <ul className="divide-y divide-line">
            {user.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{p.course.titleBn}</p>
                  <p className="tabnum text-[12px] text-muted">{p.invoiceNo} · {formatDateTimeBn(p.createdAt)}</p>
                </div>
                <span className="tabnum font-semibold text-ink">{formatTaka(p.amountPaisa)}</span>
                {p.status === "PAID" && <Badge tone="success">PAID</Badge>}
                {p.status === "PENDING_REVIEW" && <Badge tone="warn">PENDING</Badge>}
                {p.status === "FAILED" && <Badge tone="danger">FAILED</Badge>}
                {p.status === "REFUNDED" && <Badge tone="warn">REFUNDED</Badge>}
                {p.status === "INITIATED" && <Badge tone="info">INITIATED</Badge>}
                {p.status === "CANCELLED" && <Badge tone="neutral">CANCELLED</Badge>}
              </li>
            ))}
            {user.payments.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">কোনো পেমেন্ট নেই।</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper px-5 py-3">
            <h2 className="display text-[15px] font-bold text-ink">
              সক্রিয় ডিভাইস ({bnDigits(user.sessions.length)}) {failedLogins > 0 && <Badge tone="danger">{bnDigits(failedLogins)} ব্যর্থ চেষ্টা</Badge>}
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {user.sessions.map((s) => (
              <li key={s.id} className="px-5 py-3 text-[13.5px]">
                <p className="font-medium text-ink">{s.device?.label ?? "অজানা ডিভাইস"}</p>
                <p className="tabnum text-[12px] text-muted">
                  আইপি {s.ip ?? "—"} · শুরু {relativeTimeBn(s.createdAt)} · সক্রিয় {relativeTimeBn(s.lastActiveAt)}
                </p>
              </li>
            ))}
            {user.sessions.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">কোনো সক্রিয় সেশন নেই।</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper px-5 py-3">
            <h2 className="display text-[15px] font-bold text-ink">লগইন ইতিহাস</h2>
          </div>
          <ul className="divide-y divide-line">
            {user.loginHistory.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                {l.success ? <Badge tone="success">সফল</Badge> : <Badge tone="danger">{l.reason}</Badge>}
                <span className="tabnum text-muted">{l.ip ?? "—"}</span>
                <span className="ml-auto text-[12px] text-muted">{relativeTimeBn(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <ButtonLink href="/admin/students" variant="secondary" size="sm">← তালিকায় ফিরুন</ButtonLink>
      </div>
    </div>
  );
}

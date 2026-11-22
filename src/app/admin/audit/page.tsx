import { prisma } from "@/lib/db";
import { Badge, Card, Pagination } from "@/components/ui";
import { bnDigits, formatDateTimeBn } from "@/lib/format";
import { verifyAuditChain } from "@/lib/audit";
import { requirePagePermission } from "@/lib/auth/rbac";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "অডিট লগ" };

const PAGE_SIZE = 25;

const ACTION_LABEL: Record<string, string> = {
  STUDENT_SUSPENDED: "শিক্ষার্থী স্থগিত",
  STUDENT_REACTIVATED: "শিক্ষার্থী পুনঃসক্রিয়",
  COURSE_ACCESS_GRANTED: "কোর্স অ্যাক্সেস প্রদান",
  COURSE_ACCESS_REVOKED: "কোর্স অ্যাক্সেস বাতিল",
  PAYMENT_APPROVED: "পেমেন্ট অনুমোদন",
  PAYMENT_REJECTED: "পেমেন্ট বাতিল",
  PAYMENT_REFUNDED: "পেমেন্ট রিফান্ড",
  SESSION_REVOKED: "সেশন বাতিল",
  FORCE_LOGOUT: "ফোর্স লগআউট",
  COURSE_CREATED: "কোর্স তৈরি",
  COURSE_UPDATED: "কোর্স হালনাগাদ",
  COURSE_PUBLISHED: "কোর্স প্রকাশ",
  MODULE_ADDED: "মডিউল যোগ",
  LESSON_ADDED: "পাঠ যোগ",
  ADMIN_CREATED: "অ্যাডমিন তৈরি",
  ADMIN_ROLE_CHANGED: "রোল পরিবর্তন",
  SETTINGS_UPDATED: "সেটিংস পরিবর্তন",
  CONTENT_DELETED: "কনটেন্ট মুছে ফেলা",
  MANUAL_PAYMENT_SUBMITTED: "ম্যানুয়াল পেমেন্ট জমা",
  PASSWORD_RESET_REQUESTED: "পাসওয়ার্ড রিসেটের অনুরোধ",
  PASSWORD_RESET_COMPLETED: "পাসওয়ার্ড রিসেট সম্পন্ন",
  FREE_ENROLLMENT: "ফ্রি এনরোলমেন্ট",
  DEVICE_LOGGED_OUT: "ডিভাইস লগআউট",
  LOGOUT_ALL_DEVICES: "সব ডিভাইস লগআউট",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const ctx = (await getAuthContext())!;
  requirePagePermission(ctx, "audit.view");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = sp.action ? { action: sp.action } : {};
  const [logs, total, chain] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
    verifyAuditChain(),
  ]);

  const actions = await prisma.auditLog.groupBy({ by: ["action"], _count: { action: true } });

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">অডিট লগ</h1>
      <p className="mt-1.5 flex items-center gap-2 text-[14px] text-muted">
        সব গুরুত্বপূর্ণ কার্যক্রমের অভেদ্য রেকর্ড।
        {chain.ok ? (
          <Badge tone="success">হ্যাশ-চেইন অক্ষত ✓</Badge>
        ) : (
          <Badge tone="danger">হ্যাশ-চেইনে অসঙ্গতি শনাক্ত!</Badge>
        )}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="/admin/audit"
          className={(sp.action ?? "") === "" ? "rounded-full bg-teal px-4 py-1.5 text-[13px] font-semibold text-white" : "rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-muted"}
        >
          সব
        </a>
        {actions
          .sort((a, b) => b._count.action - a._count.action)
          .slice(0, 9)
          .map((a) => (
            <a
              key={a.action}
              href={`/admin/audit?action=${a.action}`}
              className={
                sp.action === a.action
                  ? "rounded-full bg-teal px-4 py-1.5 text-[13px] font-semibold text-white"
                  : "rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-muted"
              }
            >
              {ACTION_LABEL[a.action] ?? a.action} ({bnDigits(a._count.action)})
            </a>
          ))}
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-3 font-medium">সময়</th>
                <th className="px-4 py-3 font-medium">অভিনেতা</th>
                <th className="px-4 py-3 font-medium">কার্যক্রম</th>
                <th className="px-4 py-3 font-medium">এন্টিটি</th>
                <th className="px-4 py-3 font-medium">হ্যাশ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-paper">
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTimeBn(l.createdAt)}</td>
                  <td className="px-4 py-2.5 text-ink">{l.actor?.name ?? "সিস্টেম"}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-ink">{ACTION_LABEL[l.action] ?? l.action}</span>
                    {l.metadata !== null && (
                      <p className="max-w-[240px] truncate text-[11.5px] text-muted">
                        {JSON.stringify(l.metadata)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">
                    {l.entityType ? `${l.entityType} · ${l.entityId?.slice(0, 10)}` : "—"}
                  </td>
                  <td className="tabnum px-4 py-2.5 text-[11px] text-muted">{l.hash?.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination
        page={page}
        total={Math.ceil(total / PAGE_SIZE)}
        makeHref={(p) => `/admin/audit?page=${p}${sp.action ? `&action=${sp.action}` : ""}`}
      />
    </div>
  );
}

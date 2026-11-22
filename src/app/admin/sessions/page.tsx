import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { bnDigits, relativeTimeBn } from "@/lib/format";
import { SessionRowActions } from "./session-actions";
import { requirePagePermission } from "@/lib/auth/rbac";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "সেশন ও ডিভাইস" };

const PAGE_SIZE = 20;

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const ctx = (await getAuthContext())!;
  requirePagePermission(ctx, "sessions.view");
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {
    revokedAt: null,
    expiresAt: { gt: new Date() },
    ...(sp.q ? { user: { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }] } } : {}),
  };

  const [sessions, total, activeUsers, playbackSessions] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { lastActiveAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true, status: true } }, device: true },
    }),
    prisma.session.count({ where }),
    prisma.session.groupBy({ by: ["userId"], where }),
    prisma.playbackSession.findMany({
      where: { revokedAt: null, endedAt: null, lastHeartbeatAt: { gt: new Date(/* eslint-disable-line react-hooks/purity */ Date.now() - 120_000) } },
      include: { user: { select: { name: true } } },
      orderBy: { lastHeartbeatAt: "desc" },
      take: 10,
    }),
  ]);

  const suspicious = await prisma.loginHistory.findMany({
    where: { success: false, createdAt: { gt: new Date(/* eslint-disable-line react-hooks/purity */ Date.now() - 24 * 3600_000) }, reason: "BAD_PASSWORD" },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">সেশন ও ডিভাইস</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        {bnDigits(total)}টি সক্রিয় সেশন ({bnDigits(activeUsers.length)} ব্যবহারকারী) — যেকোনো সেশন বাতিল বা ফোর্স লগআউট।
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line bg-paper px-5 py-3">
          <h2 className="display text-[15px] font-bold text-ink">সক্রিয় প্লেব্যাক সেশন</h2>
        </div>
        <ul className="divide-y divide-line">
          {playbackSessions.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden="true" />
              <span className="font-medium text-ink">{p.user.name}</span>
              <span className="text-[12px] text-muted">পাঠ {p.lessonId.slice(0, 8)} · সক্রিয় {relativeTimeBn(p.lastHeartbeatAt)}</span>
            </li>
          ))}
          {playbackSessions.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">এখন কোনো ভিডিও প্লেব্যাক চলছে না।</li>}
        </ul>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-3 font-medium">ব্যবহারকারী</th>
                <th className="px-4 py-3 font-medium">ডিভাইস</th>
                <th className="px-4 py-3 font-medium">আইপি</th>
                <th className="px-4 py-3 font-medium">শুরু</th>
                <th className="px-4 py-3 font-medium">সর্বশেষ সক্রিয়</th>
                <th className="px-4 py-3 font-medium">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{s.user.name}</p>
                    <p className="text-[11.5px] text-muted">{s.user.email ?? "—"}</p>
                    {s.user.status === "SUSPENDED" && <Badge tone="danger">স্থগিত</Badge>}
                  </td>
                  <td className="px-4 py-3 text-ink">{s.device?.label ?? "অজানা"}</td>
                  <td className="tabnum px-4 py-3 text-muted">{s.ip ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{relativeTimeBn(s.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{relativeTimeBn(s.lastActiveAt)}</td>
                  <td className="px-4 py-3">
                    <SessionRowActions sessionId={s.id} userId={s.user.id} />
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">কোনো সক্রিয় সেশন নেই।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line bg-paper px-5 py-3">
          <h2 className="display text-[15px] font-bold text-ink">সন্দেহজনক কার্যক্রম (২৪ ঘণ্টায় ব্যর্থ লগইন)</h2>
        </div>
        <ul className="divide-y divide-line">
          {suspicious.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
              <Badge tone="danger">ব্যর্থ</Badge>
              <span className="tabnum text-ink">{l.email ?? l.userId?.slice(0, 8) ?? "অজানা"}</span>
              <span className="tabnum text-muted">{l.ip ?? "—"}</span>
              <span className="ml-auto text-[12px] text-muted">{relativeTimeBn(l.createdAt)}</span>
            </li>
          ))}
          {suspicious.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">সন্দেহজনক কিছু নেই।</li>}
        </ul>
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, Card } from "@/components/ui";
import { formatDateTimeBn } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "লগইন ইতিহাস" };

const REASON_BN: Record<string, string> = {
  OK: "সফল লগইন",
  BAD_PASSWORD: "ভুল পাসওয়ার্ড",
  NO_USER: "অ্যাকাউন্ট নেই",
  ACCOUNT_SUSPENDED: "অ্যাকাউন্ট স্থগিত",
  RATE_LIMITED: "অনেকবার চেষ্টা — সাময়িক ব্লক",
};

export default async function LoginHistoryPage() {
  const ctx = (await getAuthContext())!;
  const history = await prisma.loginHistory.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="display text-[26px] font-bold text-ink">লগইন ইতিহাস</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        শেষ ৫০টি লগইন চেষ্টা — অপরিচিত ডিভাইস বা লোকেশন দেখলে সাথে সাথে পাসওয়ার্ড বদলান।
      </p>

      {history.length === 0 ? (
        <Card className="mt-6 p-6 text-center text-[14px] text-muted">
          এখনো কোনো লগইন রেকর্ড নেই।
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">সময়</th>
                <th className="px-4 py-3 font-semibold">ফলাফল</th>
                <th className="px-4 py-3 font-semibold">ডিভাইস</th>
                <th className="px-4 py-3 font-semibold">আইপি</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-paper">
                  <td className="px-4 py-3 text-ink">{formatDateTimeBn(h.createdAt)}</td>
                  <td className="px-4 py-3">
                    {h.success ? (
                      <Badge tone="success">{REASON_BN[h.reason] ?? "সফল"}</Badge>
                    ) : (
                      <Badge tone="danger">{REASON_BN[h.reason] ?? h.reason}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{h.userAgent?.slice(0, 60) ?? "—"}</td>
                  <td className="tabnum px-4 py-3 text-muted">{h.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

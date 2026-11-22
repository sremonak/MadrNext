import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, Card } from "@/components/ui";
import { formatDateTimeBn, relativeTimeBn } from "@/lib/format";
import { DeviceList } from "./device-list";
import { logoutAllAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "ডিভাইস ও সেশন" };

export default async function DevicesPage() {
  const ctx = (await getAuthContext())!;
  const [sessions, history] = await Promise.all([
    prisma.session.findMany({
      where: { userId: ctx.user.id },
      orderBy: { lastActiveAt: "desc" },
      take: 20,
      include: { device: true },
    }),
    prisma.loginHistory.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const active = sessions.filter((s) => !s.revokedAt && s.expiresAt > new Date());
  const past = sessions.filter((s) => s.revokedAt || s.expiresAt <= new Date());

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-[26px] font-bold text-ink">ডিভাইস ও সেশন</h1>
          <p className="mt-1.5 text-[14px] text-muted">
            আপনার অ্যাকাউন্টে কোথায় কোথায় লগইন আছে — যেকোনো ডিভাইস থেকে লগআউট করতে পারেন।
          </p>
        </div>
        {active.length > 1 && (
          <form action={logoutAllAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-md border border-danger px-4 text-[13.5px] font-semibold text-danger transition-colors hover:bg-danger-wash"
            >
              সব ডিভাইস থেকে লগআউট ({active.length.toLocaleString("bn-IN")})
            </button>
          </form>
        )}
      </div>

      <section className="mt-7">
        <h2 className="display mb-3 text-[18px] font-bold text-ink">
          সক্রিয় সেশন ({active.length.toLocaleString("bn-IN")})
        </h2>
        <DeviceList sessions={active.map((s) => ({
          id: s.id,
          label: s.device?.label ?? "অজানা ডিভাইস",
          deviceType: s.device?.deviceType ?? "OTHER",
          ip: s.ip,
          createdAt: s.createdAt.toISOString(),
          lastActiveAt: s.lastActiveAt.toISOString(),
          current: s.id === ctx.sessionId,
        }))} />
      </section>

      {past.length > 0 && (
        <section className="mt-8">
          <h2 className="display mb-3 text-[18px] font-bold text-ink">সমাপ্ত সেশন</h2>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-paper text-[12px] text-muted">
                  <th className="px-4 py-2.5 font-medium">ডিভাইস</th>
                  <th className="px-4 py-2.5 font-medium">আইপি</th>
                  <th className="px-4 py-2.5 font-medium">শেষ সক্রিয়</th>
                  <th className="px-4 py-2.5 font-medium">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {past.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-ink">{s.device?.label ?? "অজানা"}</td>
                    <td className="tabnum px-4 py-2.5 text-muted">{s.ip ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{relativeTimeBn(s.lastActiveAt)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone="neutral">
                        {s.revokedReason === "PASSWORD_RESET"
                          ? "পাসওয়ার্ড রিসেট"
                          : s.revokedReason === "DEVICE_LIMIT"
                            ? "ডিভাইস সীমা"
                            : s.revokedReason === "USER_LOGGED_OUT_DEVICE"
                              ? "ব্যবহারকারী লগআউট"
                              : "সমাপ্ত"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="display text-[18px] font-bold text-ink">লগইন ইতিহাস</h2>
          <Link href="/learn/settings/login-history" className="text-[13px] font-medium text-teal hover:text-teal-deep">
            বিস্তারিত দেখুন →
          </Link>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-2.5 font-medium">সময়</th>
                <th className="px-4 py-2.5 font-medium">ফলাফল</th>
                <th className="px-4 py-2.5 font-medium">আইপি</th>
                <th className="px-4 py-2.5 font-medium">ব্রাউজার</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2.5 text-ink">{formatDateTimeBn(h.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {h.success ? (
                      <Badge tone="success">সফল</Badge>
                    ) : (
                      <Badge tone="danger">
                        {h.reason === "BAD_PASSWORD" ? "ভুল পাসওয়ার্ড" : h.reason === "SUSPENDED" ? "স্থগিত অ্যাকাউন্ট" : "ব্যর্থ"}
                      </Badge>
                    )}
                  </td>
                  <td className="tabnum px-4 py-2.5 text-muted">{h.ip ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted truncate max-w-[220px]">{h.userAgent ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

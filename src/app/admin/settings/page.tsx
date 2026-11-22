import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Card } from "@/components/ui";
import { SettingsForm } from "./settings-form";
import { env } from "@/lib/env";
import { requirePagePermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "সাইট সেটিংস" };

export default async function AdminSettingsPage() {
  const ctx = (await getAuthContext())!;
  requirePagePermission(ctx, "settings.view");
  const rows = await prisma.siteSettings.findMany();
  const values: Record<string, string> = {};
  for (const r of rows) values[r.key] = String((r.value as { v?: string })?.v ?? r.value ?? "");

  const isSuperAdmin = ctx.user.role === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-[26px] font-bold text-ink">সাইট সেটিংস</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        ব্র্যান্ডিং, সাপোর্ট তথ্য, পেমেন্ট নম্বর ও সুরক্ষা সীমা।
        {!isSuperAdmin && " (শুধু পঠনযোগ্য — পরিবর্তন শুধু Super Admin করতে পারেন)"}
      </p>

      <Card className="mt-6 p-6">
        <SettingsForm values={values} disabled={!isSuperAdmin} />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="display text-[16px] font-bold text-ink">সিকিউরিটি স্থিতি (শুধু পঠনযোগ্য)</h2>
        <dl className="mt-3 divide-y divide-line text-[13.5px]">
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">সেশন টিএল (ঘণ্টা)</dt>
            <dd className="tabnum text-ink">{env.sessionTtlHours.toLocaleString("bn-IN")}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">সর্বোচ্চ ডিভাইস সেশন</dt>
            <dd className="tabnum text-ink">{env.maxConcurrentSessions.toLocaleString("bn-IN")}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">সর্বোচ্চ একযোগী প্লেব্যাক</dt>
            <dd className="tabnum text-ink">{env.maxConcurrentPlaybacks.toLocaleString("bn-IN")}</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">মিডিয়া টোকেন মেয়াদ</dt>
            <dd className="tabnum text-ink">{env.mediaTokenTtl.toLocaleString("bn-IN")} সেকেন্ড</dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-muted">গেটওয়ে স্থিতি</dt>
            <dd className="text-ink">
              ম্যানুয়াল: সক্রিয় · বিকাশ: {process.env.BKASH_APP_KEY ? "কনফিগার্ড" : "অ-কনফিগার্ড"} · নগদ:{" "}
              {process.env.NAGAD_MERCHANT_ID ? "কনফিগার্ড" : "অ-কনফিগার্ড"} · SSLCommerz:{" "}
              {process.env.SSLCOMMERZ_STORE_ID ? "কনফিগার্ড" : "অ-কনফিগার্ড"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[12.5px] text-muted">
          গেটওয়ে ক্রেডেনশিয়াল env ভেরিয়েবলে থাকে (.env.example দেখুন) — ডাটাবেসে বা সোর্সে কখনো সংরক্ষিত হয় না।
        </p>
      </Card>
    </div>
  );
}

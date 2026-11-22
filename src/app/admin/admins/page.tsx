import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, Card } from "@/components/ui";
import { formatDateBn, relativeTimeBn } from "@/lib/format";
import { AdminCreateForm, AdminRoleSelect } from "./admin-forms";
import { requireSuperAdminPage } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "অ্যাডমিন ব্যবস্থাপনা" };

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  COURSE_MANAGER: "Course Manager",
  PAYMENT_MANAGER: "Payment Manager",
  SUPPORT_AGENT: "Support Agent",
};

export default async function AdminsPage() {
  const ctx = (await getAuthContext())!;
  requireSuperAdminPage(ctx);
  if (ctx.user.role !== "SUPER_ADMIN") {
    return <Card className="p-6 text-[14px] text-muted">শুধু Super Admin এই পেজ দেখতে পারেন।</Card>;
  }
  const admins = await prisma.user.findMany({
    where: { role: { not: "STUDENT" } },
    orderBy: { createdAt: "asc" },
    include: { adminProfile: true },
  });

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">অ্যাডমিন ব্যবস্থাপনা</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        দায়িত্বভিত্তিক রোল: প্রতিটি রোলের নির্দিষ্ট অনুমতি আছে। প্রিভিলেজড কাজ সব অডিট লগে যায়।
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-3 font-medium">অ্যাডমিন</th>
                <th className="px-4 py-3 font-medium">পদবি</th>
                <th className="px-4 py-3 font-medium">সর্বশেষ লগইন</th>
                <th className="px-4 py-3 font-medium">যোগদান</th>
                <th className="px-4 py-3 font-medium">রোল</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{a.name}</p>
                    <p className="text-[11.5px] text-muted">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{a.adminProfile?.designation ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{a.lastLoginAt ? relativeTimeBn(a.lastLoginAt) : "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatDateBn(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    {a.id === ctx.user.id ? (
                      <Badge tone="gold">{ROLE_LABEL[a.role]}</Badge>
                    ) : (
                      <AdminRoleSelect userId={a.id} role={a.role} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="display text-[16px] font-bold text-ink">নতুন অ্যাডমিন যোগ করুন</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          শক্তিশালী পাসওয়ার্ড দিন (কমপক্ষে ১০ অক্ষর)। অ্যাডমিন প্রথম লগইনের পর নিজের পাসওয়ার্ড পরিবর্তন করবেন।
          MFA চালু করার প্রস্তুতি স্কিমায় আছে (docs/SECURITY.md)।
        </p>
        <div className="mt-4">
          <AdminCreateForm />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="display text-[16px] font-bold text-ink">রোল অনুমতির সারণি</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <tbody className="divide-y divide-line">
              {[
                { role: "Super Admin", perms: "সবকিছু — সিস্টেম সেটিংস ও অ্যাডমিন ব্যবস্থাপনাসহ" },
                { role: "Admin", perms: "শিক্ষার্থী/কোর্স/পেমেন্ট/সেশন/কনটেন্ট — পূর্ণ পরিচালনা" },
                { role: "Course Manager", perms: "কোর্স, সিলেবাস, পরীক্ষা, কনটেন্ট" },
                { role: "Payment Manager", perms: "পেমেন্ট যাচাই, রিফান্ড, কুপন" },
                { role: "Support Agent", perms: "শিক্ষার্থী দেখা, পেমেন্ট দেখা, বার্তা" },
              ].map((r) => (
                <tr key={r.role}>
                  <td className="py-2.5 pr-4 font-semibold text-ink">{r.role}</td>
                  <td className="py-2.5 text-muted">{r.perms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

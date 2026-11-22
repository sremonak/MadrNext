import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, Card } from "@/components/ui";
import { SettingsProfileForm } from "./settings-forms";
import { formatDateBn } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "সেটিংস" };

export default async function SettingsPage() {
  const ctx = (await getAuthContext())!;
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    include: { studentProfile: true },
  });
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-[26px] font-bold text-ink">সেটিংস</h1>
      <p className="mt-1.5 text-[14px] text-muted">প্রোফাইল, নিরাপত্তা ও অ্যাকাউন্ট তথ্য।</p>

      <div className="mt-6 grid gap-6">
        <Card className="p-6">
          <h2 className="display text-[17px] font-bold text-ink">প্রোফাইল</h2>
          <div className="mt-1"><SettingsProfileForm name={user.name} email={user.email ?? ""} /></div>
        </Card>

        <Card className="p-6">
          <h2 className="display text-[17px] font-bold text-ink">অ্যাকাউন্ট তথ্য</h2>
          <dl className="mt-3 divide-y divide-line text-[14px]">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">শিক্ষার্থী আইডি</dt>
              <dd className="tabnum font-medium text-ink">{user.studentProfile?.studentId.slice(0, 8).toUpperCase()}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">ইমেইল</dt>
              <dd className="flex items-center gap-2 text-ink">
                {user.email}
                {user.emailVerifiedAt ? (
                  <Badge tone="success">যাচাইকৃত</Badge>
                ) : (
                  <Badge tone="warn">অযাচাইকৃত</Badge>
                )}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">মোবাইল</dt>
              <dd className="text-ink">{user.phone ?? "— (ঐচ্ছিক)"}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">শ্রেণি</dt>
              <dd className="text-ink">
                {user.studentProfile
                  ? `${user.studentProfile.level === "DAKHIL" ? "দাখিল" : user.studentProfile.level === "ALIM" ? "আলিম" : "জেনারেল"} — ${user.studentProfile.classNumber ?? "—"}ম শ্রেণি`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">যোগদানের তারিখ</dt>
              <dd className="text-ink">{formatDateBn(user.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="display text-[17px] font-bold text-ink">নিরাপত্তা</h2>
          <p className="mt-1.5 text-[13.5px] text-muted">
            পাসওয়ার্ড পরিবর্তন করলে সব ডিভাইস থেকে লগআউট হয়ে যাবে।
          </p>
          <div className="mt-3 flex gap-3">
            <Link href="/forgot-password" className="text-[14px] font-semibold text-teal hover:text-teal-deep">
              পাসওয়ার্ড পরিবর্তন →
            </Link>
            <Link href="/learn/settings/devices" className="text-[14px] font-semibold text-teal hover:text-teal-deep">
              ডিভাইস ও সেশন →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

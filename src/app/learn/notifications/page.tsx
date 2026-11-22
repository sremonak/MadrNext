import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui";
import { relativeTimeBn } from "@/lib/format";
import { markAllReadAction } from "@/lib/actions/notifications";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "নোটিফিকেশন" };

const TYPE_LABEL: Record<string, { label: string; tone: "info" | "success" | "warn" | "danger" | "gold" | "neutral" }> = {
  ENROLLMENT: { label: "এনরোলমেন্ট", tone: "success" },
  PAYMENT: { label: "পেমেন্ট", tone: "info" },
  LESSON_ANNOUNCEMENT: { label: "ক্লাস", tone: "gold" },
  COURSE_UPDATE: { label: "কোর্স আপডেট", tone: "gold" },
  EXAM_REMINDER: { label: "পরীক্ষা", tone: "warn" },
  SECURITY_ALERT: { label: "নিরাপত্তা", tone: "danger" },
  SYSTEM: { label: "সিস্টেম", tone: "neutral" },
};

export default async function NotificationsPage() {
  const ctx = await requireAuth();
  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="display text-[26px] font-bold text-ink">নোটিফিকেশন</h1>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className="text-[13.5px] font-semibold text-teal hover:text-teal-deep">
              সব পঠিত করুন ({unread.toLocaleString("bn-IN")})
            </button>
          </form>
        )}
      </div>
      <div className="mt-6 space-y-3">
        {notifications.map((n) => {
          const t = TYPE_LABEL[n.type] ?? TYPE_LABEL.SYSTEM;
          const inner = (
            <div className={`rounded-lg border p-4 transition-colors ${n.readAt ? "border-line bg-surface" : "border-teal/50 bg-teal/5"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={t.tone}>{t.label}</Badge>
                <span className="text-[12px] text-muted">{relativeTimeBn(n.createdAt)}</span>
                {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-label="অপঠিত" />}
              </div>
              <p className="mt-2 text-[14.5px] font-semibold text-ink">{n.titleBn}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{n.bodyBn}</p>
            </div>
          );
          return n.linkUrl ? (
            <Link key={n.id} href={n.linkUrl} className="block">
              {inner}
            </Link>
          ) : (
            <div key={n.id}>{inner}</div>
          );
        })}
        {notifications.length === 0 && (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">
            কোনো নোটিফিকেশন নেই।
          </p>
        )}
      </div>
    </div>
  );
}

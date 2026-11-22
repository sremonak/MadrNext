import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { Badge, Card } from "@/components/ui";
import { bnDigits, formatTaka, relativeTimeBn } from "@/lib/format";
import { AdminBarChart, AdminDonut } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "অ্যাডমিন ওভারভিউ" };

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const ctx = (await getAuthContext())!;
  const { denied } = await searchParams;

  const [
    totalStudents, activeStudents, suspendedStudents,
    totalCourses,
    totalEnrollments,
    revenueAgg, pendingPayments, successfulPayments,
    activeSessions,
    recentAudit,
    enrollmentsByCourse,
    paymentsByDay,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "STUDENT", status: "SUSPENDED" } }),
    prisma.course.count(),
        prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountPaisa: true } }),
    prisma.payment.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: { titleBn: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
      orderBy: { enrollments: { _count: "desc" } },
      take: 6,
    }),
    prisma.$queryRaw<{ day: Date; total: bigint }[]>`
      SELECT date_trunc('day', "createdAt") as day, COUNT(*) as total
      FROM "Payment" WHERE status = 'PAID' AND "createdAt" > now() - interval '14 days'
      GROUP BY 1 ORDER BY 1`,
  ]);

  const stats = [
    { label: "মোট শিক্ষার্থী", value: totalStudents, href: "/admin/students" },
    { label: "সক্রিয় শিক্ষার্থী", value: activeStudents, href: "/admin/students" },
    { label: "মোট কোর্স", value: totalCourses, href: "/admin/courses" },
    { label: "সক্রিয় এনরোলমেন্ট", value: totalEnrollments, href: "/admin/students" },
    { label: "মোট রেভিনিউ", value: formatTaka(revenueAgg._sum.amountPaisa ?? 0), money: true, href: "/admin/payments" },
    { label: "অপেক্ষমাণ পেমেন্ট", value: pendingPayments, warn: pendingPayments > 0, href: "/admin/payments" },
    { label: "সফল পেমেন্ট", value: successfulPayments, href: "/admin/payments" },
    { label: "সক্রিয় সেশন", value: activeSessions, href: "/admin/sessions" },
  ];

  return (
    <div>
      {denied && (
        <div className="mb-6 rounded-md border border-danger-wash bg-danger-wash px-4 py-3 text-[13.5px] text-ink">
          এই মডিউলে প্রবেশের অনুমতি আপনার ভূমিকায় নেই{denied !== "super_admin" ? ` (${denied})` : ""}। সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।
        </div>
      )}
      <h1 className="display text-[26px] font-bold text-ink">ওভারভিউ</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        স্বাগতম, {ctx.user.name}। আজকের পরিসংখ্যান ও সাম্প্রতিক কার্যক্রম।
      </p>

      {/* stat ledger */}
      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group bg-surface p-5 transition-colors hover:bg-paper">
            <p className="text-[12.5px] text-muted">{s.label}</p>
            <p className={`display tabnum mt-1.5 text-[24px] font-bold ${s.warn ? "text-warn" : s.money ? "text-teal" : "text-ink"}`}>
              {typeof s.value === "number" ? bnDigits(s.value) : s.value}
            </p>
          </Link>
        ))}
      </div>

      {suspendedStudents > 0 && (
        <div className="mt-4">
          <Badge tone="warn">{bnDigits(suspendedStudents)}টি অ্যাকাউন্ট স্থগিত আছে</Badge>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="display text-[16px] font-bold text-ink">শেষ ১৪ দিনে পেমেন্ট</h2>
          <div className="mt-4">
            <AdminBarChart
              data={paymentsByDay.map((r) => ({
                label: new Date(r.day).toLocaleDateString("en-GB", { day: "numeric" }),
                value: Number(r.total),
              }))}
            />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="display text-[16px] font-bold text-ink">কোর্সভিত্তিক এনরোলমেন্ট</h2>
          <div className="mt-4">
            <AdminDonut
              data={enrollmentsByCourse.map((c) => ({ label: c.titleBn, value: c._count.enrollments }))}
            />
          </div>
        </Card>
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="border-b border-line bg-paper px-5 py-3.5">
          <h2 className="display text-[16px] font-bold text-ink">সাম্প্রতিক কার্যক্রম</h2>
        </div>
        <ul className="divide-y divide-line">
          {recentAudit.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-[13.5px]">
              <span className="font-semibold text-ink">{a.actor?.name ?? "সিস্টেম"}</span>
              <span className="text-muted">
                {ACTION_LABEL[a.action] ?? a.action}
                {a.entityType && ` (${a.entityType})`}
              </span>
              <span className="ml-auto text-[12px] text-muted">{relativeTimeBn(a.createdAt)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line bg-paper px-5 py-2.5">
          <Link href="/admin/audit" className="text-[13px] font-semibold text-teal">
            সম্পূর্ণ অডিট লগ →
          </Link>
        </div>
      </Card>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  STUDENT_SUSPENDED: "শিক্ষার্থী স্থগিত করেছেন",
  STUDENT_REACTIVATED: "শিক্ষার্থী পুনঃসক্রিয় করেছেন",
  COURSE_ACCESS_GRANTED: "কোর্স অ্যাক্সেস দিয়েছেন",
  COURSE_ACCESS_REVOKED: "কোর্স অ্যাক্সেস বাতিল করেছেন",
  PAYMENT_APPROVED: "পেমেন্ট অনুমোদন করেছেন",
  PAYMENT_REJECTED: "পেমেন্ট বাতিল করেছেন",
  PAYMENT_REFUNDED: "রিফান্ড করেছেন",
  SESSION_REVOKED: "সেশন বাতিল করেছেন",
  FORCE_LOGOUT: "ফোর্স লগআউট করেছেন",
  COURSE_CREATED: "কোর্স তৈরি করেছেন",
  COURSE_UPDATED: "কোর্স হালনাগাদ করেছেন",
  COURSE_PUBLISHED: "কোর্স প্রকাশ করেছেন",
  MODULE_ADDED: "মডিউল যোগ করেছেন",
  LESSON_ADDED: "পাঠ যোগ করেছেন",
  ADMIN_CREATED: "অ্যাডমিন তৈরি করেছেন",
  ADMIN_ROLE_CHANGED: "অ্যাডমিন রোল পরিবর্তন করেছেন",
  SETTINGS_UPDATED: "সেটিংস পরিবর্তন করেছেন",
  CONTENT_DELETED: "কনটেন্ট মুছেছেন",
  MANUAL_PAYMENT_SUBMITTED: "ম্যানুয়াল পেমেন্ট জমা",
  PASSWORD_RESET_REQUESTED: "পাসওয়ার্ড রিসেট চাওয়া হয়েছে",
  PASSWORD_RESET_COMPLETED: "পাসওয়ার্ড রিসেট সম্পন্ন",
  FREE_ENROLLMENT: "ফ্রি এনরোলমেন্ট",
  DEVICE_LOGGED_OUT: "ডিভাইস লগআউট",
  LOGOUT_ALL_DEVICES: "সব ডিভাইস লগআউট",
};

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, BookOpen, CreditCard, MonitorSmartphone,
  FileSliders, ScrollText, Settings, ShieldCheck, Mail,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { hasPermission, isStaff } from "@/lib/auth/rbac";
import { LogoMark } from "@/components/brand/Logo";
import { logoutAction } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

const NAV: { href: string; label: string; icon: typeof Users; perm: string }[] = [
  { href: "/admin", label: "ওভারভিউ", icon: LayoutDashboard, perm: "students.view" },
  { href: "/admin/students", label: "শিক্ষার্থী", icon: Users, perm: "students.view" },
  { href: "/admin/courses", label: "কোর্স", icon: BookOpen, perm: "courses.view" },
  { href: "/admin/payments", label: "পেমেন্ট", icon: CreditCard, perm: "payments.view" },
  { href: "/admin/sessions", label: "সেশন ও ডিভাইস", icon: MonitorSmartphone, perm: "sessions.view" },
  { href: "/admin/content", label: "কনটেন্ট", icon: FileSliders, perm: "content.view" },
  { href: "/admin/contact", label: "বার্তা", icon: Mail, perm: "contact.view" },
  { href: "/admin/audit", label: "অডিট লগ", icon: ScrollText, perm: "audit.view" },
  { href: "/admin/settings", label: "সেটিংস", icon: Settings, perm: "settings.view" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  // Server-side guard: only staff with admin panel permission may enter.
  if (!isStaff(ctx) || !hasPermission(ctx, "students.view")) redirect("/learn");
  const roleLabel =
    ctx.user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : ctx.user.role === "ADMIN"
        ? "Admin"
        : ctx.user.role === "COURSE_MANAGER"
          ? "Course Manager"
          : ctx.user.role === "PAYMENT_MANAGER"
            ? "Payment Manager"
            : "Support Agent";

  const nav = NAV.filter((n) => hasPermission(ctx, n.perm));

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 border-b border-line px-5 py-4 text-ink">
          <LogoMark size={26} />
          <span className="display text-[16px] font-bold">MadrNext Admin</span>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3 py-4 scroll-slim">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-paper hover:text-teal"
            >
              <item.icon size={15} /> {item.label}
            </Link>
          ))}
          {ctx.user.role === "SUPER_ADMIN" && (
            <Link
              href="/admin/admins"
              className="mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-paper hover:text-teal"
            >
              <ShieldCheck size={15} /> অ্যাডমিন ব্যবস্থাপনা
            </Link>
          )}
        </nav>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[13.5px] font-semibold text-ink">{ctx.user.name}</p>
          <p className="text-[11.5px] text-gold">{roleLabel}</p>
          <form action={logoutAction} className="mt-2">
            <button type="submit" className="text-[12.5px] text-muted hover:text-danger">
              লগআউট
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-h-screen w-full flex-1 flex-col lg:pl-60">
        {/* mobile top nav */}
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2 text-ink">
            <LogoMark size={22} />
            <span className="display text-[14px] font-bold">Admin</span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto">
            {nav.slice(0, 6).map((item) => (
              <Link key={item.href} href={item.href} className="rounded-md px-2 py-1.5 text-[12.5px] text-muted">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className="flex-1 px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}

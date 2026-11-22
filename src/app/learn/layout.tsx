import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BookOpen, ClipboardList, CreditCard, Settings, LogOut, ShieldCheck, Bell } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { LogoMark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme";
import { logoutAction } from "@/lib/actions/auth";
import { bnDigits } from "@/lib/format";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/learn", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { href: "/learn/courses", label: "আমার কোর্স", icon: BookOpen },
  { href: "/learn/exams", label: "পরীক্ষা", icon: ClipboardList },
  { href: "/learn/billing", label: "পেমেন্ট", icon: CreditCard },
  { href: "/learn/settings", label: "সেটিংস", icon: Settings },
];

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const unread = await prisma.notification.count({
    where: { userId: ctx.user.id, readAt: null },
  });

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link href="/learn" className="flex items-center gap-2 text-ink">
            <LogoMark size={26} />
            <span className="display text-[16px] font-bold">MadrNext</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="ড্যাশবোর্ড মেনু">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-paper hover:text-teal"
              >
                <item.icon size={15} /> {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/learn/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted hover:text-teal"
              aria-label="নোটিফিকেশন"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10.5px] font-bold text-white">
                  {bnDigits(Math.min(unread, 99))}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <div className="flex items-center gap-2.5 border-l border-line pl-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-[12.5px] font-bold text-white"
                aria-hidden="true"
              >
                {ctx.user.name.slice(0, 1)}
              </span>
              <span className="hidden text-[13.5px] font-medium text-ink sm:block">{ctx.user.name}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] text-muted transition-colors hover:border-danger hover:text-danger"
                title="লগআউট"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">লগআউট</span>
              </button>
            </form>
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted"
            >
              <item.icon size={14} /> {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
      <footer className="border-t border-line py-4 text-center text-[12px] text-muted">
        <ShieldCheck size={12} className="mr-1 inline" />
        আপনার অ্যাকাউন্ট সুরক্ষিত — সব অনুরোধ সার্ভারে যাচাই হয়।
      </footer>
    </div>
  );
}

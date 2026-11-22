import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-[13.5px] text-muted hover:text-teal">
              ← হোমপেজ
            </Link>
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
      <footer className="border-t border-line py-4 text-center text-[12.5px] text-muted">
        © {new Date().getFullYear().toLocaleString("bn-IN")} MadrNext
      </footer>
    </div>
  );
}

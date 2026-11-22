import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme";
import { getAuthContext } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui";

const NAV = [
  { href: "/courses", label: "সব কোর্স" },
  { href: "/dakhil", label: "দাখিল" },
  { href: "/alim", label: "আলিম" },
  { href: "/subjects", label: "বিষয়" },
  { href: "/teachers", label: "শিক্ষক" },
  { href: "/faq", label: "সাধারণ জিজ্ঞা" },
];

export async function SiteHeader() {
  const ctx = await getAuthContext();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 lg:flex" aria-label="প্রধান মেনু">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[14px] font-medium text-muted transition-colors hover:text-teal"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {ctx ? (
            <ButtonLink href="/learn" size="sm" variant="primary">
              আমার ড্যাশবোর্ড
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" size="sm" variant="secondary">
                লগইন
              </ButtonLink>
              <ButtonLink href="/register" size="sm" variant="primary" className="hidden sm:inline-flex">
                ফ্রি রেজিস্ট্রেশন
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

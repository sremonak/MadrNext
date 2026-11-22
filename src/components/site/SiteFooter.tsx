import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "কোর্স",
    links: [
      { href: "/courses", label: "সব কোর্স" },
      { href: "/dakhil", label: "দাখিল কোর্স" },
      { href: "/alim", label: "আলিম কোর্স" },
      { href: "/subjects", label: "বিষয়সমূহ" },
    ],
  },
  {
    title: "প্রতিষ্ঠান",
    links: [
      { href: "/about", label: "আমাদের সম্পর্কে" },
      { href: "/teachers", label: "শিক্ষকবৃন্দ" },
      { href: "/contact", label: "যোগাযোগ" },
      { href: "/faq", label: "সাধারণ জিজ্ঞা" },
    ],
  },
  {
    title: "লিগ্যাল",
    links: [
      { href: "/privacy", label: "প্রাইভেসি পলিসি" },
      { href: "/terms", label: "শর্তাবলি" },
      { href: "/login", label: "লগইন" },
      { href: "/register", label: "রেজিস্ট্রেশন" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-ink">
              <LogoMark size={30} />
              <span className="display text-[19px] font-bold">MadrNext</span>
            </div>
            <p className="mt-3 max-w-xs text-[13.5px] leading-relaxed text-muted">
              মাদরাসা শিক্ষার্থীদের জন্য নির্মিত আধুনিক লার্নিং প্ল্যাটফর্ম। দাখিল ও আলিমের
              প্রতিটি বিষয়ে গুণগত কোর্স, পরীক্ষা ও নোট।
            </p>
            <p className="mt-4 text-[13px] text-muted">
              হেল্পলাইন: <span className="tabnum text-ink">০৯৬XX-XXXXXX</span>
              <br />
              ইমেইল: <span className="text-ink">hello@madrnext.app</span>
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-[13px] font-semibold uppercase-none text-ink">{col.title}</h3>
              <ul className="mt-3.5 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-[13.5px] text-muted transition-colors hover:text-teal">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-[12.5px] text-muted md:flex-row md:items-center">
          <p>© {new Date().getFullYear().toLocaleString("bn-IN")} MadrNext। সর্বস্বত্ব সংরক্ষিত।</p>
          <p className="display">মাদরাসা শিক্ষার ভবিষ্যৎ</p>
        </div>
      </div>
    </footer>
  );
}

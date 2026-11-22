import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  ClipboardCheck,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { HeroArch } from "@/components/brand/HeroArch";
import { CourseCard, type CourseCardData } from "@/components/course/CourseCard";
import { Badge, SectionTitle } from "@/components/ui";
import { bnDigits, initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured, teachers, testimonials, faqs, studentCount, courseCount, lessonCount] =
    await Promise.all([
      prisma.courseCategory.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: { _count: { select: { courses: { where: { status: "PUBLISHED" } } } } },
      }),
      prisma.course.findMany({
        where: { status: "PUBLISHED", isFeatured: true },
        take: 4,
        orderBy: { publishedAt: "desc" },
        include: {
          instructor: { select: { nameBn: true } },
          modules: { where: { isPublished: true }, select: { _count: { select: { lessons: { where: { isPublished: true } } } } } },
        },
      }),
      prisma.teacherProfile.findMany({ where: { isActive: true }, take: 3, orderBy: { order: "asc" } }),
      prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, take: 3 }),
      prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, take: 6 }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.course.count({ where: { status: "PUBLISHED" } }),
      prisma.lesson.count({ where: { isPublished: true } }),
    ]);

  const featuredCards: CourseCardData[] = featured.map((c) => ({
    id: c.id,
    slug: c.slug,
    titleBn: c.titleBn,
    subtitleBn: c.subtitleBn,
    level: c.level,
    pricePaisa: c.pricePaisa,
    discountPaisa: c.discountPaisa,
    discountEndsAt: c.discountEndsAt,
    durationMinutes: c.durationMinutes,
    thumbnailSeed: c.thumbnailSeed,
    instructorName: c.instructor?.nameBn,
    lessonCount: c.modules.reduce((sum, m) => sum + m._count.lessons, 0),
    isFree: c.pricePaisa === 0 || c.discountPaisa === 0,
  }));

  const dakhilCats = categories.filter((c) => c.level === "DAKHIL");
  const alimCats = categories.filter((c) => c.level === "ALIM");

  return (
    <>
      {/* ── Hero — manuscript frame, single orchestrated reveal ─────────── */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.15fr_0.85fr] md:items-center md:px-6 md:py-20">
          <div className="rise">
            <p className="display inline-flex items-center gap-2 text-[15px] font-semibold text-gold">
              <span aria-hidden="true">۞</span> দাখিল ও আলিম — সম্পূর্ণ প্রস্তুতি এক জায়গায়
            </p>
            <h1 className="display mt-4 text-[34px] font-extrabold leading-[1.18] text-ink md:text-[44px]">
              কুরআন–হাদিস থেকে গণিত–বিজ্ঞান,
              <br />
              প্রতিটি বিষয়ে মানসম্মত কোর্স
            </h1>
            <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted">
              MadrNext বাংলাদেশের মাদরাসা শিক্ষার্থীদের জন্য নির্মিত আধুনিক লার্নিং
              প্ল্যাটফর্ম। অভিজ্ঞ শিক্ষকদের ভিডিও ক্লাস, চ্যাপ্টারভিত্তিক পরীক্ষা, ডাউনলোড-সুরক্ষিত
              নোট আর প্রগ্রেস ট্র্যাকিং — সব মিলে বোর্ড পরীক্ষার নিশ্চিন্ত প্রস্তুতি।
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/courses"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-teal px-7 text-[16px] font-medium text-white shadow-raised transition-colors hover:bg-teal-deep"
              >
                কোর্স দেখুন <ArrowRight size={17} />
              </Link>
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-md border border-line-strong bg-paper px-6 text-[15.5px] font-medium text-ink transition-colors hover:border-teal hover:text-teal"
              >
                ফ্রি অ্যাকাউন্ট খুলুন
              </Link>
            </div>
            {/* stats as a real ledger strip */}
            <dl className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-line border-y border-line">
              {[
                { k: "শিক্ষার্থী", v: bnDigits(studentCount) },
                { k: "প্রকাশিত কোর্স", v: bnDigits(courseCount) },
                { k: "মোট পাঠ", v: bnDigits(lessonCount) },
              ].map((s) => (
                <div key={s.k} className="px-4 py-3.5 text-center first:pl-0">
                  <dt className="text-[12.5px] text-muted">{s.k}</dt>
                  <dd className="display tabnum mt-0.5 text-[22px] font-bold text-ink">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rise-2 mx-auto w-full max-w-[380px] text-ink">
            <HeroArch className="w-full" />
          </div>
        </div>
      </section>

      {/* ── Dakhil & Alim — asymmetric category panels ──────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <SectionTitle
          title="আপনার পরীক্ষা বেছে নিন"
          sub="দাখিল (এসএসসি সমমান) ও আলিম (এইচএসসি সমমান) — প্রতিটি ক্লাসের বিষয়ভিত্তিক কোর্স এখানে।"
        />
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          {[
            { title: "দাখিল", sub: "৯ম–১০ম শ্রেণি · এসএসসি সমমান", cats: dakhilCats, href: "/dakhil", accent: "teal" as const },
            { title: "আলিম", sub: "১১শ–১২শ শ্রেণি · এইচএসসি সমমান", cats: alimCats, href: "/alim", accent: "gold" as const },
          ].map((group) => (
            <div key={group.title} className="rule-frame-tight rounded-lg bg-surface p-6">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="display text-[24px] font-bold text-ink">{group.title}</h3>
                  <p className="mt-1 text-[13.5px] text-muted">{group.sub}</p>
                </div>
                <Link
                  href={group.href}
                  className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-teal hover:text-teal-deep"
                >
                  সব <ArrowRight size={14} />
                </Link>
              </div>
              <ol className="mt-5 divide-y divide-line">
                {group.cats.map((cat, i) => (
                  <li key={cat.id}>
                    <Link
                      href={`/courses?category=${cat.slug}`}
                      className="group flex items-baseline gap-3 py-3"
                    >
                      <span className="display tabnum w-7 shrink-0 text-[15px] font-semibold text-gold">
                        {bnDigits(i + 1)}.
                      </span>
                      <span className="flex-1 text-[15px] font-medium text-ink group-hover:text-teal">
                        {cat.nameBn}
                      </span>
                      <span className="text-[12.5px] text-muted">
                        {bnDigits(cat._count.courses)} কোর্স
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured courses — rows, not uniform cards ──────────────────── */}
      {featuredCards.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <SectionTitle
              title="জনপ্রিয় কোর্স"
              sub="শিক্ষার্থীদের পছন্দের তালিকা থেকে বাছাই করা।"
              action={
                <Link href="/courses" className="hidden shrink-0 items-center gap-1 text-[14px] font-semibold text-teal hover:text-teal-deep md:inline-flex">
                  সব কোর্স <ArrowRight size={15} />
                </Link>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCards.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Why MadrNext — numbered ledger, real sequence of value ──────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <SectionTitle title="কেন MadrNext" sub="শুধু ভিডিও নয় — সম্পূর্ণ প্রস্তুতি ব্যবস্থা।" />
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
          {[
            {
              n: "০১",
              icon: MonitorSmartphone,
              t: "যেকোনো ডিভাইসে ক্লাস",
              d: "মোবাইল, ট্যাবলেট বা কম্পিউটার — সেভ করা প্রগ্রেসসহ যেখানে থামিয়েছেন সেখান থেকেই শুরু।",
            },
            {
              n: "০২",
              icon: ClipboardCheck,
              t: "অটো-রেজাল্ট পরীক্ষা",
              d: "প্রতিটি চ্যাপ্টারে MCQ, প্র্যাকটিস ও মডেল টেস্ট। জমার সাথে সাথে রেজাল্ট ও ব্যাখ্যা।",
            },
            {
              n: "০৩",
              icon: BookOpenCheck,
              t: "সুরক্ষিত নোট ও লেকচার শিট",
              d: "এনরোলমেন্ট যাচাই করে দেখা যায়; ডাউনলোড বন্ধ ও আপনার নামে ওয়াটারমার্ক থাকে।",
            },
            {
              n: "০৪",
              icon: ShieldCheck,
              t: "নিরাপদ পেমেন্ট ও এনরোলমেন্ট",
              d: "বিকাশ/নগদ/SSLCommerz — সার্ভারে যাচাই হওয়ার পরেই কোর্সে অ্যাক্সেস চালু হয়।",
            },
          ].map((item) => (
            <div key={item.n} className="flex gap-5 bg-surface p-6">
              <span className="display tabnum text-[26px] font-bold text-gold">{item.n}</span>
              <div>
                <h3 className="flex items-center gap-2 text-[16.5px] font-semibold text-ink">
                  <item.icon size={17} className="text-teal" /> {item.t}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Teachers ─────────────────────────────────────────────────────── */}
      {teachers.length > 0 && (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <SectionTitle
              title="আমাদের শিক্ষকবৃন্দ"
              sub="মাদরাসা শিক্ষায় দীর্ঘ অভিজ্ঞতাসম্পন্ন শিক্ষকমণ্ডলী।"
              action={
                <Link href="/teachers" className="hidden shrink-0 items-center gap-1 text-[14px] font-semibold text-teal hover:text-teal-deep md:inline-flex">
                  সব শিক্ষক <ArrowRight size={15} />
                </Link>
              }
            />
            <div className="grid gap-6 md:grid-cols-3">
              {teachers.map((t) => (
                <div key={t.id} className="flex gap-4 rounded-lg border border-line bg-paper p-5">
                  <div
                    className="display flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-[20px] font-bold text-surface"
                    style={{ background: t.accentColor === "gold" ? "#b98a2f" : "#0c5b53" }}
                    aria-hidden="true"
                  >
                    {initials(t.nameBn)}
                  </div>
                  <div>
                    <h3 className="display text-[16.5px] font-bold text-ink">{t.nameBn}</h3>
                    <p className="mt-0.5 text-[13px] text-gold">{t.designationBn}</p>
                    <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-muted">{t.bioBn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonial slab ─────────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <SectionTitle title="শিক্ষার্থীরা যা বলছেন" />
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure
                key={t.id}
                className={`flex flex-col rounded-lg border border-line bg-surface p-6 ${i === 0 ? "rule-frame-tight" : ""}`}
              >
                <blockquote className="display flex-1 text-[15.5px] leading-relaxed text-ink">
                  “{t.quoteBn}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-teal text-[13px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {initials(t.nameBn)}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{t.nameBn}</p>
                    <p className="text-[12.5px] text-muted">{t.roleBn}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
            <SectionTitle title="সাধারণ জিজ্ঞা" sub="যে প্রশ্নগুলো শিক্ষার্থীরা সবচেয়ে বেশি করে থাকেন।" />
            <div className="divide-y divide-line border-y border-line">
              {faqs.map((f) => (
                <details key={f.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                    {f.questionBn}
                    <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 text-[14.5px] leading-relaxed text-muted">{f.answerBn}</p>
                </details>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/faq" className="text-[14px] font-semibold text-teal hover:text-teal-deep">
                সব প্রশ্ন দেখুন →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="rule-frame flex flex-col items-center gap-5 rounded-lg bg-gold-wash px-6 py-12 text-center">
          <Badge tone="gold">আজই শুরু করুন</Badge>
          <h2 className="display max-w-2xl text-[26px] font-bold leading-snug text-ink md:text-[30px]">
            বোর্ড পরীক্ষার প্রস্তুতি হোক সুব্যবস্থাপিত
          </h2>
          <p className="max-w-xl text-[14.5px] text-muted">
            একটি অ্যাকাউন্ট খুলে সব কোর্স, পরীক্ষা ও নোটের ক্যাটালগ দেখুন। প্রিভিউ পাঠ সম্পূর্ণ ফ্রি।
          </p>
          <Link
            href="/register"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-teal px-8 text-[16px] font-medium text-white shadow-raised transition-colors hover:bg-teal-deep"
          >
            ফ্রি রেজিস্ট্রেশন <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}

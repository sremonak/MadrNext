# MadrNext — Design System

## দর্শন

MadrNext-এর ডিজাইন মাদ্রাসা শিক্ষার মর্যাদা থেকে উঠে আসে — পাণ্ডুলিপির নিয়ম-ফ্রেম, গভীর পাইন-টিল, উষ্ণ কাগজ আর একটিমাত্র সোনালি অ্যাকসেন্ট। এটি ইউটিলিটি-প্রোডাক্টের পরিষ্কার ভাষা ও পুরনো কিতাবের মর্যাদার মাঝামাঝি: পড়ার জায়গা শান্ত, গুরুত্বপূর্ণ মুহূর্তে (এনরোলমেন্ট, রেজাল্ট, অনুমোদন) সোনালি রেখা।

AI-generic টেল এড়ানো হয়েছে: কোনো single-accent-word headline নেই, কোনো ALL-CAPS eyebrow নেই, meta-dot নেই, near-black tinted ব্যানার নেই, decorative monospace নেই, বোতামে `→` glyph নেই (lucide `ArrowRight` আইকন শুধু যেখানে অর্থবহ)।

## Typography

- **Hind Siliguri** (400/500/600/700) — UI ও বডি টেক্সট, বাংলা+ল্যাটিন উভয়।
- **Noto Serif Bengali** — ডিসপ্লে/শিরোনাম (`.display`), কুরআন-হাদিস উদ্ধৃতির মর্যাদা বোঝাতে।
- স্কেল: 13 / 13.5 / 14 (UI) → 18–20 (section) → 26 (page title) → 34–44 (hero), বাংলা লাইন-হাইট ঢিলেঢালা (1.6–1.75)।
- সংখ্যা সর্বত্র বাংলা অঙ্ক — `src/lib/format.ts` (`bnDigits`, `formatTaka`, `formatDateBn`, `relativeTimeBn`)। ট্যাবুলার কলামে `.tabnum` ক্লাস।

## Color tokens (`globals.css`)

| Token | মান (light) | ভূমিকা |
|---|---|---|
| `--color-paper` | warm paper `#faf6ee` | পেজ ব্যাকগ্রাউন্ড |
| `--color-surface` | `#fffdf7` | কার্ড/টেবিল |
| `--color-ink` | deep ink `#1d2b26` | মূল টেক্সট |
| `--color-teal` | pine-teal `#0c5b53` | ব্র্যান্ড অ্যাকশন |
| `--color-teal-deep` | `#083f3a` | hover / header band |
| `--color-gold` | manuscript gold `#b8860b` রেঞ্জ | একমাত্র অ্যাকসেন্ট — price, progress, hero rule |
| `--color-line` | `#e6ddc9` | রুল-ফ্রেম, ডিভাইডার |
| `--color-muted` | `#5f6f66` | সেকেন্ডারি টেক্সট |
| wash tokens | `*-wash` | badge/notice ব্যাকগ্রাউন্ড |

ডার্ক থিম: একই hue, গভীর কাগজ নয় — pine-black পেজ + উজ্জ্বল টেক্সট; সোনালি অ্যাকসেন্ট অপরিবর্তিত। থিম টগল `html.dark` + `localStorage["madrnext-theme"]`।

## Layout language

- **Manuscript rule-frame**: কার্ড/টেবিল `border border-line` + ভেতরে হেয়ারলাইন ডিভাইড — পাতার মার্জিনের মতো।
- **HeroArch**: হোমপেজে স্থাপত্য-খিলান SVG মোটিফ (মসজিদ খিলান থেকে নেওয়া), একটিমাত্র orchestrated motion — এন্ট্রিতে rule-frame আঁকা।
- কোর্স কভার: `CourseCover` — seed-ড্রিভেন জ্যামিতিক প্যাটার্ন (কোনো ছবি নয়), কোর্সের পরিচয় deterministic।
- ছন্দময় ফাঁকা জায়গা: section-পার্টিশনে `divide-line`, ঘন ডাটা টেবিলে কম্প্যাক্ট ৩px রো।

## Motion

- একটিমাত্র orchestrated moment: হোম হিরোর খিলান-আঁকা (CSS animation, `prefers-reduced-motion`-এ বন্ধ)।
- বাকি সব interactivity transition-only (`hover` রঙ, ১৫০ms) — কোনো framer-motion নেই।

## Components (`src/components/ui.tsx`)

`Card`, `Badge` (success/warn/danger/info), `Button` (`primary|secondary|ghost`, `sm|md|lg`), `ButtonLink`, `Field`, `Textarea`, `Select`, `Alert`, `Pagination`, `EmptyState`। সব ফর্ম লেবেল বাংলা, এরর বার্তা সমস্যা+সমাধান দুটোই বলে ("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে")।

## Content voice

- সব ইউজার-ফেসিং টেক্সট বাংলা, active voice, শিক্ষার্থীকে "আপনি" সম্বোধন।
- Empty state কখনো খালি বাক্য নয় — পরবর্তী অ্যাকশন বলে ("কোর্স ক্যাটালগ থেকে বেছে নিন")।
- অ্যাডমিন প্যানেলেও বাংলা লেবেল; ডাটা (ইমেইল, ইনভয়েস নম্বর) মূল ভাষায়।

## Quality floor

- মোবাইল-ফার্স্ট গ্রিড; টেবিলে `overflow-x-auto`।
- `focus-visible` রিং সব ইন্টারঅ্যাক্টিভ এলিমেন্টে; কনট্রাস্ট AA+ (ink on paper 12.6:1, teal on paper 6.9:1)।
- ছবি/ভিডিওতে alt/aria; চার্টে `role="img"` + aria-label।

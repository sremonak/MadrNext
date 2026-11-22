# MadrNext — মাদরাসা শিক্ষা ও কোর্স ম্যানেজমেন্ট প্ল্যাটফর্ম

**The Future of Madrasah Learning.** বাংলাদেশের দাখিল (SSC) ও আলিম (HSC) শিক্ষার্থীদের জন্য সম্পূর্ণ অনলাইন কোর্স প্ল্যাটফর্ম — সার্ভার-সাইড অ্যাক্সেস কন্ট্রোল, সাইনড মিডিয়া স্ট্রিমিং, ম্যানুয়াল/গেটওয়ে পেমেন্ট, পরীক্ষা ইঞ্জিন ও ফুল অ্যাডমিন প্যানেলসহ।

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL 16** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **hls.js** (secure HLS video), **pdf.js** (secure PDF viewer), **pdf-lib** (sample PDF generation)
- **Vitest** (unit + integration tests), **ESLint 9** (flat config, zero-warning policy)
- কাস্টম auth: scrypt পাসওয়ার্ড হ্যাশ, opaque সেশন টোকেন (কুকিতে raw, DB-তে শুধু sha256 হ্যাশ)

## Quick start

```bash
# 1. Dependencies (postinstall: prisma generate + pdf worker copy)
npm install

# 2. Environment
cp .env.example .env            # AUTH_SECRET অবশ্যই ৩২+ অক্ষর
openssl rand -hex 32            # AUTH_SECRET বানান

# 3. Database (PostgreSQL চালু থাকতে হবে)
npx prisma migrate deploy
npm run db:seed                 # ডেমো ডাটা (ক্রেডেনশিয়াল নিচে)

# 4. Sample media (HLS ভিডিও + PDF নোট)
npm run media:generate          # ffmpeg লাগবে (system ffmpeg বা: pip install imageio-ffmpeg)

# 5. Dev server
npm run dev                     # http://localhost:3000
```

### Seed credentials (dev demo)

| ভূমিকা | ইমেইল | পাসওয়ার্ড |
|---|---|---|
| Super Admin | `admin@madrnext.app` | `Admin#2026Secure` |
| Payment Manager | `payments@madrnext.app` | `Payment#2026` |
| Course Manager | `courses@madrnext.app` | `Course#2026` |
| Student demo | `sayma@example.com` | `Student#2026` |

> ⚠️ এগুলো **শুধুই লোকাল ডেমো সিড** — `prisma/seed.ts` প্রোডাকশনে চালাবেন না। প্রোডাকশনে প্রথম সুপার অ্যাডমিন তৈরি করুন:
>
> ```bash
> CREATE_SUPER_ADMIN_EMAIL=you@example.com CREATE_SUPER_ADMIN_PASSWORD='Strong#Pass2026' \
>   npx tsx scripts/dev/create-super-admin.mts
> ```
> স্ক্রিপ্ট চালানোর পর env ভ্যারিয়েবল মুছে ফেলুন।

## Feature map

### Public site (বাংলা)
হোমপেজ, কোর্স ক্যাটালগ + ফিল্টার, কোর্স ডিটেইল (প্রিভিউ পাঠ), দাখিল/আলিম ল্যান্ডিং, বিষয়সমূহ, শিক্ষকবৃন্দ, FAQ, যোগাযোগ, আমাদের সম্পর্কে, প্রাইভেসি, টার্মস। লাইট/ডার্ক থিম, Hind Siliguri + Noto Serif Bengali টাইপোগ্রাফি।

### Student (`/learn`)
ড্যাশবোর্ড (continue-learning, প্রগ্রেস), কোর্স কারিকুলাম + লেসন প্লেয়ার, লিখিত নোট (PDF ভিউয়ার), পরীক্ষা (timed MCQ, অটো রেজাল্ট, ব্যাখ্যাসহ রিভিউ), বিলিং/ইনভয়েস, নোটিফিকেশন, সেটিংস, ডিভাইস ও সেশন ম্যানেজমেন্ট, লগইন হিস্ট্রি।

### Admin (`/admin`)
ওভারভিউ (SVG চার্ট), শিক্ষার্থী (সার্চ/সাসপেন্ড/গ্র্যান্ট-রিভোক), পেমেন্ট (অনুমোদন/বাতিল/রিফান্ড + CSV এক্সপোর্ট), কোর্স ম্যানেজার (price/discount/seat + curriculum builder), সেশন ও লাইভ প্লেব্যাক মনিটর (revoke/force-logout), কনটেন্ট (FAQ/testimonial/announcement), যোগাযোগ বার্তা, অডিট লগ (হ্যাশ-চেইন ভেরিফিকেশন), সেটিংস, অ্যাডমিন ম্যানেজমেন্ট (Super Admin only)।

### Roles & permissions

| Role | মূল অনুমতি |
|---|---|
| SUPER_ADMIN | সব (`*`) — অ্যাডমিন ম্যানেজমেন্ট + সেটিংস এডিট |
| ADMIN | শিক্ষার্থী/কোর্স/পেমেন্ট/সেশন/কনটেন্ট/অডিট |
| PAYMENT_MANAGER | পেমেন্ট approve/reject/refund/export, কুপন |
| COURSE_MANAGER | কোর্স + কারিকুলাম + এক্সাম + কনটেন্ট |
| SUPPORT_AGENT | শিক্ষার্থী/পেমেন্ট/কনটেন্ট শুধু ভিউ, যোগাযোগ |

প্রতিটি অ্যাডমিন পেজ `requirePagePermission` দিয়ে সার্ভার-সাইডে গার্ডেড — nav লিংক লুকানো নিরাপত্তা নয়।

## Security model

- **Auth**: scrypt (N=16384) পাসওয়ার্ড হ্যাশ; opaque সেশন টোকেন; সেশন রিভোক/এক্সপায়ারি প্রতি রিকোয়েস্টে ভেরিফাইড; suspended ইউজার fail-closed।
- **Concurrency**: ডিফল্ট ৩ সেশন (পুরনোটি `DEVICE_LIMIT` রিজনে রিভোক), ২ কনকারেন্ট ভিডিও প্লেব্যাক (stale > ৯০ সেকেন্ড = শেষ)।
- **Course access**: `assertCourseAccess` — enrollment status + expiry + user status; প্রতিটি প্রোটেক্টেড API এটা কল করে, ক্লায়েন্ট কখনো trusted নয়।
- **Video**: `POST /api/media/playback` → এনরোলমেন্ট যাচাই → ১২০ সেকেন্ডের HMAC সাইনড টোকেন (user+asset+playback-session বাউন্ড) → HLS manifest প্রতি রিকোয়েস্টে রিরাইট করে প্রতিটি সেগমেন্টে টোকেন বসানো হয়; টোকেন ছাড়া ৪০৩; heartbeat ≤ ৫ মিনিট ফ্রেশ না হলে প্লেব্যাক বন্ধ। প্লেয়ারে প্রতি-স্টুডেন্ট ওয়াটারমার্ক (নাম + id fragment + session)।
- **PDF**: সাইনড DOCUMENT টোকেন, `Content-Disposition: inline`, `no-store`, স্টোরেজ পাথ traversal-গার্ডেড (`resolveStoragePath`)। পাবলিক ডাউনলোড নেই।
- **Payments**: MANUAL → `PENDING_REVIEW` (অ্যাডমিন approve ছাড়া কখনো PAID নয়); গেটওয়ে PAID শুধু সার্ভার-সাইড webhook (`/api/webhooks/payments/[gateway]`) ভেরিফিকেশনের পরে; ক্লায়েন্ট redirect কখনো trusted নয়; `activate()` idempotent; সব ইভেন্ট `PaymentEvent`-এ লগড।
- **Audit**: হ্যাশ-চেইন (`hash(prevHash + stableJSON(payload))`) + `verifyAuditChain` প্রতি-রো রিকম্পিউটসহ — যেকোনো ফিল্ড টেম্পার ধরা পড়ে।
- **Rate limit**: লগইন/প্লেব্যাক/যোগাযোগ ফর্মে ইন-মেমরি বাকেট।

## External services (production)

| সার্ভিস | Env | স্ট্যাটাস |
|---|---|---|
| PostgreSQL | `DATABASE_URL` | আবশ্যক |
| bKash / Nagad / SSLCommerz | `PAYMENT_BKASH_*`, `PAYMENT_NAGAD_*`, `PAYMENT_SSLCZ_*` | অপশনাল — কনফিগার না থাকলে ফ্রেন্ডলি বাংলা এরর, MANUAL পেমেন্ট সবসময় কাজ করে |
| SMTP (নোটিফিকেশন) | `SMTP_*` | অপশনাল — না থাকলে in-app only |
| Object storage (S3/সামঞ্জস্য) | `STORAGE_*` | লোকালে `STORAGE_DIR=./storage` |

## Commands

```bash
npm run dev            # dev server (0.0.0.0:3000)
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint, max-warnings=0
npm test               # vitest (integration tests DATABASE_URL দরকার — ডিফল্ট madrnext_test)
npm run db:seed        # seed demo data
npm run media:generate # storage/videos + storage/documents জেনারেট
npm run vendor:copy    # pdf.js worker → public/vendor
npm run audit:rehash   # অডিট চেইন রিবিল্ড (serialization বদলালে)
```

## Tests

`tests/` — ৪৯ টেস্ট: auth (hash/verify/strength/token), RBAC (৫ রোল), course access denial (NOT_ENROLLED / PENDING / EXPIRED / REVOKED / USER_SUSPENDED), cross-student isolation, purchase flow (manual approve idempotency, gateway verify, free enroll, coupon rules, refund), session device-limit eviction + logout-all + fail-closed, media token (expiry/tamper/wrong-secret/fingerprint), audit hash-chain tamper detection, rate limiting।

```bash
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/madrnext_test npm test
```

## Project layout

```
src/app/(public)/      — public pages
src/app/(auth)/        — login/register/forgot/reset
src/app/learn/         — student area
src/app/admin/         — admin panel (RBAC sidebar + page guards)
src/app/api/           — media (playback/video/document/heartbeat), webhooks, admin APIs
src/lib/               — auth, access, payments, media tokens, audit, notify, env, format
src/components/        — ui primitives, brand, site, learn players, admin charts
prisma/                — schema (33 models), migrations, seed
tests/                 — vitest suites
scripts/               — dev tooling (media gen, session mint, rehash)
```

## Design

ডিজাইন সিস্টেম, টোকেন ও ব্র্যান্ড নির্দেশনা: [docs/DESIGN.md](docs/DESIGN.md)।

# MadrNext ডিপ্লয় গাইড (ফ্রি টিয়ার)

> ⚠️ **GitHub Pages দিয়ে MadrNext চলবে না।** GitHub Pages শুধু static ফাইল (HTML/CSS/JS) সার্ভ করতে পারে। MadrNext একটি full-stack অ্যাপ — PostgreSQL ডাটাবেস, সার্ভার-সাইড সেশন/অথ, ভিডিও স্ট্রিমিং API, পেমেন্ট ওয়েবহুক দরকার, যা কোনো static host-এ অসম্ভব। `next build`-এর সব পেজই dynamic (`force-dynamic`), তাই `output: "export"`-ও করা যাবে না।

সবচেয়ে সহজ ও ফ্রি সমন্বয়: **Vercel (অ্যাপ) + Neon (PostgreSQL)** — দুটোই ফ্রি টিয়ারে এই প্রজেক্ট চালানোর মতো যথেষ্ট।

---

## ধাপ ১ — ফ্রি PostgreSQL: Neon

1. [neon.tech](https://neon.tech)-এ সাইনআপ (GitHub অ্যাকাউন্ট দিয়ে)।
2. নতুন Project তৈরি করুন → connection string কপি করুন:
   `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`
3. টেস্ট DB আলাদা রাখতে চাইলে একই প্রজেক্টে `madrnext_test` নামে দ্বিতীয় branch/database বানান।

## ধাপ ২ — স্কিমা ও প্রথম অ্যাডমিন

লোকাল টার্মিনাল থেকে (Neon URL সেট করে):

```bash
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
npx prisma migrate deploy        # স্কিমা তৈরি

# প্রথম সুপার অ্যাডমিন (শুধু একবার; পরে env মুছে ফেলুন)
CREATE_SUPER_ADMIN_EMAIL=you@example.com \
CREATE_SUPER_ADMIN_PASSWORD='Strong#Pass2026' \
  npx tsx scripts/dev/create-super-admin.mts
```

ডেমো ডাটা দরকার হলে (শুধু ডেভ/ডেমো ডাটাবেসে!): `npm run db:seed`

## ধাপ ৩ — মিডিয়া ফাইল

লেসন ভিডিও/PDF ফাইল ডাটাবেসে নয়, ডিস্কে থাকে (`STORAGE_DIR`, ডিফল্ট `./storage`)। Vercel-এর ফাইলসিস্টেম read-only+ephemeral, তাই প্রোডাকশনে:

- **সহজ অপশন:** ছোট ডেমোর জন্য `storage/` ফোল্ডারটি রিপোজিটরিতে কমিট করে পাঠিয়ে দিন — Vercel বিল্ডে ফাইল কপি হয়ে যাবে (লেখা হবে না, শুধু পড়া হবে — এই অ্যাপ শুধু পড়ে)।
- **সঠিক অপশন:** S3/R2-সামঞ্জস্য object storage ব্যবহার করুন এবং `VideoAsset.storagePath`/`DocumentAsset.storagePath`-এ সেই পাথ রাখুন; `src/lib/storage.ts`-এ সাপ্লায়ার অ্যাবস্ট্র্যাকশন যোগ করুন।

```bash
npm run media:generate && git add storage && git commit -m "demo media assets"
```

## ধাপ ৪ — Vercel

1. [vercel.com](https://vercel.com) → GitHub দিয়ে লগইন → **Add New → Project** → এই রিপো ইমপোর্ট করুন।
2. Framework preset: **Next.js** (অটো ধরা হবে)। Build command `npm run build` ডিফল্টই থাকবে।
3. **Environment Variables** সেট করুন (Production + Preview দুটোতেই):

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | `openssl rand -hex 32` আউটপুট (৩২+ অক্ষর) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `STORAGE_DIR` | `./storage` |
| `SESSION_TTL_HOURS` | `24` |
| `MAX_CONCURRENT_SESSIONS` | `3` |
| `MAX_CONCURRENT_PLAYBACKS` | `2` |
| `MEDIA_TOKEN_TTL_SECONDS` | `120` |
| `SMTP_*` / `SMS_*` | (অপশনাল) নোটিফিকেশনের জন্য |
| `PAYMENT_BKASH_*` ইত্যাদি | (অপশনাল) গেটওয়ে কনফিগার করলে ওয়েবহুক চালু হবে |

4. **Deploy** → ২-৩ মিনিটে লাইভ।

## ধাপ ৫ — পেমেন্ট ওয়েবহুক

গেটওয়ে কনফিগার করলে ওয়েবহুক URL হবে:

```
https://your-app.vercel.app/api/webhooks/payments/bkash
https://your-app.vercel.app/api/webhooks/payments/nagad
https://your-app.vercel.app/api/webhooks/payments/sslcommerz
```

গেটওয়ের ড্যাশবোর্ডে এই URL + সংশ্লিষ্ট `PAYMENT_WEBHOOK_SECRET_*` ভ্যালু রেজিস্টার করুন। গেটওয়ে না থাকলে MANUAL পেমেন্ট ফ্লো সবসময় কাজ করে (শিক্ষার্থী টাকা পাঠায় → অ্যাডমিন যাচাই করে approve করে)।

## বিকল্প হোস্ট

| হোস্ট | নোট |
|---|---|
| **Railway** | অ্যাপ + Postgres এক জায়গায়; সবচেয়ে সহজ সিঙ্গেল-সার্ভিস অপশন |
| **Render** | ফ্রি Postgres ৯০ দিন সীমিত; অ্যাপের জন্য ঠিক |
| **VPS (Contabo/Hetzner)** | `npm run build && npm start` + Nginx + লোকাল PG; সবচেয়ে বেশি কন্ট্রোল |
| ~~GitHub Pages~~ | Static only — **চলবে না** |

## ডিপ্লয়ের পর চেকলিস্ট

- [ ] `/login` → প্রথম সুপার অ্যাডমিন দিয়ে লগইন
- [ ] `/admin` → ওভারভিউ লোড হচ্ছে, চার্টে ডাটা আছে
- [ ] একটি ফ্রি কোর্সে এনরোল → `/learn` → লেসন প্লেয়ার চলছে
- [ ] সাইনড টোকেন ছাড়া `/api/media/video/<id>` → ৪০৩
- [ ] লগইন ইতিহাসে নতুন লগইন দেখা যাচ্ছে
- [ ] ব্যাকআপ: Neon-এ point-in-time restore চালু আছে কিনা যাচাই করুন

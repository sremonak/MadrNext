/**
 * MadrNext seed — realistic Bangla content for Dakhil & Alim.
 * Run: npm run db:seed
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/madrnext";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("Seeding MadrNext…");

  // ── Admins ────────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@madrnext.app" },
    update: {},
    create: {
      email: "admin@madrnext.app",
      name: "মুফতি আব্দুল্লাহ সাহেব",
      passwordHash: await hashPassword("Admin#2026Secure"),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      adminProfile: { create: { designation: "প্রতিষ্ঠাতা ও পরিচালক" } },
    },
  });
  const paymentManager = await prisma.user.upsert({
    where: { email: "payments@madrnext.app" },
    update: {},
    create: {
      email: "payments@madrnext.app",
      name: "হাফেজ মাহমুদুল হাসান",
      passwordHash: await hashPassword("Payment#2026"),
      role: "PAYMENT_MANAGER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      adminProfile: { create: { designation: "পেমেন্ট ম্যানেজার" } },
    },
  });
  const courseManager = await prisma.user.upsert({
    where: { email: "courses@madrnext.app" },
    update: {},
    create: {
      email: "courses@madrnext.app",
      name: "মাওলানা রফিকুল ইসলাম",
      passwordHash: await hashPassword("Course#2026"),
      role: "COURSE_MANAGER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      adminProfile: { create: { designation: "কোর্স ম্যানেজার" } },
    },
  });

  // ── Categories & subjects ─────────────────────────────────────────────
  const catData = [
    { slug: "dakhil-quran", nameBn: "আল কুরআন ও তাজবীদ", nameEn: "Al Quran & Tajweed", level: "DAKHIL" as const, order: 1 },
    { slug: "dakhil-hadith", nameBn: "আল হাদিস", nameEn: "Al Hadith", level: "DAKHIL" as const, order: 2 },
    { slug: "dakhil-fiqh", nameBn: "ফিকহ ও ফারায়েজ", nameEn: "Fiqh & Farayez", level: "DAKHIL" as const, order: 3 },
    { slug: "dakhil-arabic-1", nameBn: "আরবি ১ম পত্র", nameEn: "Arabic 1st Paper", level: "DAKHIL" as const, order: 4 },
    { slug: "dakhil-arabic-2", nameBn: "আরবি ২য় পত্র", nameEn: "Arabic 2nd Paper", level: "DAKHIL" as const, order: 5 },
    { slug: "dakhil-bangla", nameBn: "বাংলা", nameEn: "Bangla", level: "DAKHIL" as const, order: 6 },
    { slug: "dakhil-english", nameBn: "ইংরেজি", nameEn: "English", level: "DAKHIL" as const, order: 7 },
    { slug: "dakhil-math", nameBn: "গণিত", nameEn: "Mathematics", level: "DAKHIL" as const, order: 8 },
    { slug: "dakhil-science", nameBn: "বিজ্ঞান", nameEn: "General Science", level: "DAKHIL" as const, order: 9 },
    { slug: "alim-quran", nameBn: "আল কুরআন ও তাজবীদ", nameEn: "Al Quran & Tajweed", level: "ALIM" as const, order: 1 },
    { slug: "alim-hadith", nameBn: "আল হাদিস", nameEn: "Al Hadith", level: "ALIM" as const, order: 2 },
    { slug: "alim-fiqh", nameBn: "ফিকহ", nameEn: "Fiqh", level: "ALIM" as const, order: 3 },
    { slug: "alim-arabic", nameBn: "আরবি সাহিত্য", nameEn: "Arabic Literature", level: "ALIM" as const, order: 4 },
    { slug: "alim-bangla", nameBn: "বাংলা", nameEn: "Bangla", level: "ALIM" as const, order: 5 },
    { slug: "alim-english", nameBn: "ইংরেজি", nameEn: "English", level: "ALIM" as const, order: 6 },
    { slug: "alim-logic", nameBn: "মান্তিক", nameEn: "Logic", level: "ALIM" as const, order: 7 },
    { slug: "alim-islamic-history", nameBn: "ইসলামের ইতিহাস", nameEn: "Islamic History", level: "ALIM" as const, order: 8 },
    { slug: "alim-social-science", nameBn: "সমাজবিজ্ঞান", nameEn: "Social Science", level: "ALIM" as const, order: 9 },
  ];
  for (const c of catData) {
    await prisma.courseCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const cats = Object.fromEntries((await prisma.courseCategory.findMany()).map((c) => [c.slug, c]));

  const subjData = [
    { slug: "quran-tajweed", nameBn: "আল কুরআন ও তাজবীদ", nameEn: "Al Quran & Tajweed", level: "DAKHIL" as const, category: "dakhil-quran", order: 1 },
    { slug: "hadith", nameBn: "আল হাদিস", nameEn: "Al Hadith", level: "DAKHIL" as const, category: "dakhil-hadith", order: 2 },
    { slug: "fiqh", nameBn: "ফিকহ", nameEn: "Fiqh", level: "DAKHIL" as const, category: "dakhil-fiqh", order: 3 },
    { slug: "arabic", nameBn: "আরবি", nameEn: "Arabic", level: "DAKHIL" as const, category: "dakhil-arabic-1", order: 4 },
    { slug: "bangla", nameBn: "বাংলা", nameEn: "Bangla", level: "DAKHIL" as const, category: "dakhil-bangla", order: 5 },
    { slug: "english", nameBn: "ইংরেজি", nameEn: "English", level: "DAKHIL" as const, category: "dakhil-english", order: 6 },
    { slug: "math", nameBn: "গণিত", nameEn: "Mathematics", level: "DAKHIL" as const, category: "dakhil-math", order: 7 },
    { slug: "science", nameBn: "বিজ্ঞান", nameEn: "Science", level: "DAKHIL" as const, category: "dakhil-science", order: 8 },
    { slug: "alim-quran", nameBn: "আল কুরআন ও তাজবীদ", nameEn: "Al Quran & Tajweed", level: "ALIM" as const, category: "alim-quran", order: 1 },
    { slug: "alim-hadith", nameBn: "আল হাদিস", nameEn: "Al Hadith", level: "ALIM" as const, category: "alim-hadith", order: 2 },
    { slug: "alim-fiqh", nameBn: "ফিকহ", nameEn: "Fiqh", level: "ALIM" as const, category: "alim-fiqh", order: 3 },
    { slug: "alim-arabic", nameBn: "আরবি সাহিত্য", nameEn: "Arabic Literature", level: "ALIM" as const, category: "alim-arabic", order: 4 },
    { slug: "alim-logic", nameBn: "মান্তিক", nameEn: "Logic", level: "ALIM" as const, category: "alim-logic", order: 5 },
    { slug: "alim-history", nameBn: "ইসলামের ইতিহাস", nameEn: "Islamic History", level: "ALIM" as const, category: "alim-islamic-history", order: 6 },
  ];
  for (const s of subjData) {
    await prisma.subject.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug, nameBn: s.nameBn, nameEn: s.nameEn, level: s.level, order: s.order,
        categoryId: cats[s.category]?.id,
      },
    });
  }
  const subjects = Object.fromEntries((await prisma.subject.findMany()).map((s) => [s.slug, s]));

  // ── Teachers ──────────────────────────────────────────────────────────
  const teacherData = [
    {
      userId: null as string | null,
      nameBn: "মুফতি আব্দুল্লাহ মামুন",
      nameEn: "Mufti Abdullah Mamun",
      designationBn: "প্রধান শিক্ষক, কুরআন ও তাজবীদ",
      designationEn: "Head Instructor, Quran & Tajweed",
      bioBn: "দাওরায়ে হাদিস (মাস্টার্স) সম্পন্ন করে দুই দশক ধরে দাখিল-আলিম শিক্ষার্থীদের তাজবীদ শেখাচ্ছেন। তাঁর ক্লাসে ছন্দের সূক্ষ্মতা সহজভাবে শেখা যায়।",
      education: "দাওরায়ে হাদিস, মাদরাসা শিক্ষা বোর্ড",
      accentColor: "teal",
      order: 1,
    },
    {
      userId: null,
      nameBn: "মোসাহিদা খানম আপা",
      nameEn: "Mosahida Khanam Apa",
      designationBn: "বাংলা ও ইংরেজি বিভাগীয় প্রধান",
      designationEn: "Head of Bangla & English",
      bioBn: "ঢাকা বিশ্ববিদ্যালয় থেকে বাংলা সাহিত্যে মাস্টার্স। মাদরাসা শিক্ষার্থীদের জন্য বাংলা ব্যাকরণের বিশেষ পদ্ধতি উদ্ভাবন করেছেন।",
      education: "এমএ (বাংলা), ঢাকা বিশ্ববিদ্যালয়",
      accentColor: "gold",
      order: 2,
    },
    {
      userId: null,
      nameBn: "মাওলানা সাইফুল ইসলাম",
      nameEn: "Mawlana Saiful Islam",
      designationBn: "ফিকহ ও আরবি শিক্ষক",
      designationEn: "Instructor, Fiqh & Arabic",
      bioBn: "আল-আযহার বিশ্ববিদ্যালয় থেকে আরবি ভাষায় ডিপ্লোমা। ফিকহের হুকুম-আহকাম জীবন্ত উদাহরণে শেখান।",
      education: "আরবি ভাষা ডিপ্লোমা, আল-আযহার",
      accentColor: "teal",
      order: 3,
    },
    {
      userId: null,
      nameBn: "প্রকৌশলী তানভীর রহমান",
      nameEn: "Engr. Tanvir Rahman",
      designationBn: "গণিত ও বিজ্ঞান শিক্ষক",
      designationEn: "Instructor, Math & Science",
      bioBn: "বুয়েট থেকে ইলেকট্রিক্যাল ইঞ্জিনিয়ারিং। মাদরাসা শিক্ষার্থীদের জন্য গণিতের ভীতি দূর করার বিশেষ কোর্স ডিজাইন করেছেন।",
      education: "বিএসসি (EEE), BUET",
      accentColor: "gold",
      order: 4,
    },
  ];
  for (const t of teacherData) {
    const existing = await prisma.teacherProfile.findFirst({ where: { nameEn: t.nameEn } });
    if (!existing) await prisma.teacherProfile.create({ data: t });
  }
  const teachers = await prisma.teacherProfile.findMany({ orderBy: { order: "asc" } });
  const T = Object.fromEntries(teachers.map((t) => [t.nameEn, t.id]));

  // ── Courses ───────────────────────────────────────────────────────────
  const courseData = [
    {
      slug: "quran-tajweed-dakhil-9-10",
      titleBn: "আল কুরআন ও তাজবীদ — দাখিল ৯ম-১০ম (পূর্ণাঙ্গ কোর্স)",
      titleEn: "Al Quran & Tajweed — Dakhil 9-10",
      subtitleBn: "সূরা তিলাওয়াত থেকে তাজবীদের সূক্ষ্ম মাসায়েল পর্যন্ত প্রিমিয়াম প্রস্তুতি",
      descriptionBn:
        "বোর্ড পরীক্ষার পাঠ্যসূচি অনুসারে সম্পূর্ণ সিলেবাস: সূরা বর্ণনা, তাজবীদের মাসায়েল, মাখরাজ পরিচিতি এবং কালিমা-আয়াতের অর্থ।\n\nপ্রতিটি অধ্যায়ে ভিডিও ক্লাস, চ্যাপ্টার নোট ও MCQ পরীক্ষা রয়েছে। তাজবীদের ভুল উচ্চারণ ধরা পড়ার জন্য সাধারণ ভুলের তালিকাও আছে।\n\nকোর্স শেষে আপনি বোর্ড প্রশ্নের ধরন অনুযায়ী পূর্ণ প্রস্তুতি নিতে পারবেন।",
      category: "dakhil-quran", subject: "quran-tajweed", instructor: "Mufti Abdullah Mamun",
      level: "DAKHIL" as const, classNumber: 9, price: 1500, discount: 990,
      featured: true, certificate: true,
    },
    {
      slug: "hadith-dakhil-9-10",
      titleBn: "আল হাদিস — দাখিল ৯ম-১০ম",
      titleEn: "Al Hadith — Dakhil 9-10",
      subtitleBn: "প্রসিদ্ধ হাদিসের ব্যাখ্যা, মূল্যায়ন ও বোর্ড প্রশ্ন-প্যাটার্ন",
      descriptionBn:
        "পাঠ্যবইয়ের প্রতিটি হাদিসের শব্দার্থ, ব্যাখ্যা ও শিক্ষা বিশ্লেষণ।\n\nসংক্ষিপ্ত প্রশ্ন, রচনামূলক প্রশ্ন ও আরবি শব্দের বাংলা অর্থের প্রস্তুতি — সব এক কোর্সে।",
      category: "dakhil-hadith", subject: "hadith", instructor: "Mufti Abdullah Mamun",
      level: "DAKHIL" as const, classNumber: 9, price: 1200, discount: null,
      featured: false, certificate: false,
    },
    {
      slug: "fiqh-dakhil-9-10",
      titleBn: "ফিকহ ও ফারায়েজ — দাখিল ৯ম-১০ম",
      titleEn: "Fiqh & Farayez — Dakhil 9-10",
      subtitleBn: "পবিত্রতা থেকে ওয়ারিসান পর্যন্ত — জীবন্ত উদাহরণে মাসায়েল",
      descriptionBn:
        "তোহরত, সালাত, যাকাত, হজ ও ওয়ারিসান — প্রতিটি অধ্যায়ে জীবন্ত উদাহরণ ও গণনার প্র্যাকটিস।\n\nফারায়েজের গণিত-সদৃশ অংশে ধাপে ধাপে সমাধান দেখানো হয়েছে।",
      category: "dakhil-fiqh", subject: "fiqh", instructor: "Mawlana Saiful Islam",
      level: "DAKHIL" as const, classNumber: 9, price: 1200, discount: null,
      featured: false, certificate: false,
    },
    {
      slug: "math-dakhil-9-10",
      titleBn: "গণিত — দাখিল ৯ম-১০ম (ফিয়ার ফ্রি ম্যাথ)",
      titleEn: "Mathematics — Dakhil 9-10",
      subtitleBn: "বীজগণিত থেকে জ্যামিতি — প্রতিটি সমীকরণের ধাপে ধাপে সমাধান",
      descriptionBn:
        "মাদরাসা শিক্ষার্থীদের জন্য বিশেষভাবে সাজানো গণিত কোর্স। প্রতিটি অধ্যায়ে বোর্ড প্রশ্নের টাইপ অনুযায়ী সমাধান-কৌশল।\n\nসূত্র মুখস্থ না করে বোঝার ফর্মুলা — এই কোর্সের মূলমন্ত্র।",
      category: "dakhil-math", subject: "math", instructor: "Engr. Tanvir Rahman",
      level: "DAKHIL" as const, classNumber: 9, price: 1800, discount: 1290,
      featured: true, certificate: true,
    },
    {
      slug: "bangla-dakhil-9-10",
      titleBn: "বাংলা — দাখিল ৯ম-১০ম",
      titleEn: "Bangla — Dakhil 9-10",
      subtitleBn: "নাটক-গল্প-কবিতা বিশ্লেষণ ও ব্যাকরণের শর্টকাট",
      descriptionBn:
        "পাঠ্যবইয়ের প্রতিটি গল্প-কবিতার মূল্যায়ন, ব্যাকরণের সহজ শর্টকাট এবং লেখার প্রস্তুতি।",
      category: "dakhil-bangla", subject: "bangla", instructor: "Mosahida Khanam Apa",
      level: "DAKHIL" as const, classNumber: 9, price: 900, discount: null,
      featured: false, certificate: false,
    },
    {
      slug: "quran-alim-11-12",
      titleBn: "আল কুরআন ও তাজবীদ — আলিম ১১শ-১২শ",
      titleEn: "Al Quran & Tajweed — Alim 11-12",
      subtitleBn: "তাফসির-ভিত্তিক আয়াত বিশ্লেষণ ও উচ্চতর তাজবীদ",
      descriptionBn:
        "আলিম সিলেবাসের আয়াতসমূহের তাফসির-ভিত্তিক ব্যাখ্যা, মুস্তালাহাত ও উচ্চতর তাজবীদ মাসায়েল।",
      category: "alim-quran", subject: "alim-quran", instructor: "Mufti Abdullah Mamun",
      level: "ALIM" as const, classNumber: 11, price: 2200, discount: 1590,
      featured: true, certificate: true,
    },
    {
      slug: "arabic-alim-11-12",
      titleBn: "আরবি সাহিত্য — আলিম ১১শ-১২শ",
      titleEn: "Arabic Literature — Alim 11-12",
      subtitleBn: "নাহভ-সারফ মজবুত করে সাহিত্যের মূল্যায়ন",
      descriptionBn:
        "গ্রামারের বেসিক মজবুত করে প্রসিদ্ধ আরবি নাসর ও নাজমের বিশ্লেষণ। অনুবাদ প্র্যাকটিসের বিশেষ ক্লাস।",
      category: "alim-arabic", subject: "alim-arabic", instructor: "Mawlana Saiful Islam",
      level: "ALIM" as const, classNumber: 11, price: 1600, discount: null,
      featured: false, certificate: false,
    },
    {
      slug: "islamic-history-alim",
      titleBn: "ইসলামের ইতিহাস — আলিম",
      titleEn: "Islamic History — Alim",
      subtitleBn: "সিরাত থেকে আধুনিক যুগ — টাইমলাইনভিত্তিক প্রস্তুতি",
      descriptionBn:
        "ঘটনাক্রমে সাজানো ইতিহাস, মূল্যায়নমূলক প্রশ্নের উত্তর-কৌশল ও টাইমলাইন নোট।",
      category: "alim-islamic-history", subject: "alim-history", instructor: "Mawlana Saiful Islam",
      level: "ALIM" as const, classNumber: 11, price: 1100, discount: null,
      featured: false, certificate: false,
    },
  ];

  for (const c of courseData) {
    const existing = await prisma.course.findUnique({ where: { slug: c.slug } });
    if (existing) continue;
    await prisma.course.create({
      data: {
        slug: c.slug,
        titleBn: c.titleBn,
        titleEn: c.titleEn,
        subtitleBn: c.subtitleBn,
        descriptionBn: c.descriptionBn,
        categoryId: cats[c.category].id,
        subjectId: subjects[c.subject]?.id,
        instructorId: T[c.instructor],
        level: c.level,
        classNumber: c.classNumber,
        pricePaisa: c.price * 100,
        discountPaisa: c.discount ? c.discount * 100 : null,
        status: "PUBLISHED",
        isFeatured: c.featured,
        hasCertificate: c.certificate,
        thumbnailSeed: Math.floor(Math.random() * 6) + 1,
        createdBy: courseManager.id,
        publishedAt: new Date(),
      },
    });
  }
  const allCourses = await prisma.course.findMany();
  const C = Object.fromEntries(allCourses.map((c) => [c.slug, c]));

  // ── Modules & lessons (sample assets attached by media script) ────────
  async function addModule(courseSlug: string, titleBn: string, lessons: { titleBn: string; type: "VIDEO" | "DOCUMENT" | "TEXT"; content?: string; preview?: boolean }[]) {
    const course = C[courseSlug];
    const existing = await prisma.courseModule.findFirst({ where: { courseId: course.id, titleBn } });
    if (existing) return;
    const count = await prisma.courseModule.count({ where: { courseId: course.id } });
    const mod = await prisma.courseModule.create({ data: { courseId: course.id, titleBn, order: count + 1 } });
    let li = 0;
    for (const l of lessons) {
      li += 1;
      const existingLesson = await prisma.lesson.findFirst({
        where: { moduleId: mod.id, titleBn: l.titleBn },
      });
      if (existingLesson) continue;
      await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          titleBn: l.titleBn,
          type: l.type,
          contentBn: l.content ?? null,
          order: li,
          isPreview: l.preview ?? false,
          isPublished: true,
        },
      });
    }
  }

  await addModule("quran-tajweed-dakhil-9-10", "অধ্যায় ১: সূরা বর্ণনা ও তাজবীদ ভিত্তি", [
    { titleBn: "কোর্স পরিচিতি ও পাঠ্যসূচি", type: "VIDEO", preview: true, content: "কোর্সের মূল কাঠামো, কীভাবে পড়াশোনা চালিয়ে যেতে হবে এবং বোর্ড পরীক্ষার প্রশ্ন-প্যাটার্ন পরিচিতি।" },
    { titleBn: "তাজবীদ কী ও কেন জরুরি", type: "VIDEO", content: "লাহন, মাখরাজ ও তাজবীদের প্রয়োজনীয়তার ভিত্তি।" },
    { titleBn: "মাখরাজ — উচ্চারণস্থান পরিচিতি", type: "VIDEO" },
    { titleBn: "অধ্যায় ১: নোট ও মূল পয়েন্ট", type: "DOCUMENT" },
    { titleBn: "অধ্যায় ১: MCQ প্র্যাকটিস", type: "TEXT", content: "এই পাঠে অধ্যায় ১-এর ১০টি MCQ প্রশ্ন রয়েছে — পরীক্ষা ট্যাব থেকে চ্যাপ্টার টেস্ট দিন।" },
  ]);
  await addModule("quran-tajweed-dakhil-9-10", "অধ্যায় ২: সূরাতুল ফাতিহা ও বাকারার নির্বাচিত অংশ", [
    { titleBn: "সূরা ফাতিহার তাজবীদ বিশ্লেষণ", type: "VIDEO" },
    { titleBn: "আয়াতুল কুরসি — উচ্চারণ ও অর্থ", type: "VIDEO", preview: true },
    { titleBn: "বোর্ড প্রশ্ন-ব্যাংক বিশ্লেষণ", type: "VIDEO" },
    { titleBn: "অধ্যায় ২: নোট", type: "DOCUMENT" },
  ]);
  await addModule("hadith-dakhil-9-10", "অধ্যায় ১: হাদিসের ভিত্তি", [
    { titleBn: "হাদিস ও সুন্নাহ — ভূমিকা", type: "VIDEO", preview: true },
    { titleBn: "প্রসিদ্ধ ১০ হাদিস — ব্যাখ্যা (১ম পর্ব)", type: "VIDEO" },
    { titleBn: "বোর্ড প্রশ্ন বিশ্লেষণ", type: "VIDEO" },
    { titleBn: "অধ্যায় ১: নোট", type: "DOCUMENT" },
  ]);
  await addModule("math-dakhil-9-10", "অধ্যায় ১: বীজগণিতীয় রাশি", [
    { titleBn: "সূচক ও লগারিদমের ভিত্তি", type: "VIDEO", preview: true },
    { titleBn: "বীজগাণিতিক বর্গ ও ঘন সূত্রের প্রয়োগ", type: "VIDEO" },
    { titleBn: "বোর্ড সমস্যা সমাধান (ধাপে ধাপে)", type: "VIDEO" },
    { titleBn: "অধ্যায় ১: সূত্র-পত্র ও নোট", type: "DOCUMENT" },
  ]);
  await addModule("math-dakhil-9-10", "অধ্যায় ২: সমীকরণ ও সমীকরণ সমাধান", [
    { titleBn: "একঘাত সমীকরণ", type: "VIDEO" },
    { titleBn: "দ্বিঘাত সমীকরণ — সূত্র পদ্ধতি", type: "VIDEO" },
    { titleBn: "সমীকরণের প্রয়োগ (শব্দ-সমস্যা)", type: "VIDEO" },
    { titleBn: "অধ্যায় ২: নোট", type: "DOCUMENT" },
  ]);
  await addModule("bangla-dakhil-9-10", "অধ্যায় ১: গল্প ও কবিতা", [
    { titleBn: "পাঠ্য গল্পের মূল্যায়ন-কৌশল", type: "VIDEO", preview: true },
    { titleBn: "কবিতার ভাব-সম্প্রসারণ লেখার পদ্ধতি", type: "VIDEO" },
    { titleBn: "অধ্যায় ১: নোট", type: "DOCUMENT" },
  ]);
  await addModule("quran-alim-11-12", "অধ্যায় ১: তাফসিরের ভিত্তি", [
    { titleBn: "আলিম কুরআন সিলেবাস ও তাফসির পদ্ধতি", type: "VIDEO", preview: true },
    { titleBn: "নির্বাচিত আয়াতসমূহের তাফসির (১ম পর্ব)", type: "VIDEO" },
    { titleBn: "উচ্চতর তাজবীদ — গুন্নাহ ও ইখফা", type: "VIDEO" },
    { titleBn: "অধ্যায় ১: নোট", type: "DOCUMENT" },
  ]);
  await addModule("arabic-alim-11-12", "অধ্যায় ১: নাহভ ও সারফ", [
    { titleBn: "জুমলার প্রকারভেদ", type: "VIDEO", preview: true },
    { titleBn: "ইসম-এর ইরাব", type: "VIDEO" },
    { titleBn: "সাহিত্য বিশ্লেষণ পরিচিতি", type: "VIDEO" },
    { titleBn: "অধ্যায় ১: নোট", type: "DOCUMENT" },
  ]);
  for (const course of allCourses) {
    const count = await prisma.lesson.count({ where: { module: { courseId: course.id } } });
    await prisma.course.update({ where: { id: course.id }, data: { durationMinutes: count * 12 } });
  }

  // ── Attach sample media assets (generated by scripts/generate-media.ts) ─
  // One VideoAsset/DocumentAsset row per lesson (one-to-one). The storage
  // files are shared sample renders; each lesson gets its own asset row so
  // tokens/scoping stay per-lesson.
  console.log("Attaching media assets…");
  const lessonsAll = await prisma.lesson.findMany({ orderBy: { order: "asc" }, include: { module: true } });
  let vi = 0, di = 0;
  for (const lesson of lessonsAll) {
    if (lesson.type === "VIDEO" && !lesson.videoAssetId) {
      vi += 1;
      const asset = await prisma.videoAsset.create({
        data: {
          provider: "LOCAL_HLS",
          storagePath: `videos/sample-${(vi % 3) + 1}/master.m3u8`,
          status: "READY",
          durationSeconds: 30,
          sizeBytes: 0,
        },
      });
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { videoAssetId: asset.id, durationSeconds: 30 },
      });
    } else if (lesson.type === "DOCUMENT" && !lesson.documentAssetId) {
      di += 1;
      const asset = await prisma.documentAsset.create({
        data: {
          storagePath: `documents/sample-${(di % 3) + 1}.pdf`,
          status: "READY",
          pageCount: 3,
          sizeBytes: 0,
        },
      });
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { documentAssetId: asset.id },
      });
    }
  }

  // ── Questions & exams ─────────────────────────────────────────────────
  const quranSubject = subjects["quran-tajweed"];
  const mathSubject = subjects["math"];
  const questionSeed = [
    { subjectId: quranSubject.id, level: "DAKHIL" as const, chapterBn: "তাজবীদ ভিত্তি", stemBn: "তাজবীদের পরিভাষায় মাখরাজ কী?", optionsBn: ["উচ্চারণের স্থান", "শব্দের দৈর্ঘ্য", "সুরের নিয়ম", "বিরতির স্থান"], correctIndex: 0, explanationBn: "মাখরাজ অর্থ হলো অক্ষর উচ্চারণের স্থান।", difficulty: "EASY" as const },
    { subjectId: quranSubject.id, level: "DAKHIL" as const, chapterBn: "তাজবীদ ভিত্তি", stemBn: "সূরা ফাতিহায় কতটি আয়াত রয়েছে?", optionsBn: ["৫টি", "৬টি", "৭টি", "৮টি"], correctIndex: 2, explanationBn: "সূরা ফাতিহা সাত আয়াতের সূরা।", difficulty: "EASY" as const },
    { subjectId: quranSubject.id, level: "DAKHIL" as const, chapterBn: "তাজবীদ ভিত্তি", stemBn: "'গুন্নাহ' কোন হরফের বৈশিষ্ট্য?", optionsBn: ["বা, ম", "ন, ম", "নূন ও মীম", "কাফ ও লাম"], correctIndex: 2, explanationBn: "নূন ও মীম সাকিনায় গুন্নাহ হয়।", difficulty: "MEDIUM" as const },
    { subjectId: mathSubject.id, level: "DAKHIL" as const, chapterBn: "বীজগণিতীয় রাশি", stemBn: "x² − 9 কে উৎপাদকে বিশ্লেষণ করলে কী হবে?", optionsBn: ["(x−3)(x+3)", "(x−3)²", "(x+3)²", "x(x−9)"], correctIndex: 0, explanationBn: "a²−b² = (a−b)(a+b) সূত্রে x²−9 = (x−3)(x+3)।", difficulty: "EASY" as const },
    { subjectId: mathSubject.id, level: "DAKHIL" as const, chapterBn: "সমীকরণ", stemBn: "2x + 6 = 20 হলে x-এর মান কত?", optionsBn: ["5", "6", "7", "8"], correctIndex: 2, explanationBn: "2x = 14 → x = 7।", difficulty: "EASY" as const },
    { subjectId: mathSubject.id, level: "DAKHIL" as const, chapterBn: "সমীকরণ", stemBn: "x² − 5x + 6 = 0 সমীকরণের মূল দুটি কত?", optionsBn: ["2 ও 3", "−2 ও −3", "1 ও 6", "−1 ও −6"], correctIndex: 0, explanationBn: "(x−2)(x−3)=0 → x=2, 3।", difficulty: "MEDIUM" as const },
  ];
  for (const q of questionSeed) {
    const exists = await prisma.question.findFirst({ where: { stemBn: q.stemBn } });
    if (!exists) await prisma.question.create({ data: q });
  }

  const quranCourse = C["quran-tajweed-dakhil-9-10"];
  const mathCourse = C["math-dakhil-9-10"];
  const examSeed = [
    { courseId: quranCourse.id, subjectId: quranSubject.id, titleBn: "তাজবীদ ভিত্তি — চ্যাপ্টার টেস্ট", type: "CHAPTER_TEST" as const, durationMinutes: 10, passMarks: 4, chapterBn: "তাজবীদ ভিত্তি" },
    { courseId: mathCourse.id, subjectId: mathSubject.id, titleBn: "বীজগণিত — প্র্যাকটিস পরীক্ষা", type: "MCQ_PRACTICE" as const, durationMinutes: 12, passMarks: 3, chapterBn: "বীজগণিতীয় রাশি" },
  ];
  for (const e of examSeed) {
    const exists = await prisma.exam.findFirst({ where: { titleBn: e.titleBn } });
    if (exists) continue;
    const qs = await prisma.question.findMany({
      where: { subjectId: e.subjectId, level: "DAKHIL", isActive: true },
      take: 6,
    });
    const exam = await prisma.exam.create({
      data: {
        courseId: e.courseId,
        subjectId: e.subjectId,
        titleBn: e.titleBn,
        description: "বোর্ড প্যাটার্নের MCQ — সময় মেনে চেষ্টা করুন।",
        type: e.type,
        chapterBn: e.chapterBn,
        durationMinutes: e.durationMinutes,
        totalMarks: qs.length,
        passMarks: e.passMarks,
        maxAttempts: 3,
        isPublished: true,
      },
    });
    let i = 0;
    for (const q of qs) {
      await prisma.examQuestion.create({ data: { examId: exam.id, questionId: q.id, order: ++i, marks: 1 } });
    }
  }

  // ── Site content ──────────────────────────────────────────────────────
  const testimonialSeed = [
    { nameBn: "সায়মা আক্তার", nameEn: "Sayma Akter", roleBn: "দাখিল ২০২৫ · রাজশাহী", quoteBn: "তাজবীদের ক্লাসগুলো এত সহজভাবে বোঝানো হয়েছে যে ক্লাসরুমে যা বুঝিনি, এখানে এক পাঠেই পরিষ্কার হয়ে গেছে। রেজাল্টে কুরআনে আমি জিপিএ ৫ পেয়েছি।", rating: 5, order: 1 },
    { nameBn: "আবু বকর সিদ্দিক", nameEn: "Abu Bakr Siddik", roleBn: "আলিম ২০২৫ · চট্টগ্রাম", quoteBn: "গণিতের 'ফিয়ার ফ্রি' কোর্সটি আমার জীবন বদলে দিয়েছে। ধাপে ধাপে সমাধান দেখে দেখে প্র্যাকটিস করে গণিতে বাদ থেকে যাওয়ার ভয় এখন আর নেই।", rating: 5, order: 2 },
    { nameBn: "ফাতিমা খাতুন", nameEn: "Fatima Khatun", roleBn: "দাখিল ২০২৪ · বরিশাল", quoteBn: "মোবাইলে যেকোনো সময় ক্লাস দেখা যায়, নোটগুলোও গোছানো। বাসার সবাই বোনের পড়া দেখতে দেখতে আমার অ্যাকাউন্ট চেয়ে নেওয়ার চেষ্টা করেছিল — ডিভাইস লিমিট থাকায় নিরাপদও লাগে।", rating: 5, order: 3 },
  ];
  for (const t of testimonialSeed) {
    const exists = await prisma.testimonial.findFirst({ where: { nameBn: t.nameBn } });
    if (!exists) await prisma.testimonial.create({ data: t });
  }

  const faqSeed = [
    { questionBn: "কোর্স কেনার পর কীভাবে অ্যাক্সেস পাব?", answerBn: "পেমেন্ট সার্ভারে যাচাই হওয়ার সাথে সাথে এনরোলমেন্ট চালু হয় এবং ড্যাশবোর্ডে কোর্স দেখা যায়। ম্যানুয়াল পেমেন্টে যাচাইয়ে সাধারণত ২৪ ঘণ্টা পর্যন্ত সময় লাগতে পারে।", category: "payment", order: 1 },
    { questionBn: "কোন কোন পেমেন্ট মাধ্যম সাপোর্ট করে?", answerBn: "বিকাশ ও নগদে Send Money করে TrxID জমা দিতে পারেন (ম্যানুয়াল যাচাই)। বিকাশ টোকেনাইজড চেকআউট ও SSLCommerz সেটআপ হলে সরাসরি গেটওয়ে পেমেন্টও চালু হবে।", category: "payment", order: 2 },
    { questionBn: "ভিডিও ডাউনলোড করা যাবে কি?", answerBn: "না। কোর্স ভিডিও ও নোট শুধু লগইন করা এনরোল্ড শিক্ষার্থী প্ল্যাটফর্মে দেখতে পারেন। ভিডিওতে আপনার নাম ও সেশন শনাক্তকারী ওয়াটারমার্ক থাকে — শেয়ার করলে সূত্র ধরা যায়।", category: "security", order: 3 },
    { questionBn: "কতগুলো ডিভাইসে ব্যবহার করা যায়?", answerBn: "সর্বোচ্চ ৩টি ডিভাইসে লগইন থাকতে পারে এবং একসাথে ২টি ভিডিও চলতে পারে। সেটিংসে যেকোনো ডিভাইস নিজে সরিয়ে ফেলতে পারেন।", category: "security", order: 4 },
    { questionBn: "পরীক্ষার রেজাল্ট কি বোর্ডের মতো?", answerBn: "আমাদের প্র্যাকটিস ও মডেল টেস্ট শিক্ষামূলক মূল্যায়ন — বোর্ড পরীক্ষার প্রশ্ন-প্যাটার্ন অনুসরণ করে, কিন্তু বোর্ডের ফলাফলের প্রতিশ্রুতি নয়।", category: "general", order: 5 },
    { questionBn: "রিফান্ড পাওয়া যাবে?", answerBn: "এনরোলমেন্টের ৭ দিনের মধ্যে এবং মোট পাঠের ২০%-এর কম দেখা থাকলে রিফান্ডের আবেদন করা যায়। শর্তাবলি দেখুন।", category: "payment", order: 6 },
  ];
  for (const f of faqSeed) {
    const exists = await prisma.faq.findFirst({ where: { questionBn: f.questionBn } });
    if (!exists) await prisma.faq.create({ data: f });
  }

  // ── Demo students ─────────────────────────────────────────────────────
  const studentSeed = [
    { name: "সায়মা আক্তার", email: "sayma@example.com", level: "DAKHIL" as const, classNumber: 10, enroll: ["quran-tajweed-dakhil-9-10", "bangla-dakhil-9-10"] },
    { name: "আবু বকর সিদ্দিক", email: "abubakr@example.com", level: "ALIM" as const, classNumber: 12, enroll: ["quran-alim-11-12", "arabic-alim-11-12"] },
    { name: "ফাতিমা খাতুন", email: "fatima@example.com", level: "DAKHIL" as const, classNumber: 10, enroll: ["math-dakhil-9-10", "quran-tajweed-dakhil-9-10"] },
    { name: "উমর ফারুক", email: "umar@example.com", level: "DAKHIL" as const, classNumber: 9, enroll: ["math-dakhil-9-10"] },
  ];
  for (const s of studentSeed) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (existing) continue;
    const user = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash: await hashPassword("Student#2026"),
        role: "STUDENT",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        studentProfile: { create: { level: s.level, classNumber: s.classNumber } },
      },
    });
    for (const slug of s.enroll) {
      const course = C[slug];
      await prisma.enrollment.create({
        data: { userId: user.id, courseId: course.id, status: "ACTIVE", source: "PAYMENT" },
      });
      await prisma.payment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          amountPaisa: (course.discountPaisa ?? course.pricePaisa),
          method: "MANUAL",
          status: "PAID",
          senderNumber: "01712345678",
          manualTxnId: `SEED${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          verifiedAt: new Date(),
          verifiedBy: paymentManager.id,
          invoiceNo: `MN-SEED-${Math.floor(Math.random() * 900000 + 100000)}`,
        },
      });
    }
  }

  // ── Coupons ───────────────────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: "WELCOME15" },
    update: {},
    create: {
      code: "WELCOME15",
      type: "PERCENT",
      value: 15,
      maxRedemptions: 500,
      isActive: true,
      createdBy: superAdmin.id,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "EID200" },
    update: {},
    create: {
      code: "EID200",
      type: "FIXED_PAISA",
      value: 20000, // ৳200 off
      minAmountPaisa: 90000,
      endsAt: new Date(Date.now() + 30 * 24 * 3600_000),
      isActive: true,
      createdBy: superAdmin.id,
    },
  });

  // ── Announcements ─────────────────────────────────────────────────────
  const annCount = await prisma.announcement.count();
  if (annCount === 0) {
    await prisma.announcement.create({
      data: {
        titleBn: "নতুন সেশনে স্বাগতম ২০২৬!",
        bodyBn: "দাখিল ও আলিম ২০২৬ সেশনের সম্পূর্ণ কোর্স প্রকাশিত হয়েছে। WELCOME15 কুপনে ১৫% ডিসকাউন্ট চলছে।",
        isPublished: true,
        createdBy: superAdmin.id,
      },
    });
  }

  console.log("Seed complete ✓");
  console.log("  Admin: admin@madrnext.app / Admin#2026Secure");
  console.log("  Payment manager: payments@madrnext.app / Payment#2026");
  console.log("  Course manager: courses@madrnext.app / Course#2026");
  console.log("  Student demo: sayma@example.com / Student#2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

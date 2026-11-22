"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, newOpaqueToken, passwordStrengthIssues, sha256 } from "@/lib/auth/password";
import { createSession, destroyCurrentSession, getAuthContext, revokeAllSessions } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { audit } from "@/lib/audit";
import { notify, sendEmailStub } from "@/lib/notify";
import { classifyUserAgent } from "@/lib/device";
import { z } from "zod";

export interface FormState {
  error?: string;
  success?: string;
}

function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষর হতে হবে").max(80),
  email: z.string().trim().email("সঠিক ইমেইল দিন").toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর"),
  level: z.enum(["DAKHIL", "ALIM", "GENERAL"]).default("DAKHIL"),
  classNumber: z.coerce.number().int().min(9).max(12).default(9),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const h = await headers();
  const ip = clientIp(h);
  const rl = rateLimit(`register:${ip}`, 6, 3600);
  if (!rl.ok) return { error: `অনেকবার চেষ্টা হয়েছে। ${rl.retryAfterSec} সেকেন্ড পরে আবার চেষ্টা করুন।` };

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    level: formData.get("level") || "DAKHIL",
    classNumber: formData.get("classNumber") || 9,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ফর্ম পূরণ করুন" };
  }
  const { name, email, phone, password, level, classNumber } = parsed.data;

  const strength = passwordStrengthIssues(password);
  if (strength.length) return { error: strength.join("; ") };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    select: { id: true },
  });
  if (existing) return { error: "এই ইমেইল বা মোবাইল নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।" };

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone ?? null,
      passwordHash: await hashPassword(password),
      role: "STUDENT",
      status: "ACTIVE",
      studentProfile: {
        create: { level, classNumber },
      },
    },
  });

  // Email verification code (hashed at rest). Without SMTP, the code is
  // written to the server console (dev mode).
  if (email) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        channel: "EMAIL",
        purpose: "ACCOUNT_VERIFICATION",
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });
    await sendEmailStub(user.id, "ভেরিফিকেশন কোড", `আপনার MadrNext ভেরিফিকেশন কোড: ${code}`);
  }

  await prisma.loginHistory.create({
    data: { userId: user.id, email, success: true, reason: "REGISTERED", ip, userAgent: h.get("user-agent")?.slice(0, 250) },
  });
  await notify({
    userId: user.id,
    type: "SYSTEM",
    titleBn: "MadrNext-এ স্বাগতম!",
    bodyBn: "আপনার অ্যাকাউন্ট তৈরি হয়েছে। ফ্রি প্রিভিউ পাঠ থেকে শেখা শুরু করুন।",
    linkUrl: "/courses",
  });

  await createSession(user.id);
  redirect("/learn");
}

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "ইমেইল বা মোবাইল দিন"),
  password: z.string().min(1, "পাসওয়ার্ড দিন"),
});

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const h = await headers();
  const ip = clientIp(h);
  const ua = h.get("user-agent");
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();

  const rl = rateLimit(`login:ip:${ip}`, 20, 900);
  if (!rl.ok) return { error: `অনেকবার চেষ্টা হয়েছে। ${Math.ceil(rl.retryAfterSec / 60)} মিনিট পরে চেষ্টা করুন।` };
  const rlUser = rateLimit(`login:id:${identifier}`, 8, 900);
  if (!rlUser.ok) return { error: "এই অ্যাকাউন্টে বারবার ভুল চেষ্টা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।" };

  const parsed = loginSchema.safeParse({ identifier, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });

  const failLog = async (userId: string | null, reason: string) => {
    await prisma.loginHistory.create({
      data: { userId, email: identifier, success: false, reason, ip, userAgent: ua?.slice(0, 250) },
    });
  };

  if (!user) {
    await failLog(null, "UNKNOWN_ACCOUNT");
    return { error: "ইমেইল/মোবাইল বা পাসওয়ার্ড সঠিক নয়।" };
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    await failLog(user.id, "BAD_PASSWORD");
    return { error: "ইমেইল/মোবাইল বা পাসওয়ার্ড সঠিক নয়।" };
  }
  if (user.status === "SUSPENDED") {
    await failLog(user.id, "SUSPENDED");
    return { error: "আপনার অ্যাকাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।" };
  }

  // New device alert (transparent UA classification — no fingerprinting)
  const deviceKey = sha256(`${user.id}:${classifyUserAgent(ua).browser}:${classifyUserAgent(ua).os}`);
  const knownDevice = await prisma.deviceTrust.findUnique({
    where: { userId_deviceKey: { userId: user.id, deviceKey } },
  });
  await prisma.loginHistory.create({
    data: { userId: user.id, email: identifier, success: true, reason: "OK", ip, userAgent: ua?.slice(0, 250) },
  });
  if (!knownDevice && user.role === "STUDENT") {
    await notify({
      userId: user.id,
      type: "SECURITY_ALERT",
      titleBn: "নতুন ডিভাইসে লগইন",
      bodyBn: `${classifyUserAgent(ua).label} ডিভাইস থেকে আপনার অ্যাকাউন্টে লগইন হয়েছে। যদি এটি আপনি না হন, সাথে সাথে সব ডিভাইস থেকে লগআউট করুন।`,
      linkUrl: "/learn/settings/devices",
    });
  }

  await createSession(user.id);
  redirect("/learn");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession("LOGOUT");
  redirect("/");
}

export async function logoutAllAction(): Promise<void> {
  const ctx = await getAuthContext();
  if (ctx) {
    const count = await revokeAllSessions(ctx.user.id, "LOGOUT_ALL");
    await audit({
      actorId: ctx.user.id,
      action: "LOGOUT_ALL_DEVICES",
      entityType: "User",
      entityId: ctx.user.id,
      metadata: { revoked: count },
    });
  }
  redirect("/login");
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const h = await headers();
  const ip = clientIp(h);
  const rl = rateLimit(`pwreset:${ip}`, 5, 3600);
  if (!rl.ok) return { error: "অনেকবার চেষ্টা হয়েছে। পরে আবার চেষ্টা করুন।" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "ইমেইল দিন" };

  const user = await prisma.user.findUnique({ where: { email } });
  // Always report success to prevent account enumeration.
  const message = "যদি এই ইমেইলে অ্যাকাউন্ট থাকে, রিসেট নির্দেশনা পাঠানো হয়েছে। ইনবক্স (এবং স্প্যাম) দেখুন।";
  if (!user) return { success: message };

  const token = newOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    },
  });
  const resetUrl = `/reset-password?token=${token.raw}`;
  // Dev mode (no SMTP): the reset link is printed to the server console.
  await sendEmailStub(user.id, "পাসওয়ার্ড রিসেট", `রিসেট লিংক: ${resetUrl}`);
  await audit({ action: "PASSWORD_RESET_REQUESTED", entityType: "User", entityId: user.id, ip });
  return { success: message };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const h = await headers();
  const rl = rateLimit(`pwset:${clientIp(h)}`, 10, 3600);
  if (!rl.ok) return { error: "অনেকবার চেষ্টা হয়েছে। পরে আবার চেষ্টা করুন।" };

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { error: "দুটি পাসওয়ার্ড মিলছে না।" };
  const strength = passwordStrengthIssues(password);
  if (strength.length) return { error: strength.join("; ") };
  if (!token) return { error: "রিসেট টোকেন পাওয়া যায়নি।" };

  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return { error: "লিংকটি সঠিক নয় বা মেয়াদ শেষ। আবার রিসেট লিংক নিন।" };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    // Password change invalidates every existing session.
    prisma.session.updateMany({
      where: { userId: rec.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "PASSWORD_RESET" },
    }),
  ]);
  await notify({
    userId: rec.userId,
    type: "SECURITY_ALERT",
    titleBn: "পাসওয়ার্ড পরিবর্তন হয়েছে",
    bodyBn: "আপনার পাসওয়ার্ড পরিবর্তনের কারণে সব ডিভাইস থেকে লগআউট করা হয়েছে।",
  });
  await audit({ action: "PASSWORD_RESET_COMPLETED", entityType: "User", entityId: rec.userId });
  return { success: "পাসওয়ার্ড পরিবর্তন হয়েছে। এখন লগইন করুন।" };
}

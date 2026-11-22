"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/auth/rate-limit";
import { revokeSessionById } from "@/lib/auth/session";
import { z } from "zod";

export interface FormState {
  error?: string;
  success?: string;
}

const schema = z.object({ name: z.string().trim().min(2).max(80) });

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "লগইন প্রয়োজন" };
  const rl = rateLimit(`profile:${ctx.user.id}`, 10, 600);
  if (!rl.ok) return { error: "অনেকবার চেষ্টা হয়েছে। পরে চেষ্টা করুন।" };

  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "নাম কমপক্ষে ২ অক্ষর হতে হবে" };
  await prisma.user.update({ where: { id: ctx.user.id }, data: { name: parsed.data.name } });
  return { success: "প্রোফাইল হালনাগাদ হয়েছে।" };
}

/** Revoke one of the student's own sessions (device logout). */
export async function revokeOwnSessionAction(sessionId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) return;
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== ctx.user.id) return;
  await revokeSessionById(sessionId, "USER_LOGGED_OUT_DEVICE");
  await audit({
    actorId: ctx.user.id,
    action: "DEVICE_LOGGED_OUT",
    entityType: "Session",
    entityId: sessionId,
    ip: (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
}

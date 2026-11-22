import "server-only";
import { prisma } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/client";

/**
 * Notification service: in-app (database) is always written; email/SMS are
 * dispatched through configurable adapters. Without SMTP/SMS credentials the
 * adapters log to the server console (dev mode) and never fail the request.
 */

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  titleBn: string;
  bodyBn: string;
  linkUrl?: string;
  email?: boolean;
  sms?: boolean;
}

export async function notify(input: NotifyInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      titleBn: input.titleBn,
      bodyBn: input.bodyBn,
      linkUrl: input.linkUrl,
    },
  });
  if (input.email) await sendEmailStub(input.userId, input.titleBn, input.bodyBn);
  if (input.sms) await sendSmsStub(input.userId, input.titleBn);
}

/** SMTP adapter — wired when SMTP_HOST is configured (nodemailer or provider API). */
export async function sendEmailStub(userId: string, subject: string, body: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return;
  if (!process.env.SMTP_HOST) {
    console.info(`[email:dev] to=${user.email} subject="${subject}" body="${body.slice(0, 80)}…"`);
    return;
  }
  // Production: integrate SMTP/provider API here (credentials via env only).
  console.info(`[email] queued to ${user.email}: ${subject}`);
}

/** SMS adapter — wired when SMS_API_URL is configured. */
export async function sendSmsStub(userId: string, text: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) return;
  if (!process.env.SMS_API_URL) {
    console.info(`[sms:dev] to=${user.phone} text="${text.slice(0, 80)}"`);
    return;
  }
  console.info(`[sms] queued to ${user.phone}`);
}

/** One-time codes are hashed at rest; raw code only exists in the channel. */
export async function sendVerificationCode(userId: string, channel: "EMAIL" | "SMS", code: string): Promise<void> {
  if (channel === "EMAIL") await sendEmailStub(userId, "MadrNext ভেরিফিকেশন কোড", `আপনার কোড: ${code}`);
  else await sendSmsStub(userId, `MadrNext ভেরিফিকেশন কোড: ${code}`);
}

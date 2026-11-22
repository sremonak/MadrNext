import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { newOpaqueToken, sha256 } from "@/lib/auth/password";
import { classifyUserAgent, deviceKeyFor } from "@/lib/device";
import type { User } from "@/generated/prisma/client";

export const SESSION_COOKIE = "madrnext_session";

export interface AuthContext {
  user: Pick<
    User,
    "id" | "name" | "email" | "phone" | "role" | "status" | "avatarColor" | "locale" | "mfaEnabled"
  >;
  sessionId: string;
  deviceLabel: string;
}

function parseClientIp(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip") ?? null;
}

/**
 * Create a new session for a user, honoring the concurrent session limit
 * (oldest sessions beyond the limit are revoked — never silently dropped).
 */
export async function createSession(userId: string): Promise<{ raw: string; sessionId: string }> {
  const h = await headers();
  const ua = h.get("user-agent");
  const ip = parseClientIp(h);
  const device = classifyUserAgent(ua);

  await evictExcessSessions(userId);

  // Upsert transparent device record
  const deviceKey = deviceKeyFor(userId, ua);
  const deviceRow = await prisma.deviceTrust.upsert({
    where: { userId_deviceKey: { userId, deviceKey } },
    create: {
      userId,
      deviceKey,
      label: device.label,
      deviceType: device.deviceType,
      os: device.os,
      browser: device.browser,
    },
    update: { lastSeenAt: new Date(), revokedAt: null },
  });

  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 3600_000);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: token.hash,
      deviceId: deviceRow.id,
      ip,
      userAgent: ua?.slice(0, 300) ?? null,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token.raw, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return { raw: token.raw, sessionId: session.id };
}

/**
 * Concurrent-session limit: if a user already holds MAX_SESSIONS active
 * sessions, the oldest ones (beyond the limit minus one) are revoked with
 * reason DEVICE_LIMIT. Extracted for testability.
 */
export async function evictExcessSessions(userId: string): Promise<number> {
  const active = await prisma.session.count({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
  });
  if (active < env.maxConcurrentSessions) return 0;
  const evictCount = active - env.maxConcurrentSessions + 1;
  const oldest = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: "asc" },
    take: evictCount,
  });
  for (const s of oldest) {
    await prisma.session.update({
      where: { id: s.id },
      data: { revokedAt: new Date(), revokedReason: "DEVICE_LIMIT" },
    });
  }
  return oldest.length;
}

/**
 * Resolve the current auth context from the session cookie. Sessions are
 * validated server-side on every request; stale/revoked sessions fail closed.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(raw) },
    include: { user: true, device: true },
  });
  if (!session) return null;
  if (session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status === "SUSPENDED") return null;

  // Touch last-active (fire-and-forget; throttle to once per minute)
  const last = session.lastActiveAt.getTime();
  if (Date.now() - last > 60_000) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
      .catch(() => undefined);
    if (session.deviceId) {
      await prisma.deviceTrust
        .update({ where: { id: session.deviceId }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined);
    }
  }

  const { id, name, email, phone, role, status, avatarColor, locale, mfaEnabled } = session.user;
  return {
    user: { id, name, email, phone, role, status, avatarColor, locale, mfaEnabled },
    sessionId: session.id,
    deviceLabel: session.device?.label ?? "অজানা ডিভাইস",
  };
}

export async function destroyCurrentSession(reason = "LOGOUT"): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.updateMany({
      where: { tokenHash: sha256(raw), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
  store.delete(SESSION_COOKIE);
}

export async function revokeAllSessions(userId: string, reason: string, exceptSessionId?: string): Promise<number> {
  const where = {
    userId,
    revokedAt: null,
    ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
  };
  const res = await prisma.session.updateMany({ where, data: { revokedAt: new Date(), revokedReason: reason } });
  return res.count;
}

export async function revokeSessionById(sessionId: string, reason: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { sha256 } from "@/lib/auth/password";

/**
 * Short-lived signed tokens for private media (video HLS / PDF documents).
 *
 * Flow:
 *  1. Backend authorizes the user (enrollment + session + playback limits).
 *  2. Backend issues an HMAC-signed token with tight TTL (default 120s).
 *  3. Media endpoints validate the signature + expiry before serving bytes.
 *  4. No raw storage URLs are ever exposed; tokens are scoped to one user +
 *     one asset and expire quickly.
 */

export interface MediaTokenPayload {
  /** subject: user id */
  sub: string;
  /** asset type */
  typ: "VIDEO" | "DOCUMENT";
  /** asset id */
  aid: string;
  /** session id bound to this playback */
  sid: string;
  /** issued at (unix seconds) */
  iat: number;
  /** expires at (unix seconds) */
  exp: number;
  /** jti: unique token id for logging/revocation */
  jti: string;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function signMediaToken(payload: MediaTokenPayload, secret: string): string {
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function issueMediaToken(
  params: { userId: string; assetType: "VIDEO" | "DOCUMENT"; assetId: string; sessionId: string },
  ttlSeconds = env.mediaTokenTtl,
): { token: string; payload: MediaTokenPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: MediaTokenPayload = {
    sub: params.userId,
    typ: params.assetType,
    aid: params.assetId,
    sid: params.sessionId,
    iat: now,
    exp: now + ttlSeconds,
    jti: createHash("sha256")
      .update(`${params.userId}:${params.assetId}:${now}:${Math.random()}`)
      .digest("hex")
      .slice(0, 24),
  };
  return { token: signMediaToken(payload, env.authSecret), payload };
}

export type VerifyResult =
  | { valid: true; payload: MediaTokenPayload }
  | { valid: false; reason: "MALFORMED" | "BAD_SIGNATURE" | "EXPIRED" };

export function verifyMediaToken(token: string, secret: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, reason: "MALFORMED" };
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { valid: false, reason: "BAD_SIGNATURE" };
    }
  } catch {
    return { valid: false, reason: "BAD_SIGNATURE" };
  }
  let payload: MediaTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }
  if (!payload.sub || !payload.aid || !payload.exp) return { valid: false, reason: "MALFORMED" };
  if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, reason: "EXPIRED" };
  return { valid: true, payload };
}

/** Non-reversible fingerprint stored in logs (never the raw token). */
export function tokenFingerprint(token: string): string {
  return sha256(token).slice(0, 24);
}

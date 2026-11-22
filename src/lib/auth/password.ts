import { createHash, createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: Buffer,
  N: number,
) => Promise<Buffer>;

/**
 * Password hashing with scrypt (OWASP-recommended parameters).
 * Never store plaintext. Format: scrypt$N$r$p$salt$hash (base64).
 */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password.normalize("NFKC"), salt, SCRYPT_N);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, n, , , saltB64, hashB64] = parts;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const derived = await scrypt(password.normalize("NFKC"), salt, parseInt(n, 10));
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function passwordStrengthIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("কমপক্ষে ৮ অক্ষর হতে হবে");
  if (!/[a-zA-Z]/.test(password) && !/[\u0980-\u09FF]/.test(password))
    issues.push("অন্তত একটি অক্ষর থাকতে হবে");
  if (!/[0-9]/.test(password)) issues.push("অন্তত একটি সংখ্যা থাকতে হবে");
  return issues;
}

/** Opaque token (raw) + sha256 hash (for DB storage). */
export function newOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: sha256(raw) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function hmacVerify(value: string, signature: string, secret: string): boolean {
  const expected = hmacSign(value, secret);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Constant-time string comparison for secrets of equal length. */
export function safeEqual(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

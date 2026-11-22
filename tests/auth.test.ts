import { describe, expect, it } from "vitest";
import {
  hashPassword,
  newOpaqueToken,
  passwordStrengthIssues,
  safeEqual,
  verifyPassword,
} from "../src/lib/auth/password";
import { classifyUserAgent, deviceKeyFor } from "../src/lib/device";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("Adarsha#Path2026");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Adarsha#Path2026", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Adarsha#Path2026");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a unique salt per hash", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("fails closed on malformed stored hash", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("password strength", () => {
  it("accepts a strong password", () => {
    expect(passwordStrengthIssues("Shudhu#Bhalo9")).toEqual([]);
  });
  it("rejects short / weak passwords with reasons", () => {
    expect(passwordStrengthIssues("12345678").length).toBeGreaterThan(0); // no letter
    expect(passwordStrengthIssues("abcdefgh").length).toBeGreaterThan(0); // no digit
    expect(passwordStrengthIssues("shudhu1").length).toBeGreaterThan(0); // too short
    expect(passwordStrengthIssues("alllowercase1")).toEqual([]); // current policy allows
  });
});

describe("opaque session tokens", () => {
  it("stores only the hash, raw differs", () => {
    const { raw, hash } = newOpaqueToken();
    expect(raw).not.toContain(hash);
    expect(raw.length).toBeGreaterThanOrEqual(40);
  });
  it("uses constant-time comparison", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("device classification", () => {
  it("classifies an android chrome UA", () => {
    const d = classifyUserAgent(
      "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
    );
    expect(d.os).toContain("Android");
    expect(d.deviceType).toBe("MOBILE");
  });
  it("keys devices deterministically per user+UA", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36";
    const k1 = deviceKeyFor("user-1", ua);
    const k2 = deviceKeyFor("user-1", ua);
    const k3 = deviceKeyFor("user-2", ua);
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
  });
  it("handles null UA safely", () => {
    expect(() => deviceKeyFor("user-1", null)).not.toThrow();
  });
});

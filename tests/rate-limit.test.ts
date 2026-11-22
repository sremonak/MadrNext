import { describe, expect, it } from "vitest";
import { pruneRateLimits, rateLimit, resetRateLimit } from "../src/lib/auth/rate-limit";

describe("login rate limiting", () => {
  it("allows up to the limit then blocks", () => {
    const key = `login:${Date.now()}`;
    resetRateLimit(key);
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60).ok).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window (prune)", () => {
    const key = `login:${Date.now()}-w`;
    resetRateLimit(key);
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 0);
    pruneRateLimits();
    expect(rateLimit(key, 5, 60).ok).toBe(true);
  });

  it("keys are independent", () => {
    const a = `login:a-${Date.now()}`;
    const b = `login:b-${Date.now()}`;
    for (let i = 0; i < 5; i++) rateLimit(a, 5, 60);
    expect(rateLimit(a, 5, 60).ok).toBe(false);
    expect(rateLimit(b, 5, 60).ok).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { hmacSign, hmacVerify, sha256 } from "../src/lib/auth/password";
import { issueMediaToken, verifyMediaToken, tokenFingerprint } from "../src/lib/media/tokens";
import { env } from "../src/lib/env";

const SECRET = "test-secret-for-vitest";

describe("media tokens (video/pdf authz)", () => {
  it("issues and verifies a round-trip token", () => {
    const { token, payload } = issueMediaToken({
      userId: "user-1", assetType: "VIDEO", assetId: "asset-1", sessionId: "ps-1",
    }, 60);
    const result = verifyMediaToken(token, env.authSecret);
    if (!result.valid) throw new Error("token should verify");
    expect(payload.sub).toBe("user-1");
    expect(result.payload.aid).toBe("asset-1");
    expect(result.payload.typ).toBe("VIDEO");
  });

  it("rejects an expired token", () => {
    const { token } = issueMediaToken(
      { userId: "user-1", assetType: "DOCUMENT", assetId: "asset-2", sessionId: "ps-1" },
      -1, // already expired
    );
    const result = verifyMediaToken(token, env.authSecret);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("EXPIRED");
  });

  it("rejects tampered payload (signature check)", () => {
    const { token } = issueMediaToken(
      { userId: "user-1", assetType: "VIDEO", assetId: "asset-1", sessionId: "ps-1" },
      60,
    );
    const [body, sig] = token.split(".");
    // swap user id inside payload, keep original signature
    const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), sub: "attacker" })).toString("base64url");
    const result = verifyMediaToken(`${tampered}.${sig}`, SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("BAD_SIGNATURE");
  });

  it("rejects tokens signed with a different secret", () => {
    const { token } = issueMediaToken(
      { userId: "user-1", assetType: "VIDEO", assetId: "asset-1", sessionId: "ps-1" },
      60,
    );
    expect(verifyMediaToken(token, "other-secret").valid).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyMediaToken("no-dots-here", env.authSecret).valid).toBe(false);
    expect(verifyMediaToken("a.b.c", env.authSecret).valid).toBe(false);
  });

  it("fingerprint never exposes the raw token", () => {
    const { token } = issueMediaToken(
      { userId: "user-1", assetType: "VIDEO", assetId: "asset-1", sessionId: "ps-1" },
      60,
    );
    const fp = tokenFingerprint(token);
    expect(fp).not.toBe(token);
    expect(token.includes(fp)).toBe(false);
    expect(fp).toBe(tokenFingerprint(token));
  });

  it("hmac helpers round-trip", () => {
    const sig = hmacSign("payload", env.authSecret);
    expect(hmacVerify("payload", sig, env.authSecret)).toBe(true);
    expect(hmacVerify("payload2", sig, env.authSecret)).toBe(false);
  });

  it("sha256 is deterministic", () => {
    expect(sha256("x")).toBe(sha256("x"));
    expect(sha256("x")).not.toBe(sha256("y"));
  });
});

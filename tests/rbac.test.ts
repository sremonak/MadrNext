import { describe, expect, it } from "vitest";
import { hasPermission, isStaff, requirePermission } from "../src/lib/auth/rbac";
import type { AuthContext } from "../src/lib/auth/session";
import type { Role } from "../src/generated/prisma/client";

function ctxWith(role: Role, status: "ACTIVE" | "SUSPENDED" = "ACTIVE"): AuthContext {
  return {
    user: {
      id: "u1", name: "Test", email: "t@t", phone: null, role, status,
      avatarColor: "teal", locale: "bn", mfaEnabled: false,
    },
    sessionId: "s1",
    deviceLabel: "টেস্ট",
  };
}

describe("rbac", () => {
  it("student has no permissions", () => {
    const ctx = ctxWith("STUDENT");
    expect(hasPermission(ctx, "students.view")).toBe(false);
    expect(hasPermission(ctx, "payments.approve")).toBe(false);
    expect(isStaff(ctx)).toBe(false);
  });

  it("super admin has every permission", () => {
    const ctx = ctxWith("SUPER_ADMIN");
    for (const p of ["students.manage", "courses.manage", "payments.approve", "audit.view", "settings.view", "anything.else"]) {
      expect(hasPermission(ctx, p)).toBe(true);
    }
  });

  it("payment manager approves payments but cannot manage courses", () => {
    const ctx = ctxWith("PAYMENT_MANAGER");
    expect(hasPermission(ctx, "payments.approve")).toBe(true);
    expect(hasPermission(ctx, "payments.export")).toBe(true);
    expect(hasPermission(ctx, "courses.manage")).toBe(false);
    expect(hasPermission(ctx, "sessions.revoke")).toBe(false);
  });

  it("course manager manages courses but cannot approve payments", () => {
    const ctx = ctxWith("COURSE_MANAGER");
    expect(hasPermission(ctx, "courses.manage")).toBe(true);
    expect(hasPermission(ctx, "payments.approve")).toBe(false);
    expect(hasPermission(ctx, "students.manage")).toBe(false);
  });

  it("support agent only views", () => {
    const ctx = ctxWith("SUPPORT_AGENT");
    expect(hasPermission(ctx, "students.view")).toBe(true);
    expect(hasPermission(ctx, "students.manage")).toBe(false);
    expect(hasPermission(ctx, "payments.approve")).toBe(false);
  });

  it("suspended staff loses everything", () => {
    const ctx = ctxWith("ADMIN", "SUSPENDED");
    expect(hasPermission(ctx, "students.manage")).toBe(false);
    expect(hasPermission(ctx, "audit.view")).toBe(false);
  });

  it("requirePermission throws with a Bangla message", () => {
    const ctx = ctxWith("STUDENT");
    expect(() => requirePermission(ctx, "courses.manage")).toThrow(/অনুমতি/);
  });
});

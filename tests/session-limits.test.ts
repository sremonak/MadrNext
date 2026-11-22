import { afterAll, describe, expect, it } from "vitest";
import { evictExcessSessions, revokeAllSessions, revokeSessionById } from "../src/lib/auth/session";
import { makeStudent, prisma, uniq } from "./helpers";

/**
 * Note: sessions are created directly in the DB (tokenHash = sha256(raw)).
 * Cookie issuance itself is exercised by the UI; the security-relevant logic
 * (limits, revocation, invalidation) is covered here against the same tables.
 */
describe("session limits & revocation", () => {
  const emails: string[] = [];

  it("device limit: evicts oldest sessions beyond the concurrent cap", async () => {
    const student = await makeStudent();
    if (student.email) emails.push(student.email);
    const limit = 3; // env.maxConcurrentSessions
    const raws: string[] = [];
    for (let i = 0; i < limit + 2; i++) {
      const raw = uniq(`raw-${i}`);
      raws.push(raw);
      await prisma.session.create({
        data: {
          userId: student.id,
          tokenHash: Buffer.from(raw).toString("base64url"),
          lastActiveAt: new Date(Date.now() - (limit + 2 - i) * 60_000), // increasing age
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    }
    const evicted = await evictExcessSessions(student.id);
    // Semantics: make room for the session about to be created → evicts
    // active − limit + 1, leaving limit − 1; adding the new one restores limit.
    expect(evicted).toBe(limit + 2 - limit + 1);
    const remaining = await prisma.session.findMany({
      where: { userId: student.id, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    expect(remaining.length).toBe(limit - 1);
    const reasons = await prisma.session.findMany({
      where: { userId: student.id, revokedReason: "DEVICE_LIMIT" },
    });
    expect(reasons.length).toBe(limit + 2 - limit + 1);
    // revoked ones carry the reason + timestamp
    expect(reasons.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it("logout-all revokes every active session with reason", async () => {
    const student = await makeStudent();
    if (student.email) emails.push(student.email);
    for (let i = 0; i < 3; i++) {
      await prisma.session.create({
        data: {
          userId: student.id,
          tokenHash: uniq(`all-${i}`),
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    }
    const count = await revokeAllSessions(student.id, "LOGOUT_ALL_DEVICES");
    expect(count).toBe(3);
    const active = await prisma.session.findFirst({
      where: { userId: student.id, revokedAt: null },
    });
    expect(active).toBeNull();
  });

  it("logout-all can keep the current session", async () => {
    const student = await makeStudent();
    if (student.email) emails.push(student.email);
    const keep = await prisma.session.create({
      data: { userId: student.id, tokenHash: uniq("keep"), expiresAt: new Date(Date.now() + 3600_000) },
    });
    await prisma.session.create({
      data: { userId: student.id, tokenHash: uniq("other"), expiresAt: new Date(Date.now() + 3600_000) },
    });
    const count = await revokeAllSessions(student.id, "PASSWORD_RESET", keep.id);
    expect(count).toBe(1);
    const kept = await prisma.session.findUnique({ where: { id: keep.id } });
    expect(kept?.revokedAt).toBeNull();
  });

  it("revoked or expired sessions fail closed at the data level", async () => {
    const student = await makeStudent();
    if (student.email) emails.push(student.email);
    const s = await prisma.session.create({
      data: { userId: student.id, tokenHash: uniq("revoke"), expiresAt: new Date(Date.now() + 3600_000) },
    });
    await revokeSessionById(s.id, "ADMIN_REVOKE");
    const row = await prisma.session.findUnique({ where: { id: s.id } });
    expect(row?.revokedAt).not.toBeNull();
    expect(row?.revokedReason).toBe("ADMIN_REVOKE");
    // the lookup contract getAuthContext uses: only non-revoked, non-expired rows
    const valid = await prisma.session.findFirst({
      where: { tokenHash: row!.tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    expect(valid).toBeNull();
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.deviceTrust.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.studentProfile.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });
});

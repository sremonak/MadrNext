import { afterAll, describe, expect, it } from "vitest";
import { verifyAuditChain } from "../src/lib/audit";
import { prisma, uniq } from "./helpers";

describe("audit hash chain", () => {
  it("verifies an intact chain", async () => {
    const tag = uniq("chain");
    const rows = Array.from({ length: 4 }, (_, i) => ({
      actorId: null as string | null,
      actorRole: "SUPER_ADMIN" as const,
      action: `TEST_${tag}_${i}`,
      entityType: "Test",
      entityId: tag,
      metadata: { i } as never,
    }));
    // append through the audit module so hashes chain correctly
    const { audit } = await import("../src/lib/audit");
    for (const r of rows) await audit(r as never);
    const verdict = await verifyAuditChain();
    expect(verdict.ok).toBe(true);
  });

  it("detects tampering of a stored row", async () => {
    const tag = uniq("tamper");
    const { audit } = await import("../src/lib/audit");
    await audit({
      actorId: null, actorRole: "SUPER_ADMIN", action: `T_${tag}`,
      entityType: "Test", entityId: tag, metadata: {} as never,
    });
    // mutate the stored row behind the chain's back
    await prisma.auditLog.updateMany({
      where: { action: `T_${tag}` },
      data: { action: `T_${tag}_HACKED` },
    });
    const verdict = await verifyAuditChain();
    expect(verdict.ok).toBe(false);
    // restore
    await prisma.auditLog.updateMany({
      where: { action: `T_${tag}_HACKED` },
      data: { action: `T_${tag}` },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityType: "Test", entityId: { contains: "chain" } } });
    await prisma.auditLog.deleteMany({ where: { action: { startsWith: "TEST_" } } });
    await prisma.auditLog.deleteMany({ where: { action: { startsWith: "T_" } } });
  });
});

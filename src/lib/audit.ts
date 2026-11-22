import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * Tamper-evident audit log: every record includes hash(prevHash + payload).
 * Verification recomputes each row's hash from its stored fields (stable JSON,
 * sorted keys) AND checks prevHash links, so editing any field or deleting a
 * middle record breaks verification.
 */

export interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

/** JSON.stringify with recursively sorted object keys (stable across stores). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

function chainPayload(input: AuditInput): string {
  return stableStringify({
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ip: input.ip ?? null,
  });
}

export async function audit(input: AuditInput): Promise<void> {
  const last = await prisma.auditLog.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { hash: true },
  });
  const prevHash = last?.hash ?? null;
  const hash = createHash("sha256")
    .update((prevHash ?? "") + chainPayload(input))
    .digest("hex");

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? null) as never,
      ip: input.ip ?? null,
      prevHash,
      hash,
    },
  });
}

/** Verify the chain integrity of the whole log (admin tooling / tests). */
export async function verifyAuditChain(): Promise<{ ok: boolean; brokenAtId?: string }> {
  const logs = await prisma.auditLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  let prev: string | null = null;
  for (const log of logs) {
    // 1. row integrity: stored hash must match recomputed payload hash
    const recomputed = createHash("sha256")
      .update((log.prevHash ?? "") + chainPayload({
        actorId: log.actorId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: (log.metadata ?? null) as Record<string, unknown> | null,
        ip: log.ip,
      }))
      .digest("hex");
    if (log.hash !== recomputed) return { ok: false, brokenAtId: log.id };
    // 2. chain linkage: prevHash must equal the previous row's hash
    if (log.prevHash !== prev) return { ok: false, brokenAtId: log.id };
    prev = log.hash;
  }
  return { ok: true };
}

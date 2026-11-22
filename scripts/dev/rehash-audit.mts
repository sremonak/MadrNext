/**
 * Rebuilds the audit hash chain in-place (walks rows in chronological order,
 * recomputing hash + prevHash with the current stable-JSON chainPayload).
 * Run against a DB whose audit rows were hashed with an older serialization:
 *   npx tsx scripts/dev/rehash-audit.mts
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash } from "node:crypto";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/madrnext";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

const logs = await prisma.auditLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
let prev: string | null = null;
let n = 0;
for (const log of logs) {
  const payload = stableStringify({
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata ?? null,
    ip: log.ip,
  });
  const hash = createHash("sha256").update((prev ?? "") + payload).digest("hex");
  await prisma.auditLog.update({
    where: { id: log.id },
    data: { prevHash: prev, hash },
  });
  prev = hash;
  n += 1;
}
console.log(`rehashed ${n} audit rows`);
await prisma.$disconnect();

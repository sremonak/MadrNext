/** Dev helper: mint a session token for a user (prints cookie value). Usage: npx tsx scripts/dev/mint-session.ts <email> */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { newOpaqueToken } from "../../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/madrnext";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = process.argv[2];
if (!email) { console.error("usage: tsx mint-session.ts <email>"); process.exit(1); }
const user = await prisma.user.findUnique({ where: { email } });
if (!user) { console.error("no user", email); process.exit(1); }
const { raw, hash } = newOpaqueToken();
await prisma.session.create({
  data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 24 * 3600_000), userAgent: "curl-test", ip: "127.0.0.1" },
});
console.log(raw);
await prisma.$disconnect();

/**
 * Creates the first Super Admin (production bootstrap).
 *   CREATE_SUPER_ADMIN_EMAIL=... CREATE_SUPER_ADMIN_PASSWORD=... npx tsx scripts/dev/create-super-admin.mts
 * Delete the env vars after running. Refuses to run when the admin already exists.
 */
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, passwordStrengthIssues } from "../../src/lib/auth/password";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/madrnext";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = process.env.CREATE_SUPER_ADMIN_EMAIL;
const password = process.env.CREATE_SUPER_ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set CREATE_SUPER_ADMIN_EMAIL and CREATE_SUPER_ADMIN_PASSWORD");
  process.exit(1);
}
const issues = passwordStrengthIssues(password);
if (issues.length > 0) {
  console.error("Weak password:", issues.join(" / "));
  process.exit(1);
}

const existing = await prisma.user.findFirst({ where: { email, role: { not: "STUDENT" } } });
if (existing) {
  console.error("An admin with this email already exists — refusing.");
  process.exit(1);
}

const admin = await prisma.user.create({
  data: {
    email,
    name: process.env.CREATE_SUPER_ADMIN_NAME ?? "সুপার অ্যাডমিন",
    passwordHash: await hashPassword(password),
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    emailVerifiedAt: new Date(),
  },
});
console.log("Created SUPER_ADMIN:", admin.email, "(id:", admin.id + ")");
console.log("⚠️  Clear CREATE_SUPER_ADMIN_* env vars now.");
await prisma.$disconnect();

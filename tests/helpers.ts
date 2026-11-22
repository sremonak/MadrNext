/**
 * Integration tests — need a reachable PostgreSQL (DATABASE_URL, default
 * madrnext_test). Each suite creates its own fixtures with unique emails and
 * cleans up in afterAll, so re-runs are safe.
 */
import { afterAll, beforeAll } from "vitest";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/madrnext_test";

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

let run = 0;
export function uniq(prefix: string): string {
  run += 1;
  return `${prefix}-${Date.now()}-${run}`;
}

/** Create an isolated student user; returns the row. */
export async function makeStudent(overrides: Partial<{ email: string; status: string }> = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${uniq("student")}@test.local`,
      name: "টেস্ট শিক্ষার্থী",
      passwordHash: "scrypt$test$stub",
      role: "STUDENT",
      status: (overrides.status ?? "ACTIVE") as "ACTIVE" | "SUSPENDED",
      studentProfile: { create: { level: "DAKHIL" as const, classNumber: 9 } },
    },
  });
}

/** Create an isolated published course (free unless price set). */
export async function makeCourse(opts: { pricePaisa?: number; status?: string } = {}) {
  const cat = await prisma.courseCategory.upsert({
    where: { slug: "test-cat" },
    update: {},
    create: { slug: "test-cat", nameBn: "টেস্ট বিভাগ", nameEn: "Test Category", level: "DAKHIL" as const, order: 999 },
  });
  return prisma.course.create({
    data: {
      slug: uniq("course"),
      titleBn: "টেস্ট কোর্স",
      titleEn: "Test Course",
      categoryId: cat.id,
      level: "DAKHIL" as const,
      pricePaisa: opts.pricePaisa ?? 0,
      status: (opts.status ?? "PUBLISHED") as "PUBLISHED" | "DRAFT",
    },
  });
}

beforeAll(async () => {
  await prisma.$queryRaw`SELECT 1`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

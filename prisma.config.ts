import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 configuration.
// - Connection URL lives here (schema files no longer carry `url`).
// - Migrations + seed wiring.
// In production/CI the DATABASE_URL env var is provided by the platform.

function loadEnvFile() {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  } catch {
    // .env is optional (CI provides env directly)
  }
}

loadEnvFile();

const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  ...(url ? { datasource: { url } } : {}),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});

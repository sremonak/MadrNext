import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // server-only guards are Next-specific; tests run in plain node.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // 30s per test — DB round-trips on slower machines.
    testTimeout: 30_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5432/madrnext_test",
      // dev-only secret for token/verify round-trips (never used in production)
      AUTH_SECRET: process.env.AUTH_SECRET ?? "vitest-test-secret-0123456789abcdef0123456789abcdef",
    },
  },
});

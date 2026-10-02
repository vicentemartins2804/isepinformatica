import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve("src") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Cada teste de SQL arranca um Postgres em memória (PGlite).
    testTimeout: 30_000,
  },
});

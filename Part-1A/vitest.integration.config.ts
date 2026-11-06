import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/contract/api/ticket-integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

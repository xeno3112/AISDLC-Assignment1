import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.{git,idea,cache,output,temp}/**",
      "tests/contract/api/ticket-integration.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/backend/src/modules/tickets/ticket-assignment.service.ts",
        "src/backend/src/modules/tickets/ticket-lifecycle.service.ts",
        "src/backend/src/modules/tickets/ticket-list.service.ts",
        "src/backend/src/modules/tickets/ticket-resolution.routes.ts",
        "src/backend/src/modules/tickets/ticket.routes.ts",
        "src/backend/src/modules/tickets/ticket.schemas.ts",
        "src/backend/src/modules/tickets/ticket.service.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
      ],
      reporter: ["text", "json-summary", "json"],
      perFile: true,
      thresholds: {
        branches: 90,
      },
    },
  },
});

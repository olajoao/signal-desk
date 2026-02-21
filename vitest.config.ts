import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    // Run test files sequentially — integration tests share a DB
    fileParallelism: false,
    // Skip integration tests (need DATABASE_URL) in default run
    exclude: [
      "**/node_modules/**",
      ...(process.env.DATABASE_URL
        ? []
        : [
            "apps/api/src/__tests__/auth.test.ts",
            "apps/api/src/__tests__/events.test.ts",
            "apps/api/src/__tests__/billing.test.ts",
          ]),
    ],
  },
});

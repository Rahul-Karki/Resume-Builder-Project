import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    isolate: false,
    pool: "threads",
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/__tests__/**/*.test.ts", "src/__tests__/**/*.test.tsx"],
    setupFiles: ["src/__tests__/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    isolate: false,
    pool: "threads",
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      enabled: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.*",
        "src/**/__tests__/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
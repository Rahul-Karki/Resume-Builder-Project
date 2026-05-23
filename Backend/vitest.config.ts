import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: ".",
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/__mocks__/**", "**/*.d.ts"],
      lines: 80,
      functions: 80,
      branches: 60,
      statements: 80,
    },
    setupFiles: ["./src/__tests__/helpers/setupEnv.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

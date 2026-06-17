import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    root: ".",
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      enabled: false,
      provider: "v8",
      reporter: ["text", "lcov", "cobertura"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/__mocks__/**", "**/*.d.ts"],
    },
    setupFiles: ["./src/__tests__/helpers/setupEnv.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "manual-tests", "chrome"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "security/detect-object-injection": "warn",
    },
  },

  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "src/migrations/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["src/__tests__/**", "automated-tests/**"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["src/middleware/*.ts"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
    },
  },

  {
    files: ["src/models/plugins/softDelete.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
);

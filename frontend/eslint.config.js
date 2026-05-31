import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import security from 'eslint-plugin-security'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      security.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-prototype-builtins': 'error',
      'no-useless-catch': 'error',
      'no-console': 'error',
      'react-hooks/refs': 'error',
      'react-refresh/only-export-components': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/static-components': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-possible-timing-attacks': 'error',
    },
  },
])

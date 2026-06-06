# Testing Standards

Last updated: 2026-05-23

## 1. File Naming Convention

| Test type | Pattern | Location |
|-----------|---------|----------|
| Backend automated tests | `*.test.js` / `*.test.ts` | `Backend/automated-tests/` |
| Backend integration tests | `integration/*.test.js` / `integration/*.test.ts` | `Backend/automated-tests/integration/` |
| Frontend unit tests | `src/__tests__/<module>.test.ts` | `frontend/src/__tests__/` |
| E2E tests | `e2e/<feature>.spec.ts` | `frontend/e2e/` |

## 2. Required Sections in Every Test File

Vitest-style headers are used in the scaffolded frontend unit tests. The runnable backend suite currently uses Node's native test runner.

Every Vitest-style test file must follow this structure, in order:

```typescript
// ─── Module: <ModuleName> ───────────────────────────
// Description: <one line describing what this module does>
// Coverage targets: <comma-separated list of functions/methods being tested>
// Last updated: <YYYY-MM-DD>

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("<ModuleName>", () => {

  describe("<functionName>", () => {
    it("should <expected behavior> when <condition>", () => {
      // Arrange
      // Act
      // Assert
    });

    it("should <handle edge case>", () => {
      // Arrange
      // Act
      // Assert
    });

    it("should <throw/return error> when <invalid input>", () => {
      // Arrange
      // Act
      // Assert
    });
  });

});
```

- Every `describe` block must have a descriptive string as the first argument.
- Every `it` block must use the pattern `"should <behavior> when <condition>"`.
- Tests must be organized in three sections separated by comments: `// Arrange`, `// Act`, `// Assert`.

## 3. Mocking Rules

- **All external API calls must be mocked.** Unit tests must never hit live endpoints, databases, or third-party services.
- Use `vi.mock()` or `jest.mock()` at the top of the file, never inside individual tests.
- Mock file paths must mirror the source module path under `__mocks__/`:
  ```
  src/utils/redis.ts          →  src/__mocks__/redis.ts
   src/services/aiService.ts  →  src/__mocks__/aiService.ts
  ```
- Create a manual mock file at `src/__mocks__/<module>.ts` exporting all public functions as `vi.fn()`.
- For Mongoose models, use `vi.mock("../models/User")` and provide a factory that returns a plain object with the expected methods.
- For `express` Request/Response/NextFunction, use `vi.fn()` and create typed mock objects:
  ```typescript
  const mockReq = { params: {}, body: {}, cookies: {} } as Request;
  const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const mockNext = vi.fn() as NextFunction;
  ```

## 4. Coverage Requirements

- **Minimum 80% line coverage** per module, enforced in CI.
- **Every public function must have at least three tests:**
  1. Happy path (expected input → expected output)
  2. Edge case (boundary values, empty inputs, null/undefined)
  3. Error case (invalid input → expected error)
- Coverage is measured per-file. The CI pipeline rejects any PR that drops coverage below 80%.
- Integration tests do not count toward unit-test coverage targets.
- Model tests must cover: valid creation, validation errors, virtual/instance methods, and plugin behavior (audit trail, soft delete, cascade delete).

## 5. Forbidden Patterns

| Pattern | Why |
|---------|-----|
| `console.log` inside tests | Pollutes test output; use a logger mock or silent assertion |
| `.only()` left in committed code | Skips all other tests in the file; CI must detect and reject |
| Hardcoded user IDs, tokens, emails | Creates flaky tests; always use a factory or `faker` |
| `setTimeout` or `sleep` for async | Makes tests slow and flaky; use `vi.useFakeTimers()` or advance timers explicitly |
| Shared mutable state between tests | Causes order-dependent failures; reset all mocks in `beforeEach` |
| `try/catch` in assertions | Use `expect(fn).toThrow()` instead |
| Direct `Date.now()` or `Math.random()` | Use `vi.setSystemTime()` and `vi.fn().mockReturnValue()` to make tests deterministic |

## 6. Test Runner Configuration

- **Backend:** use Node's built-in `node:test` runner for the executable automated suite.
- **Frontend:** use Vitest for unit tests and Playwright for E2E.
- **E2E:** use `@playwright/test`.
- Configuration files:
  - Backend: `Backend/package.json` test scripts
  - Frontend unit tests: `frontend/vitest.config.ts`
  - E2E: `frontend/playwright.config.ts`

## 7. CI Integration

- Unit and integration tests run on every pull request via the `test-backend` job in `.github/workflows/ci.yml`.
- The CI pipeline requires all tests to pass and coverage to remain at or above 80%.
- Any PR that includes `.only()`, `console.log` (in test files), or drops coverage will be flagged during review and blocked from merge.

## 8. Mock File Template

```typescript
// src/__mocks__/<module>.ts
// Auto-generated mock — exports every public function as vi.fn()

export const functionOne = vi.fn();
export const functionTwo = vi.fn();
// ... repeat for every export
```

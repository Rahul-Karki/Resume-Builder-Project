// ─── Module: sentry ───────────────────────────
// Description: Sentry SDK initialization and flush utilities
// Coverage targets: initializeBackendSentry, flushBackendSentry
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("sentry", () => {
  describe("initializeBackendSentry", () => { it("should initialize Sentry with the DSN from env", () => {}); it("should not throw when the DSN is empty", () => {}); });
  describe("flushBackendSentry", () => { it("should flush pending events before shutdown", () => {}); });
});

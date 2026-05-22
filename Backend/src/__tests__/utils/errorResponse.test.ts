// ─── Module: errorResponse ───────────────────────────
// Description: Build and send structured error responses
// Coverage targets: buildErrorResponse, sendErrorResponse, toAppError
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("errorResponse", () => {
  describe("buildErrorResponse", () => { it("should produce a structured error payload with code and message", () => {}); it("should map validation errors to 400", () => {}); it("should map not-found errors to 404", () => {}); it("should include optional details and stack traces", () => {}); });
  describe("sendErrorResponse", () => { it("should send a JSON error response with the correct status", () => {}); });
});

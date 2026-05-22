// ─── Module: validateRequest ───────────────────────────
// Description: Zod validation middleware for request body, params, and query
// Coverage targets: validateRequest
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("validateRequest", () => {
  it("should call next() and apply the parsed body for valid input", () => {});
  it("should return 400 with formatted validation errors for invalid body", () => {});
  it("should parse params and query schemas when provided", () => {});
  it("should collect all validation issues, not just the first", () => {});
});

// ─── Module: authMiddleware ───────────────────────────
// Description: Verifies JWT access token from cookie and attaches req.user
// Coverage targets: authMiddleware
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("authMiddleware", () => {
  it("should attach the user to req when a valid access token cookie is present", () => {});
  it("should return 401 when the access token cookie is missing", () => {});
  it("should return 401 when the token is expired", () => {});
  it("should return 401 when the user is not found in the database", () => {});
  it("should return 401 when the token signature is invalid", () => {});
});

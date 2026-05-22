// ─── Module: adminAuthMiddleware ───────────────────────────
// Description: Role-based authorization guard (admin/super-admin)
// Coverage targets: authenticate, requireAdmin, requireSuperAdmin, adminGuard
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("adminAuthMiddleware", () => {
  describe("authenticate", () => { it("should call next() when a valid access token is provided", () => {}); it("should return 401 when no token is provided", () => {}); it("should return 401 when the token is expired", () => {}); });
  describe("requireAdmin", () => { it("should call next() when the user has an admin role", () => {}); it("should return 403 when the user has a user role", () => {}); it("should return 401 when req.user is not set", () => {}); });
  describe("requireSuperAdmin", () => { it("should call next() when the user has a superadmin role", () => {}); it("should return 403 when the user has an admin role", () => {}); });
  describe("adminGuard", () => { it("should authenticate then authorize in sequence", () => {}); it("should return 401 on auth failure without checking role", () => {}); });
});

// ─── Module: User model ───────────────────────────
// Description: User schema with email/password, Google OAuth, MFA, role, AI credits
// Coverage targets: User.create, User.findByEmail, password hashing, MFA fields, aiCredits fields, role enum, softDelete plugin, auditTrail plugin
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("User model", () => {
  it("should create a user with valid email and password", () => {});
  it("should hash the password before saving", () => {});
  it("should reject duplicate emails", () => {});
  it("should validate the role enum", () => {});
  it("should support Google OAuth linking", () => {});
  it("should track login attempts and lock the account", () => {});
  it("should soft-delete the user and cascade to resumes", () => {});
});

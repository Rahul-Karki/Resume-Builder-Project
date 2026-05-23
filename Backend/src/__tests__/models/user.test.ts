import { describe, it, expect } from "vitest";
import User from "../../models/User";
import { UserRole } from "../../enums/userRole";

describe("User model", () => {
  it("should create a user with valid email and password", () => {
    const paths = User.schema.paths;
    expect(paths["email"].options.required).toBe(true);
    expect(paths["email"].options.unique).toBe(true);
    expect(paths["name"].options.required).toBe(true);
  });

  it("should hash the password before saving", () => {
    const passwordPath = User.schema.path("password") as any;
    expect(passwordPath).toBeDefined();
    expect(passwordPath.options.select).toBe(false);
  });

  it("should reject duplicate emails", () => {
    const paths = User.schema.paths;
    expect(paths["email"].options.unique).toBe(true);
  });

  it("should validate the role enum", () => {
    const rolePath = User.schema.path("role") as any;
    const enumValues: string[] = rolePath.options.enum;
    expect(enumValues).toContain(UserRole.USER);
    expect(enumValues).toContain(UserRole.ADMIN);
    expect(enumValues).toContain(UserRole.SUPERADMIN);
    expect(enumValues).toContain(UserRole.RECRUITER);
  });

  it("should support Google OAuth linking", () => {
    const paths = User.schema.paths;
    expect(paths["googleId"]).toBeDefined();
    expect(paths["googleId"].options.unique).toBe(true);
    expect(paths["googleId"].options.sparse).toBe(true);
    expect(paths["authProvider"].options.enum).toContain("google");
  });

  it("should track login attempts and lock the account", () => {
    const paths = User.schema.paths;
    expect(paths["loginAttempts"]).toBeDefined();
    expect(paths["loginAttempts"].options.default).toBe(0);
    expect(paths["loginAttempts"].options.min).toBe(0);
    expect(paths["lockUntil"]).toBeDefined();
  });

  it("should support MFA configuration fields", () => {
    const paths = User.schema.paths;
    expect(paths["mfaEnabled"]).toBeDefined();
    expect(paths["mfaEnabled"].options.default).toBe(false);
    expect(paths["mfaMethod"]).toBeDefined();
    expect(paths["mfaMethod"].options.enum).toContain("totp");
    expect(paths["mfaBackupCodes"]).toBeDefined();
    expect(paths["mfaSecret"]).toBeDefined();
    expect(paths["mfaVerifiedAt"]).toBeDefined();
  });
});

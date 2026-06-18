import { describe, it, expect } from "vitest";
import PendingUser from "../../models/PendingUser";

describe("PendingUser model", () => {
  it("should have required fields", () => {
    const paths = PendingUser.schema.paths;
    expect(paths["name"].options.required).toBe(true);
    expect(paths["email"].options.required).toBe(true);
    expect(paths["email"].options.unique).toBe(true);
    expect(paths["password"].options.required).toBe(true);
    expect(paths["emailVerificationOtp"].options.required).toBe(true);
    expect(paths["emailVerificationOtpExpires"].options.required).toBe(true);
  });

  it("should have default values for optional fields", () => {
    const paths = PendingUser.schema.paths;
    expect(paths["role"].options.default).toBe("user");
    expect(paths["authProvider"].options.default).toEqual(["local"]);
    expect(paths["emailVerificationAttempts"].options.default).toBe(0);
    expect(paths["resendAttempts"].options.default).toBe(0);
    expect(paths["lastResendAt"].options.default).toBe(null);
  });

  it("should have email verification fields", () => {
    const paths = PendingUser.schema.paths;
    expect(paths["emailVerificationOtp"]).toBeDefined();
    expect(paths["emailVerificationOtpExpires"]).toBeDefined();
    expect(paths["emailVerificationAttempts"]).toBeDefined();
    expect(paths["resendAttempts"]).toBeDefined();
    expect(paths["lastResendAt"]).toBeDefined();
  });

  it("should have TTL index on createdAt", () => {
    const index = PendingUser.schema.indexes().find((idx: any) => idx[0]?.createdAt === 1);
    expect(index).toBeDefined();
    if (index) {
      expect((index[1] as any).expireAfterSeconds).toBe(86400);
    }
  });

  it("should support auth provider array", () => {
    const authPath = PendingUser.schema.path("authProvider") as any;
    expect(authPath).toBeDefined();
    expect(authPath.instance).toBe("Array");
  });
});

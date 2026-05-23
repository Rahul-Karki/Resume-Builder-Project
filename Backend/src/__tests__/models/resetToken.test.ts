import { describe, it, expect } from "vitest";
import ResetToken from "../../models/ResetToken";

describe("ResetToken model", () => {
  it("should create a reset token with an expiry", () => {
    const paths = ResetToken.schema.paths;
    expect(paths.userId.options.required).toBe(true);
    expect(paths.token.options.required).toBe(true);
    expect(paths.expiresAt.options.required).toBe(true);
    expect(paths.resendCount).toBeDefined();
    expect(paths.resendCount.options.default).toBe(0);
  });

  it("should auto-expire via TTL index", () => {
    const indexes = ResetToken.schema.indexes();
    const ttlIndex = indexes.find(([key]) => JSON.stringify(key) === JSON.stringify({ expiresAt: 1 }));
    expect(ttlIndex).toBeDefined();
    if (ttlIndex) {
      expect(ttlIndex[1].expireAfterSeconds).toBe(0);
    }
  });

  it("should track resend attempts", () => {
    const paths = ResetToken.schema.paths;
    expect(paths.resendCount).toBeDefined();
    expect(paths.resendCount.options.default).toBe(0);
    expect(paths.lastSeenAt).toBeDefined();
  });
});

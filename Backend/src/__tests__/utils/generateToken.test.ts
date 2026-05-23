// ─── Module: generateToken ───────────────────────────
import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../../utils/generateToken";

describe("generateToken", () => {
  it("signs token with access secret", () => {
    const userId = "user-123";
    const token = generateAccessToken(userId);
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

    expect(payload.userId).toBe(userId);
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("signs token with refresh secret and long ttl", () => {
    const userId = "user-abc";
    const token = generateRefreshToken(userId);
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;

    expect(payload.userId).toBe(userId);
    expect(payload.exp).toBeGreaterThan(payload.iat);

    const ttlSeconds = payload.exp - payload.iat;
    expect(ttlSeconds).toBeGreaterThanOrEqual(6 * 24 * 60 * 60);
  });
});

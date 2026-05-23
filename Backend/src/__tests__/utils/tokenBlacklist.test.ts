import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn();
vi.mock("../../utils/redis", () => ({
  withRedis: vi.fn((fn: any) => fn({ get: mockGet, set: mockSet })),
}));

vi.mock("../../observability", () => ({ logger: { info: vi.fn() } }));

beforeEach(() => { vi.clearAllMocks(); });

describe("tokenBlacklist", () => {
  describe("blacklistToken", () => {
    it("should store the token with a TTL matching its original expiry", async () => {
      const { blacklistAccessToken } = await import("../../utils/tokenBlacklist");

      await blacklistAccessToken("some-token");

      expect(mockSet).toHaveBeenCalledWith(expect.stringContaining("token:blacklist:"), "1", { EX: 900 });
    });
  });

  describe("isTokenBlacklisted", () => {
    it("should return true when the token is blacklisted", async () => {
      mockGet.mockResolvedValue("1");
      const { isTokenBlacklisted } = await import("../../utils/tokenBlacklist");

      const result = await isTokenBlacklisted("blacklisted-token", "access");

      expect(result).toBe(true);
    });

    it("should return false when the token is not blacklisted", async () => {
      mockGet.mockResolvedValue(null);
      const { isTokenBlacklisted } = await import("../../utils/tokenBlacklist");

      const result = await isTokenBlacklisted("clean-token", "access");

      expect(result).toBe(false);
    });

    it("should return false for expired blacklisted entries", async () => {
      mockGet.mockResolvedValue(null);
      const { isTokenBlacklisted } = await import("../../utils/tokenBlacklist");

      const result = await isTokenBlacklisted("expired-token", "access");

      expect(result).toBe(false);
    });
  });
});

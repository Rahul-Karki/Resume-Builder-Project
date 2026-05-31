import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../utils/redis", () => ({
  withRedis: vi.fn(),
}));

import { withRedis } from "../utils/redis";
import {
  blacklistAccessToken,
  blacklistRefreshToken,
  isTokenBlacklisted,
} from "../utils/tokenBlacklist";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tokenBlacklist", () => {
  describe("isTokenBlacklisted", () => {
    it("returns false when Redis is unavailable (avoids mass logout)", async () => {
      vi.mocked(withRedis).mockRejectedValue(new Error("Redis connection refused"));

      const result = await isTokenBlacklisted("some-token", "access");

      expect(result).toBe(false);
    });

    it("returns true when token is blacklisted", async () => {
      vi.mocked(withRedis).mockResolvedValue("1");

      const result = await isTokenBlacklisted("blacklisted-token", "access");

      expect(result).toBe(true);
    });

    it("returns false when token is not blacklisted", async () => {
      vi.mocked(withRedis).mockResolvedValue(null);

      const result = await isTokenBlacklisted("valid-token", "access");

      expect(result).toBe(false);
    });
  });

  describe("blacklistAccessToken", () => {
    it("stores the token hash in Redis with TTL", async () => {
      let setKey = "";
      let setValue = "";
      let setTtl: number | undefined;
      vi.mocked(withRedis).mockImplementation(async (fn: any) => {
        const mockClient = {
          set: (key: string, val: string, opts: { EX: number }) => {
            setKey = key;
            setValue = val;
            setTtl = opts.EX;
          },
        };
        await fn(mockClient);
      });

      await blacklistAccessToken("test-token");

      expect(setKey).toContain("token:blacklist:access:");
      expect(setValue).toBe("1");
      expect(setTtl).toBe(60 * 15);
    });
  });

  describe("blacklistRefreshToken", () => {
    it("stores the token hash in Redis with TTL for 8 days", async () => {
      let setTtl: number | undefined;
      vi.mocked(withRedis).mockImplementation(async (fn: any) => {
        const mockClient = {
          set: (_key: string, _val: string, opts: { EX: number }) => {
            setTtl = opts.EX;
          },
        };
        await fn(mockClient);
      });

      await blacklistRefreshToken("test-refresh-token");

      expect(setTtl).toBe(60 * 60 * 24 * 8);
    });
  });
});

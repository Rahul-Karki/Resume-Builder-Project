import { describe, it, expect, vi, beforeEach } from "vitest";
import { Registry } from "prom-client";

vi.mock("redis", () => ({ createClient: vi.fn() }));
vi.mock("../../observability", () => ({ logger: { warn: vi.fn(), info: vi.fn() }, metricsRegistry: new Registry() }));

const memoryCacheMock = { get: vi.fn(), set: vi.fn(), deleteByPattern: vi.fn() };
vi.mock("../../utils/memoryCache", () => ({ memoryCache: memoryCacheMock }));

const memoryRateLimiterMock = { consume: vi.fn() };
vi.mock("../../utils/memoryRateLimit", () => ({ memoryRateLimiter: memoryRateLimiterMock }));

beforeEach(() => { vi.clearAllMocks(); });

describe("redis", () => {
  describe("getCacheProvider", () => {
    it("should return 'none' when USE_MEMORY_ONLY_CACHE is true", async () => {
      const { getCacheProvider } = await import("../../utils/redis");
      expect(getCacheProvider()).toBe("none");
    });
  });

  describe("setCache", () => {
    it("should store a value with TTL via memory fallback", async () => {
      const { cacheSet } = await import("../../utils/redis");
      memoryCacheMock.set.mockReturnValue(undefined);
      const result = await cacheSet("test-key", "test-value", 60);
      expect(result).toBe(true);
      expect(memoryCacheMock.set).toHaveBeenCalledWith("test-key", "test-value", 60);
    });

    it("should serialize objects to JSON", async () => {
      const { cacheSet } = await import("../../utils/redis");
      memoryCacheMock.set.mockReturnValue(undefined);
      await cacheSet("obj-key", JSON.stringify({ a: 1 }), 60);
      expect(memoryCacheMock.set).toHaveBeenCalledWith("obj-key", JSON.stringify({ a: 1 }), 60);
    });
  });

  describe("getCache", () => {
    it("should return the cached value when it exists", async () => {
      const { cacheGet } = await import("../../utils/redis");
      memoryCacheMock.get.mockReturnValue("cached-value");
      const result = await cacheGet("test-key");
      expect(result).toBe("cached-value");
    });

    it("should return null for a cache miss", async () => {
      const { cacheGet } = await import("../../utils/redis");
      memoryCacheMock.get.mockReturnValue(null);
      const result = await cacheGet("missing-key");
      expect(result).toBeNull();
    });
  });

  describe("consumeRateLimit", () => {
    it("should use memory rate limiter when provider is none", async () => {
      const { consumeRateLimit } = await import("../../utils/redis");
      memoryRateLimiterMock.consume.mockReturnValue({ count: 1, ttlSeconds: 60 });
      const result = await consumeRateLimit("rate-key", 60);
      expect(result).toEqual({ count: 1, ttlSeconds: 60 });
      expect(memoryRateLimiterMock.consume).toHaveBeenCalledWith("rate-key", 60000);
    });
  });

  describe("closeRedisClient", () => {
    it("should resolve without error when no client exists", async () => {
      const { closeRedisClient } = await import("../../utils/redis");
      await expect(closeRedisClient()).resolves.toBeUndefined();
    });
  });
});

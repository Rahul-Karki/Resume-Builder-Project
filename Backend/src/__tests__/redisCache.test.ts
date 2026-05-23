// ─── Module: redisCache ───────────────────────────
import { describe, it, expect, vi } from "vitest";

vi.mock("../observability", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  appMetrics: {
    cacheMisses: { add: vi.fn() },
    cacheHits: { add: vi.fn() },
  },
}));
vi.mock("../config/env", () => ({ env: {} }));
vi.mock("../utils/redis", () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(true),
  deleteByPattern: vi.fn(),
  getCacheProvider: vi.fn().mockReturnValue("redis"),
}));

import { CACHE_VERSION, buildCacheScope } from "../constants/cacheScopes";
import { invalidateRedisCache } from "../middleware/redisCache";
import { deleteByPattern } from "../utils/redis";

describe("redisCache", () => {
  it("cache scopes are versioned", () => {
    expect(buildCacheScope("public-templates")).toBe(`v${CACHE_VERSION}:public-templates`);
    expect(buildCacheScope("admin-dashboard")).toBe(`v${CACHE_VERSION}:admin-dashboard`);
  });

  it("invalidateRedisCache uses versioned cache patterns", async () => {
    await invalidateRedisCache(["public-templates", "admin-dashboard"]);

    expect(vi.mocked(deleteByPattern)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(deleteByPattern)).toHaveBeenNthCalledWith(
      1,
      "resume-builder:cache:v1:public-templates:*",
    );
    expect(vi.mocked(deleteByPattern)).toHaveBeenNthCalledWith(
      2,
      "resume-builder:cache:v1:admin-dashboard:*",
    );
  });
});

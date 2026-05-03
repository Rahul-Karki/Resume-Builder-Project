const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const cacheScopesPath = path.join(distRoot, "constants", "cacheScopes.js");
const redisCachePath = path.join(distRoot, "middleware", "redisCache.js");
const redisUtilsPath = path.join(distRoot, "utils", "redis.js");

test("cache scopes are versioned", () => {
  const { CACHE_VERSION, buildCacheScope } = require(cacheScopesPath);

  assert.equal(buildCacheScope("public-templates"), `v${CACHE_VERSION}:public-templates`);
  assert.equal(buildCacheScope("admin-dashboard"), `v${CACHE_VERSION}:admin-dashboard`);
});

test("invalidateRedisCache uses versioned cache patterns", async () => {
  const patterns = [];
  const { invalidateRedisCache } = loadWithMocks(redisCachePath, {
    [path.join(distRoot, "observability.js")]: {
      logger: {
        warn() {},
        info() {},
        error() {},
      },
      appMetrics: {
        cacheMisses: { add() {} },
        cacheHits: { add() {} },
      },
    },
    [path.join(distRoot, "config", "env.js")]: {
      env: {},
    },
    [redisUtilsPath]: {
      cacheGet: async () => null,
      cacheSet: async () => true,
      deleteByPattern: async (pattern) => {
        patterns.push(pattern);
      },
      getCacheProvider: () => "redis",
    },
  });

  await invalidateRedisCache(["public-templates", "admin-dashboard"]);

  assert.deepEqual(patterns, [
    "resume-builder:cache:v1:public-templates:*",
    "resume-builder:cache:v1:admin-dashboard:*",
  ]);
});

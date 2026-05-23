import { createClient } from "redis";
import { env } from "../config/env";
import { logger } from "../observability";
import { memoryCache } from "./memoryCache";
import { memoryRateLimiter } from "./memoryRateLimit";

type RedisClient = ReturnType<typeof createClient>;
type CacheProvider = "redis" | "upstash" | "none";

let redisClient: RedisClient | null = null;
let redisConnectPromise: Promise<RedisClient | null> | null = null;
let lastRedisFailureAt = 0;

const REDIS_RETRY_COOLDOWN_MS = 30_000;

const isNativeRedisUrl = (value: string) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "redis:" || parsed.protocol === "rediss:";
  } catch {
    return false;
  }
};

const hasRedisConfiguration = isNativeRedisUrl(env.REDIS_URL);
const hasUpstashConfiguration = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

const getUpstashBaseUrl = () => env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "");

// Per-process window counters to limit Upstash REST calls (soft budget)
let upstashCallCount = 0;
let upstashWindowStart = 0;

const upstashCall = async (
  command: string,
  args: Array<string | number> = [],
): Promise<unknown> => {
  if (!hasUpstashConfiguration) {
    return null;
  }

  // Per-process Upstash call budget to protect free-tier limits.
  // This is a soft limit; when exhausted this process will fall back
  // to the in-memory cache/rate-limiter to avoid extra REST calls.
  // The limit is configured via `env.UPSTASH_CALLS_PER_MIN`.
  // Implement a simple fixed-window counter.
  // (Note: this is per-process only and intended to reduce overall load.)
  if (typeof env.UPSTASH_CALLS_PER_MIN === "number") {
    const now = Date.now();
    // initialize window state on first use
    if ((upstashWindowStart ?? 0) === 0) {
      upstashWindowStart = now;
      upstashCallCount = 0;
    }

    if (now - upstashWindowStart > 60_000) {
      upstashWindowStart = now;
      upstashCallCount = 0;
    }

    if (upstashCallCount >= env.UPSTASH_CALLS_PER_MIN) {
      logger.warn({ limit: env.UPSTASH_CALLS_PER_MIN }, "Upstash call budget exhausted; skipping REST call and falling back to memory");
      return null;
    }

    upstashCallCount += 1;
  }

  const encodedArgs = args.map((arg) => encodeURIComponent(String(arg))).join("/");
  const suffix = encodedArgs ? `/${encodedArgs}` : "";
  const endpoint = `${getUpstashBaseUrl()}/${command}${suffix}`;
  const isWrite = new Set(["set", "del", "expire", "incr"]);

  const controller = new AbortController();
  const timeoutMs = env.REDIS_CONNECT_TIMEOUT_MS || 5000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: isWrite.has(command) ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new Error(`Upstash ${command.toUpperCase()} failed (${response.status}): ${responseText}`);
    }

    const payload = (await response.json()) as { result?: unknown };
    return payload.result ?? null;
  } finally {
    clearTimeout(timeoutId);
  }
};



export const getCacheProvider = (): CacheProvider => {
  // When USE_MEMORY_ONLY_CACHE is true, skip Redis/Upstash for cache and
  // rate-limit entirely. This saves thousands of commands per day on the
  // Upstash free tier.
  if (env.USE_MEMORY_ONLY_CACHE) {
    return "none";
  }

  if (hasRedisConfiguration) {
    return "redis";
  }

  if (hasUpstashConfiguration) {
    return "upstash";
  }

  return "none";
};

const createRedisClient = () =>
  createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: (retries) => Math.min(1000 * 2 ** retries, 5000),
    },
  });

const attachRedisLogging = (client: RedisClient) => {
  client.on("error", (error) => {
    logger.warn({ error }, "Redis client error");
  });

  client.on("reconnecting", () => {
    logger.info("Redis reconnecting");
  });
};

export const getRedisClient = async (): Promise<RedisClient | null> => {
  if (!hasRedisConfiguration) {
    return null;
  }

  const now = Date.now();

  if (lastRedisFailureAt > 0 && now - lastRedisFailureAt < REDIS_RETRY_COOLDOWN_MS) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    try {
      const client = redisClient ?? createRedisClient();
      attachRedisLogging(client);

      if (!client.isOpen) {
        await client.connect();
      }

      redisClient = client;
      return client;
    } catch (error) {
      logger.warn({ error }, "Redis unavailable; distributed cache and rate limiting are disabled");
      redisClient = null;
      lastRedisFailureAt = Date.now();
      return null;
    } finally {
      redisConnectPromise = null;
    }
  })();

  return redisConnectPromise;
};

export const withRedis = async <T>(operation: (client: RedisClient) => Promise<T>): Promise<T | null> => {
  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  try {
    return await operation(client);
  } catch (error) {
    logger.warn({ error }, "Redis operation failed");
    return null;
  }
};

export const cacheGet = async (key: string): Promise<string | null> => {
  const provider = getCacheProvider();

  if (provider === "redis") {
    const result = await withRedis((client) => client.get(key));
    if (result !== null) return result;
    // Fall through to in-memory
    return memoryCache.get(key);
  }

  if (provider === "upstash") {
    try {
      const value = await upstashCall("get", [key]);

      if (typeof value === "string") {
        return value;
      }

      // If Upstash returned null (budget exhausted or missing), fall back to in-memory cache.
      if (value == null) return memoryCache.get(key);
      return JSON.stringify(value);
    } catch (error) {
      logger.warn({ error }, "Upstash read failed; falling back to in-memory cache");
      return memoryCache.get(key);
    }
  }

  // No Redis configured — use in-memory cache
  return memoryCache.get(key);
};

export const cacheSet = async (key: string, value: string, ttlSeconds: number): Promise<boolean> => {
  const provider = getCacheProvider();

  // Always write to in-memory cache regardless of provider
  memoryCache.set(key, value, ttlSeconds);

  if (provider === "redis") {
    const result = await withRedis(async (client) => {
      await client.set(key, value, { EX: ttlSeconds });
      return true;
    });

    return Boolean(result);
  }

  if (provider === "upstash") {
    try {
      await upstashCall("set", [key, value, "EX", ttlSeconds]);
      return true;
    } catch (error) {
      logger.warn({ error }, "Upstash write failed; cached in-memory only");
      return true; // Still cached in memory
    }
  }

  return true; // Cached in memory
};

export const consumeRateLimit = async (
  key: string,
  windowSeconds: number,
): Promise<{ count: number; ttlSeconds: number } | null> => {
  const provider = getCacheProvider();

  if (provider === "redis") {
    const result = await withRedis(async (client) => {
      // Use Lua script to combine INCR + EXPIRE + TTL into a single round-trip
      const luaScript = `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
        local ttl = redis.call('TTL', KEYS[1])
        return {count, ttl}
      `;
      const results = await client.eval(luaScript, {
        keys: [key],
        arguments: [String(windowSeconds)],
      }) as [number, number];
      const [count, ttlSeconds] = results;
      return { count, ttlSeconds };
    });

    // Fall back to in-memory if Redis is down
    if (!result) {
      return memoryRateLimiter.consume(key, windowSeconds * 1000);
    }

    return result;
  }

  if (provider === "upstash") {
    try {
      // Single EVAL call replaces 3 separate commands (INCR + EXPIRE + TTL)
      const luaScript = [
        "local count = redis.call('INCR', KEYS[1])",
        "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
        "local ttl = redis.call('TTL', KEYS[1])",
        "return {count, ttl}",
      ].join("\n");

      const result = await upstashCall("eval", [luaScript, "1", key, String(windowSeconds)]);
      if (!result) {
        // Upstash call skipped/failed (budget exhausted). Use in-memory limiter.
        return memoryRateLimiter.consume(key, windowSeconds * 1000);
      }

      const [countRaw, ttlRaw] = Array.isArray(result) ? result : [0, 0];
      const count = Number(countRaw);
      const ttlSeconds = Number(ttlRaw);
      return { count, ttlSeconds };
    } catch (error) {
      logger.warn({ error }, "Upstash rate-limit failed; using in-memory fallback");
      return memoryRateLimiter.consume(key, windowSeconds * 1000);
    }
  }

  // No Redis — use in-memory rate limiter
  return memoryRateLimiter.consume(key, windowSeconds * 1000);
};

export const deleteByPattern = async (pattern: string): Promise<number> => {
  const provider = getCacheProvider();

  if (provider === "redis") {
    const deleted = await withRedis(async (client) => {
      const keys: string[] = [];
      let deletedCount = 0;

      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(String(key));

        if (keys.length >= 200) {
          deletedCount += await client.del(keys);
          keys.length = 0;
        }
      }

      if (keys.length > 0) {
        deletedCount += await client.del(keys);
      }

      return deletedCount;
    });

    return deleted ?? 0;
  }

  if (provider === "upstash") {
    // Avoid expensive KEYS command on Upstash (O(N) scan + DEL = 2+ commands).
    // Since cacheSet writes to both Upstash AND memoryCache, and cacheGet
    // falls back to memoryCache on miss, invalidating in-memory is sufficient.
    // Stale Upstash entries will simply expire via TTL.
    return memoryCache.deleteByPattern(pattern);
  }

  return 0;
};

export const warmupCacheBackend = async (): Promise<boolean> => {
  const provider = getCacheProvider();

  if (provider === "redis") {
    return checkRedisHealth();
  }

  if (provider === "upstash") {
    try {
      const result = await upstashCall("ping");
      return Boolean(result);
    } catch (error) {
      logger.warn({ error }, "Upstash warmup ping failed");
      return false;
    }
  }

  return false;
};

export const checkRedisHealth = async (): Promise<boolean> => {
  const provider = getCacheProvider();

  if (provider === "redis") {
    const client = await getRedisClient();

    if (!client) {
      return false;
    }

    try {
      await client.ping();
      return true;
    } catch (error) {
      logger.warn({ error }, "Redis health ping failed");
      return false;
    }
  }

  if (provider === "upstash") {
    try {
      const result = await upstashCall("ping");
      return Boolean(result);
    } catch (error) {
      logger.warn({ error }, "Upstash health ping failed");
      return false;
    }
  }

  return false;
};

export const closeRedisClient = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    if (redisClient.isOpen) {
      await redisClient.quit();
    } else {
      await redisClient.disconnect();
    }
  } catch (error) {
    logger.warn({ error }, "Redis shutdown failed");
  } finally {
    redisClient = null;
    lastRedisFailureAt = 0;
  }
};
import { createClient } from "redis";
import { env } from "../config/env";
import { logger } from "../observability";

type RedisClient = ReturnType<typeof createClient>;
type CacheProvider = "redis" | "upstash" | "none";

let redisClient: RedisClient | null = null;
let redisConnectPromise: Promise<RedisClient | null> | null = null;
let lastRedisFailureAt = 0;

const REDIS_RETRY_COOLDOWN_MS = 30_000;

const hasRedisConfiguration = Boolean(env.REDIS_URL);
const hasUpstashConfiguration = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

const upstashBaseUrl = env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "");

const upstashCall = async (
  command: string,
  args: Array<string | number> = [],
): Promise<unknown> => {
  if (!hasUpstashConfiguration) {
    return null;
  }

  const encodedArgs = args.map((arg) => encodeURIComponent(String(arg))).join("/");
  const suffix = encodedArgs ? `/${encodedArgs}` : "";
  const endpoint = `${upstashBaseUrl}/${command}${suffix}`;
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
    return withRedis((client) => client.get(key));
  }

  if (provider === "upstash") {
    try {
      const value = await upstashCall("get", [key]);

      if (typeof value === "string") {
        return value;
      }

      return value == null ? null : JSON.stringify(value);
    } catch (error) {
      logger.warn({ error }, "Upstash read failed");
      return null;
    }
  }

  return null;
};

export const cacheSet = async (key: string, value: string, ttlSeconds: number): Promise<boolean> => {
  const provider = getCacheProvider();

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
      logger.warn({ error }, "Upstash write failed");
      return false;
    }
  }

  return false;
};

export const consumeRateLimit = async (
  key: string,
  windowSeconds: number,
): Promise<{ count: number; ttlSeconds: number } | null> => {
  const provider = getCacheProvider();

  if (provider === "redis") {
    return withRedis(async (client) => {
      const count = await client.incr(key);

      if (count === 1) {
        await client.expire(key, windowSeconds);
      }

      const ttlSeconds = await client.ttl(key);
      return { count, ttlSeconds };
    });
  }

  if (provider === "upstash") {
    try {
      const countRaw = await upstashCall("incr", [key]);
      const count = Number(countRaw);

      if (count === 1) {
        await upstashCall("expire", [key, windowSeconds]);
      }

      const ttlRaw = await upstashCall("ttl", [key]);
      const ttlSeconds = Number(ttlRaw);
      return { count, ttlSeconds };
    } catch (error) {
      logger.warn({ error }, "Upstash rate-limit operation failed");
      return null;
    }
  }

  return null;
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
    try {
      const keysRaw = await upstashCall("keys", [pattern]);
      const keys = Array.isArray(keysRaw) ? keysRaw.map((key) => String(key)) : [];
      if (!Array.isArray(keys) || keys.length === 0) {
        return 0;
      }

      const deleted = await upstashCall("del", keys);
      return Number(deleted) || 0;
    } catch (error) {
      logger.warn({ error }, "Upstash pattern delete failed");
      return 0;
    }
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
      await upstashCall("ping");
      return true;
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
      await upstashCall("ping");
      return true;
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
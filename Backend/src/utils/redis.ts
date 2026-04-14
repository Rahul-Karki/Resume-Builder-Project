import { createClient } from "redis";
import { env } from "../config/env";
import { logger } from "../observability";

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;
let redisConnectPromise: Promise<RedisClient | null> | null = null;
let lastRedisFailureAt = 0;

const REDIS_RETRY_COOLDOWN_MS = 30_000;

const hasRedisConfiguration = Boolean(env.REDIS_URL);

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
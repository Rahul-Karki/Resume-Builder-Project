import crypto from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { appMetrics, logger } from "../observability";
import { getRedisClient, withRedis } from "../utils/redis";

const CACHE_NAMESPACE = "resume-builder:cache";

export type RedisCacheOptions = {
  scope: string;
  ttlSeconds: number;
  keyBuilder?: (req: Request) => string;
};

const hashValue = (value: string) => crypto.createHash("sha1").update(value).digest("hex");

const buildCacheKey = (scope: string, sourceKey: string) => `${CACHE_NAMESPACE}:${scope}:${hashValue(sourceKey)}`;

const buildCachePattern = (scope: string) => `${CACHE_NAMESPACE}:${scope}:*`;

export const createRedisCacheMiddleware = ({ scope, ttlSeconds, keyBuilder }: RedisCacheOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const cacheKey = buildCacheKey(scope, keyBuilder?.(req) ?? req.originalUrl);
    res.setHeader("X-Cache-Key", hashValue(cacheKey));

    const markMiss = (reason: string) => {
      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-Reason", reason);
    };

    const redisClient = await getRedisClient();

    if (!redisClient) {
      appMetrics.cacheMisses.add(1, { scope });
      markMiss("redis-unavailable");
      next();
      return;
    }

    let cached: string | null = null;
    try {
      cached = await redisClient.get(cacheKey);
    } catch (error) {
      logger.warn({ error, scope }, "Redis read failed");
      appMetrics.cacheMisses.add(1, { scope });
      markMiss("redis-read-error");
      next();
      return;
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { statusCode: number; body: unknown };
        appMetrics.cacheHits.add(1, { scope });
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Reason", "hit");
        res.status(parsed.statusCode).json(parsed.body);
        return;
      } catch (error) {
        logger.warn({ error, scope }, "Cached response could not be parsed");
        markMiss("invalid-cached-payload");
      }
    } else {
      markMiss("miss-no-entry");
    }

    appMetrics.cacheMisses.add(1, { scope });

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const statusCode = res.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        void redisClient
          .set(
            cacheKey,
            JSON.stringify({ statusCode, body }),
            { EX: ttlSeconds },
          )
          .catch((error) => {
            logger.warn({ error, scope }, "Redis write failed");
          });
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.setHeader("X-Cache-Reason", "non-2xx-not-cached");
      }

      return originalJson(body);
    }) as typeof res.json;

    next();
  };
};

export const invalidateRedisCache = async (scopes: string[]): Promise<void> => {
  await withRedis(async (client) => {
    for (const scope of scopes) {
      const pattern = buildCachePattern(scope);
      const keys: string[] = [];

      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(String(key));

        if (keys.length >= 200) {
          await client.del(keys);
          keys.length = 0;
        }
      }

      if (keys.length > 0) {
        await client.del(keys);
      }
    }
  });
};

export const redisCacheScopes = {
  publicTemplates: "public-templates",
  adminTemplates: "admin-templates",
  adminDashboard: "admin-dashboard",
  adminAnalytics: "admin-analytics",
} as const;
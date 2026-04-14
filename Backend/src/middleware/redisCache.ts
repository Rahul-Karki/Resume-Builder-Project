import crypto from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { appMetrics, logger } from "../observability";
import { withRedis } from "../utils/redis";

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
    const cached = await withRedis(async (client) => client.get(cacheKey));

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { statusCode: number; body: unknown };
        appMetrics.cacheHits.add(1, { scope });
        res.setHeader("X-Cache", "HIT");
        res.status(parsed.statusCode).json(parsed.body);
        return;
      } catch (error) {
        logger.warn({ error, scope }, "Cached response could not be parsed");
      }
    }

    appMetrics.cacheMisses.add(1, { scope });

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const statusCode = res.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        void withRedis(async (client) => {
          await client.set(
            cacheKey,
            JSON.stringify({ statusCode, body }),
            { EX: ttlSeconds },
          );
        });
        res.setHeader("X-Cache", "MISS");
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
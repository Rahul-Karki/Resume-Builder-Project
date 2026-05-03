import crypto from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { appMetrics, logger } from "../observability";
import { cacheGet, cacheSet, deleteByPattern, getCacheProvider } from "../utils/redis";
import { CACHE_SCOPE_NAMES, buildCacheScope } from "../constants/cacheScopes";

const CACHE_NAMESPACE = "resume-builder:cache";

export type RedisCacheOptions = {
  scope: string | ((req: Request) => string);
  metricsScope?: string;
  ttlSeconds: number;
  keyBuilder?: (req: Request) => string;
};

const hashValue = (value: string) => crypto.createHash("sha1").update(value).digest("hex");

const buildCacheKey = (scope: string, sourceKey: string) => `${CACHE_NAMESPACE}:${buildCacheScope(scope)}:${hashValue(sourceKey)}`;

const buildCachePattern = (scope: string) => `${CACHE_NAMESPACE}:${buildCacheScope(scope)}:*`;

export const createRedisCacheMiddleware = ({ scope, metricsScope, ttlSeconds, keyBuilder }: RedisCacheOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const resolvedScope = typeof scope === "function" ? scope(req) : scope;
    const scopeForMetrics = metricsScope ?? (typeof scope === "string" ? scope : "dynamic");
    const cacheKey = buildCacheKey(resolvedScope, keyBuilder?.(req) ?? req.originalUrl);
    res.setHeader("X-Cache-Key", hashValue(cacheKey));

    const markMiss = (reason: string) => {
      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-Reason", reason);
    };

    const provider = getCacheProvider();

    if (provider === "none") {
      appMetrics.cacheMisses.add(1, { scope: scopeForMetrics });
      markMiss("cache-backend-unavailable");
      next();
      return;
    }

    let cached: string | null = null;
    try {
      cached = await cacheGet(cacheKey);
    } catch (error) {
      logger.warn({ error, scope: resolvedScope }, "Cache read failed");
      appMetrics.cacheMisses.add(1, { scope: scopeForMetrics });
      markMiss("cache-read-error");
      next();
      return;
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { statusCode: number; body: unknown };
        appMetrics.cacheHits.add(1, { scope: scopeForMetrics });
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Reason", "hit");
        res.status(parsed.statusCode).json(parsed.body);
        return;
      } catch (error) {
        logger.warn({ error, scope: resolvedScope }, "Cached response could not be parsed");
        markMiss("invalid-cached-payload");
      }
    } else {
      markMiss("miss-no-entry");
    }

    appMetrics.cacheMisses.add(1, { scope: scopeForMetrics });

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      const statusCode = res.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        void cacheSet(
          cacheKey,
          JSON.stringify({ statusCode, body }),
          ttlSeconds,
        ).then((written) => {
          if (!written) {
            logger.warn({ scope: resolvedScope }, "Cache write skipped or failed");
          }
        }).catch((error) => {
          logger.warn({ error, scope: resolvedScope }, "Cache write failed");
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
  for (const scope of scopes) {
    await deleteByPattern(buildCachePattern(scope));
  }
};

export const redisCacheScopes = CACHE_SCOPE_NAMES;
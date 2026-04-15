import crypto from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { consumeRateLimit } from "../utils/redis";

const RATE_LIMIT_NAMESPACE = "resume-builder:rate-limit";

export type RedisRateLimitOptions = {
  scope: string;
  windowMs: number;
  max: number;
  keyBuilder?: (req: Request) => string;
  message?: string;
};

const hashValue = (value: string) => crypto.createHash("sha1").update(value).digest("hex");

const defaultKeyBuilder = (req: Request) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`);

export const createRedisRateLimitMiddleware = ({
  scope,
  windowMs,
  max,
  keyBuilder,
  message,
}: RedisRateLimitOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const limiterKey = `${RATE_LIMIT_NAMESPACE}:${scope}:${hashValue(keyBuilder?.(req) ?? defaultKeyBuilder(req))}`;
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

    const result = await consumeRateLimit(limiterKey, windowSeconds);

    if (!result) {
      next();
      return;
    }

    const remaining = Math.max(max - result.count, 0);
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));

    if (result.ttlSeconds > 0) {
      res.setHeader("Retry-After", String(result.ttlSeconds));
    }

    if (result.count > max) {
      res.status(429).json({
        message: message ?? "Too many requests. Please try again later.",
        retryAfterSeconds: result.ttlSeconds > 0 ? result.ttlSeconds : undefined,
      });
      return;
    }

    next();
  };
};
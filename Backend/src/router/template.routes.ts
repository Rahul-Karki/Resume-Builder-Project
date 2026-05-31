import { Router } from "express";
import { listPublicTemplates } from "../controllers/templateController";
import { validateRequest } from "../middleware/validateRequest";
import { env } from "../config/env";
import { createRedisCacheMiddleware } from "../middleware/redisCache";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { publicTemplateListQuerySchema } from "../validation/schemas";

const router = Router();

const publicTemplatesCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 600);

const publicTemplatesLimiter = createRedisRateLimitMiddleware({
  scope: "public-templates",
  windowMs: 60000,
  max: 60,
  keyBuilder: (req) => `ip:${req.ip}`,
  message: "Too many requests. Please try again later.",
});

router.get(
	"/",
	publicTemplatesLimiter,
	validateRequest({ query: publicTemplateListQuerySchema }),
	createRedisCacheMiddleware({
		scope: "public-templates",
		ttlSeconds: publicTemplatesCacheTtlSeconds,
	}),
	listPublicTemplates,
);

export default router;

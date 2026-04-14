import { Router } from "express";
import { listPublicTemplates } from "../controllers/templateController";
import { validateRequest } from "../middleware/validateRequest";
import { env } from "../config/env";
import { createRedisCacheMiddleware } from "../middleware/redisCache";
import { publicTemplateListQuerySchema } from "../validation/schemas";

const router = Router();

const publicTemplatesCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 600);

router.get(
	"/",
	validateRequest({ query: publicTemplateListQuerySchema }),
	createRedisCacheMiddleware({
		scope: "public-templates",
		ttlSeconds: publicTemplatesCacheTtlSeconds,
	}),
	listPublicTemplates,
);

export default router;

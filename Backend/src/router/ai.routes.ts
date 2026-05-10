import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { validateRequest } from "../middleware/validateRequest";
import { env } from "../config/env";
import { aiGrammarSchema, aiTextSchema } from "../validation/schemas";
import { checkGrammarHandler, enhanceBulletHandler, improveTextHandler } from "../controllers/aiController";

const router = express.Router();

const aiLimiter = createRedisRateLimitMiddleware({
  scope: "ai-writing",
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  max: env.AI_RATE_LIMIT_MAX,
  keyBuilder: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: "Too many AI requests. Please wait and try again.",
});

router.use(authMiddleware);

router.post("/improve-text", validateRequest({ body: aiTextSchema }), aiLimiter, improveTextHandler);
router.post("/check-grammar", validateRequest({ body: aiGrammarSchema }), aiLimiter, checkGrammarHandler);
router.post("/enhance-bullet", validateRequest({ body: aiTextSchema }), aiLimiter, enhanceBulletHandler);

export default router;

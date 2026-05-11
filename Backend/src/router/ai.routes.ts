import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { validateRequest } from "../middleware/validateRequest";
import { creditDeductionMiddleware } from "../middleware/creditDeduction";
import { deduplicationMiddleware, createOperationDeduplication } from "../middleware/requestDeduplication";
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

// Apply credit deduction middleware to all AI routes
router.use("/improve-text", creditDeductionMiddleware({
  operation: "improve-text",
}));

router.use("/check-grammar", creditDeductionMiddleware({
  operation: "check-grammar",
}));

router.use("/enhance-bullet", creditDeductionMiddleware({
  operation: "enhance-bullet",
}));

// Apply deduplication middleware to reduce redundant AI calls
router.use("/improve-text", createOperationDeduplication("improve-text", 600)); // 10 minutes
router.use("/check-grammar", createOperationDeduplication("check-grammar", 300)); // 5 minutes
router.use("/enhance-bullet", createOperationDeduplication("enhance-bullet", 600)); // 10 minutes

router.post("/improve-text", validateRequest({ body: aiTextSchema }), aiLimiter, improveTextHandler);
router.post("/check-grammar", validateRequest({ body: aiGrammarSchema }), aiLimiter, checkGrammarHandler);
router.post("/enhance-bullet", validateRequest({ body: aiTextSchema }), aiLimiter, enhanceBulletHandler);

export default router;

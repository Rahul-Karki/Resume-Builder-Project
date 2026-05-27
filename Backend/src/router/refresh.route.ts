import express from "express";
import { issueCsrfToken, refreshAccessToken } from "../controllers/refreshController";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { env } from "../config/env";

const csrfLimiter = createRedisRateLimitMiddleware({
  scope: "csrf-token",
  windowMs: 60000,
  max: 60,
  message: "Too many CSRF token requests. Please try again later.",
});

const refreshLimiter = createRedisRateLimitMiddleware({
  scope: "token-refresh",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(10, Math.floor(env.REDIS_RATE_LIMIT_MAX / 3)),
  message: "Too many refresh requests. Please try again later.",
});

const router = express.Router();

router.get("/csrf", csrfLimiter, issueCsrfToken);
router.post("/refresh", refreshLimiter, refreshAccessToken);

export default router;
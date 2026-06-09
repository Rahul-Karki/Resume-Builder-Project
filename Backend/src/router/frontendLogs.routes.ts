import { Router } from "express";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { frontendLogsHandler } from "../controllers/frontendLogsController";

const router = Router();

const logIngestLimiter = createRedisRateLimitMiddleware({
  scope: "frontend-logs",
  windowMs: 60_000,
  max: 60,
  keyBuilder: (req) => `ip:${req.ip}`,
  message: "Too many log submissions.",
});

router.post("/", logIngestLimiter, frontendLogsHandler);

export default router;

import express from "express";
import mongoose from "mongoose";
import { checkRedisHealth, getCacheProvider } from "../utils/redis";
import { logger } from "../observability";
import { Counter, Gauge, collectDefaultMetrics, Registry } from "prom-client";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { env } from "../config/env";

const router = express.Router();

const healthLimiter = createRedisRateLimitMiddleware({
  scope: "health",
  windowMs: 60_000,
  max: env.REDIS_RATE_LIMIT_MAX,
  keyBuilder: (req) => `ip:${req.ip}`,
  message: "Too many health check requests.",
});

// ─── Uptime Monitoring ─────────────────────────────────────────────────────────
const startTime = Date.now();
const uptimeRegistry = new Registry();
collectDefaultMetrics({ register: uptimeRegistry, prefix: "uptime_" });

const uptimeGauge = new Gauge({
  name: "service_uptime_seconds",
  help: "Service uptime in seconds",
  registers: [uptimeRegistry],
});
const healthCheckTotalCounter = new Counter({
  name: "health_checks_total",
  help: "Total health checks performed",
  labelNames: ["status"],
  registers: [uptimeRegistry],
});

// Update uptime gauge every 30 seconds
setInterval(() => {
  uptimeGauge.set(Math.floor((Date.now() - startTime) / 1000));
}, 30000);
uptimeGauge.set(0);
const checkMongoHealth = async () => {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  try {
    await mongoose.connection.db?.admin().ping();
    return true;
  } catch (error) {
    logger.warn({ error }, "Mongo health ping failed");
    return false;
  }
};

const getUptimeMetrics = () => ({
  uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  uptimeHuman: formatUptime(Date.now() - startTime),
  startTime: new Date(startTime).toISOString(),
});

const formatUptime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const sendHealthResponse = async (_req: express.Request, res: express.Response) => {
  const cacheProvider = getCacheProvider();
  // Skip Redis health ping when using memory-only cache — saves a command on every health check
  const shouldCheckRedis = cacheProvider !== "none";

  const [mongoHealthy, redisHealthy] = await Promise.all([
    checkMongoHealth(),
    shouldCheckRedis ? checkRedisHealth() : Promise.resolve(true),
  ]);

  // Mongo is the only hard dependency. Redis has in-memory fallbacks.
  const status = !mongoHealthy ? "unhealthy" : !redisHealthy ? "degraded" : "ok";

  if (!redisHealthy && shouldCheckRedis) {
    logger.warn(
      { mongoHealthy, redisHealthy },
      "Health check: Redis unavailable — using in-memory fallbacks",
    );
  }

  const healthStatus = mongoHealthy ? 200 : 503;
  healthCheckTotalCounter.labels(status).inc();
  uptimeGauge.set(Math.floor((Date.now() - startTime) / 1000));

  res.status(healthStatus).json({
    status,
    mongo: mongoHealthy ? "up" : "down",
    redis: shouldCheckRedis
      ? (redisHealthy ? "up" : "down (in-memory fallback active)")
      : "up (in-memory cache)",
    uptime: getUptimeMetrics(),
  });
};

router.get("/", healthLimiter, sendHealthResponse);

router.get("/deep", healthLimiter, sendHealthResponse);

// ─── Uptime & SLA endpoint ─────────────────────────────────────────────────────
router.get("/uptime", healthLimiter, (_req: express.Request, res: express.Response) => {
  healthCheckTotalCounter.labels("uptime_check").inc();
  res.json({
    status: "ok",
    ...getUptimeMetrics(),
    slaLabels: ["99.9%", "99.95%", "99.99%"],
    currentSla: process.env.SLA_TARGET || "99.9%",
  });
});

// ─── Prometheus metrics endpoint ───────────────────────────────────────────────
router.get("/metrics", healthLimiter, async (_req: express.Request, res: express.Response) => {
  try {
    res.set("Content-Type", uptimeRegistry.contentType);
    const metrics = await uptimeRegistry.metrics();
    res.send(metrics);
  } catch {
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

export default router;

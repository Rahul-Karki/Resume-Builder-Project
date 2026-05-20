import express from "express";
import mongoose from "mongoose";
import { checkRedisHealth, getCacheProvider } from "../utils/redis";
import { logger } from "../observability";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import WorkerHeartbeat from "../models/WorkerHeartbeat";
import { getResumeQueue, getResumeQueueRuntimeInfo } from "../queue/resumeQueue";
import { Counter, Gauge, collectDefaultMetrics, Registry } from "prom-client";

const router = express.Router();

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
const QUEUE_COUNTS_CACHE_TTL_MS = 10_000;

let cachedQueueCounts: Record<string, number> | null = null;
let cachedQueueCountsAt = 0;

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

const sendResumeDownloadHealthResponse = async (_req: express.Request, res: express.Response) => {
  const runtimeInfo = getResumeQueueRuntimeInfo();
  const heartbeatFreshMs = 90_000;
  const heartbeatCutoff = new Date(Date.now() - heartbeatFreshMs);

  try {
    const queueCountsPromise = (async () => {
      const now = Date.now();
      if (cachedQueueCounts && now - cachedQueueCountsAt < QUEUE_COUNTS_CACHE_TTL_MS) {
        return cachedQueueCounts;
      }

      const counts = await getResumeQueue().getJobCounts("waiting", "active", "delayed", "failed", "completed", "paused");
      cachedQueueCounts = counts;
      cachedQueueCountsAt = now;
      return counts;
    })();

    const [mongoHealthy, queueCounts, dbCounts, latestHeartbeat] = await Promise.all([
      checkMongoHealth(),
      queueCountsPromise,
      ResumeDownloadJob.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).exec(),
      WorkerHeartbeat.findOne({
        serviceName: runtimeInfo.serviceName,
        queueName: runtimeInfo.queueName,
        queuePrefix: runtimeInfo.queuePrefix,
      }).sort({ lastSeenAt: -1 }).lean(),
    ]);

    const workerFresh = Boolean(latestHeartbeat && latestHeartbeat.lastSeenAt >= heartbeatCutoff);
    const overallHealthy = mongoHealthy && workerFresh;
    const downloadDbCounts: Record<string, number> = {};

    for (const row of dbCounts) {
      downloadDbCounts[row._id] = row.count;
    }

    if (!overallHealthy) {
      logger.warn(
        {
          mongoHealthy,
          workerFresh,
          latestHeartbeatAt: latestHeartbeat?.lastSeenAt,
          ...runtimeInfo,
        },
        "Resume download health check degraded",
      );
    }

    res.status(overallHealthy ? 200 : 503).json({
      status: overallHealthy ? "ok" : "degraded",
      mongo: mongoHealthy ? "up" : "down",
      worker: workerFresh ? "up" : "down",
      runtime: runtimeInfo,
      queueCounts,
      dbCounts: downloadDbCounts,
      latestWorkerHeartbeat: latestHeartbeat
        ? {
            workerId: latestHeartbeat.workerId,
            status: latestHeartbeat.status,
            lastSeenAt: latestHeartbeat.lastSeenAt,
            details: latestHeartbeat.details ?? {},
          }
        : null,
    });
  } catch (error) {
    logger.error({ error, ...runtimeInfo }, "Resume download health check failed");
    res.status(503).json({
      status: "degraded",
      runtime: runtimeInfo,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

router.get("/", sendHealthResponse);

router.get("/deep", sendHealthResponse);

router.get("/downloads", sendResumeDownloadHealthResponse);

// ─── Uptime & SLA endpoint ─────────────────────────────────────────────────────
router.get("/uptime", (_req: express.Request, res: express.Response) => {
  healthCheckTotalCounter.labels("uptime_check").inc();
  res.json({
    status: "ok",
    ...getUptimeMetrics(),
    slaLabels: ["99.9%", "99.95%", "99.99%"],
    currentSla: process.env.SLA_TARGET || "99.9%",
  });
});

// ─── Prometheus metrics endpoint ───────────────────────────────────────────────
router.get("/metrics", async (_req: express.Request, res: express.Response) => {
  try {
    res.set("Content-Type", uptimeRegistry.contentType);
    const metrics = await uptimeRegistry.metrics();
    res.send(metrics);
  } catch {
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

export default router;

import express from "express";
import mongoose from "mongoose";
import { checkRedisHealth, getCacheProvider } from "../utils/redis";
import { logger } from "../observability";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import WorkerHeartbeat from "../models/WorkerHeartbeat";
import { getResumeQueue, getResumeQueueRuntimeInfo } from "../queue/resumeQueue";

const router = express.Router();
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

  res.status(mongoHealthy ? 200 : 503).json({
    status,
    mongo: mongoHealthy ? "up" : "down",
    redis: shouldCheckRedis
      ? (redisHealthy ? "up" : "down (in-memory fallback active)")
      : "up (in-memory cache)",
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

export default router;

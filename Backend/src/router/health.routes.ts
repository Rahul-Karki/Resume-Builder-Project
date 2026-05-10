import express from "express";
import mongoose from "mongoose";
import { checkRedisHealth } from "../utils/redis";
import { logger } from "../observability";
import ResumeDownloadJob from "../models/ResumeDownloadJob";
import WorkerHeartbeat from "../models/WorkerHeartbeat";
import { getResumeQueue, getResumeQueueRuntimeInfo } from "../queue/resumeQueue";

const router = express.Router();

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
  const [mongoHealthy, redisHealthy] = await Promise.all([
    checkMongoHealth(),
    checkRedisHealth(),
  ]);

  // Mongo is the only hard dependency. Redis has in-memory fallbacks.
  const status = !mongoHealthy ? "unhealthy" : !redisHealthy ? "degraded" : "ok";

  if (!redisHealthy) {
    logger.warn(
      { mongoHealthy, redisHealthy },
      "Health check: Redis unavailable — using in-memory fallbacks",
    );
  }

  res.status(mongoHealthy ? 200 : 503).json({
    status,
    mongo: mongoHealthy ? "up" : "down",
    redis: redisHealthy ? "up" : "down (in-memory fallback active)",
  });
};

const sendResumeDownloadHealthResponse = async (_req: express.Request, res: express.Response) => {
  const runtimeInfo = getResumeQueueRuntimeInfo();
  const heartbeatFreshMs = 90_000;
  const heartbeatCutoff = new Date(Date.now() - heartbeatFreshMs);

  try {
    const [mongoHealthy, queueCounts, dbCounts, latestHeartbeat] = await Promise.all([
      checkMongoHealth(),
      getResumeQueue().getJobCounts("waiting", "active", "delayed", "failed", "completed", "paused"),
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

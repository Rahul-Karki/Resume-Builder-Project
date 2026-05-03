import express from "express";
import mongoose from "mongoose";
import { getRedisClient } from "../utils/redis";
import { logger } from "../observability";

const router = express.Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/deep", async (_req, res) => {
  const redisClient = await getRedisClient();
  const dbState = mongoose.connection.readyState;
  const redisHealthy = redisClient ? redisClient.isReady || redisClient.isOpen : false;

  const databaseHealthy = dbState === 1;
  const overallHealthy = databaseHealthy && redisHealthy;

  if (!overallHealthy) {
    logger.warn(
      { databaseHealthy, redisHealthy, dbState },
      "Deep health check reported an unhealthy dependency",
    );
  }

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    dependencies: {
      database: databaseHealthy ? "up" : "down",
      redis: redisHealthy ? "up" : "down",
    },
  });
});

export default router;

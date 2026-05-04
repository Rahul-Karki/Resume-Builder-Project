import express from "express";
import mongoose from "mongoose";
import { checkRedisHealth } from "../utils/redis";
import { logger } from "../observability";

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

  const overallHealthy = mongoHealthy && redisHealthy;

  if (!overallHealthy) {
    logger.warn(
      { mongoHealthy, redisHealthy },
      "Health check reported an unhealthy dependency",
    );
  }

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? "ok" : "degraded",
    mongo: mongoHealthy ? "up" : "down",
    redis: redisHealthy ? "up" : "down",
  });
};

router.get("/", sendHealthResponse);

router.get("/deep", sendHealthResponse);

export default router;

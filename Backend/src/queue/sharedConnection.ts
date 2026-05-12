import {
  type BullmqConnectionOptions,
  createBullmqConnection,
  resolveBullmqRedisUrl,
} from "../../../shared/src/bullmq";
import { env } from "../config/env";

// Share a single BullMQ Redis connection across all queues
// to minimize Redis command overhead (each connection polls independently).
let sharedConnection: BullmqConnectionOptions | null = null;

export const getSharedBullmqConnection = (): BullmqConnectionOptions => {
  if (!sharedConnection) {
    const redisUrl = resolveBullmqRedisUrl(env.BULLMQ_REDIS_URL, env.REDIS_URL);

    sharedConnection = createBullmqConnection({
      redisUrl,
      connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
      serviceName: env.SERVICE_NAME,
    });
  }

  return sharedConnection;
};

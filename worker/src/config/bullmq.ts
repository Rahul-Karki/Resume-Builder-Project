import {
  type BullmqConnectionOptions,
  createBullmqConnection,
  getBullmqRuntimeInfo as sharedGetBullmqRuntimeInfo,
  resolveBullmqRedisUrl,
} from "../../../shared/src/bullmq";
import { env } from "./env";

const getRedisUrl = () => resolveBullmqRedisUrl(env.BULLMQ_REDIS_URL, env.REDIS_URL);

// Share a single BullMQ connection across all workers and queue events
// to minimize Redis command overhead (each connection polls independently).
let sharedConnection: BullmqConnectionOptions | null = null;

export const getBullmqConnection = (): BullmqConnectionOptions => {
  if (!sharedConnection) {
    sharedConnection = createBullmqConnection({
      redisUrl: getRedisUrl(),
      serviceName: env.SERVICE_NAME,
      connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
    });
  }

  return sharedConnection;
};

export const getBullmqRuntimeInfo = (queueName: string) => sharedGetBullmqRuntimeInfo(
  queueName,
  env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  getRedisUrl(),
  env.SERVICE_NAME,
);

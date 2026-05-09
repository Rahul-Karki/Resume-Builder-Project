import {
  createBullmqConnection,
  getBullmqRuntimeInfo as sharedGetBullmqRuntimeInfo,
  resolveBullmqRedisUrl,
} from "../../../shared/src/bullmq";
import { env } from "./env";

const getRedisUrl = () => resolveBullmqRedisUrl(env.BULLMQ_REDIS_URL, env.REDIS_URL);

export const getBullmqConnection = () => createBullmqConnection({
  redisUrl: getRedisUrl(),
  serviceName: env.SERVICE_NAME,
  connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
});

export const getBullmqRuntimeInfo = (queueName: string) => sharedGetBullmqRuntimeInfo(
  queueName,
  env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  getRedisUrl(),
  env.SERVICE_NAME,
);

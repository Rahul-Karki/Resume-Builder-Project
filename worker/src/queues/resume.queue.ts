import { RESUME_DOWNLOAD_QUEUE_NAME, getBullmqRuntimeInfo } from "../../../shared/src/bullmq";
import { env } from "../config/env";

export const resumeDownloadQueueName = RESUME_DOWNLOAD_QUEUE_NAME;

export const getResumeQueueRuntimeInfo = () => getBullmqRuntimeInfo(
  resumeDownloadQueueName,
  env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  env.BULLMQ_REDIS_URL || env.REDIS_URL,
  env.SERVICE_NAME,
);

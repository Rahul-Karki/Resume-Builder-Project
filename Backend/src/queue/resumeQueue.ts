import { Queue, type JobsOptions } from "bullmq";
import { env } from "../config/env";
import { logger } from "../observability";
import {
  createBullmqJobId,
  createBullmqQueueOptions,
  getBullmqRuntimeInfo,
  RESUME_DOWNLOAD_QUEUE_NAME,
  resolveBullmqRedisUrl,
  type ResumeDownloadJobData,
} from "../../../shared/src/bullmq";
import { getSharedBullmqConnection } from "./sharedConnection";

export { RESUME_DOWNLOAD_QUEUE_NAME as resumeDownloadQueueName } from "../../../shared/src/bullmq";

let resumeQueueInstance: Queue<ResumeDownloadJobData> | null = null;

export const getResumeQueueRuntimeInfo = () => {
  const redisUrl = resolveBullmqRedisUrl(env.BULLMQ_REDIS_URL, env.REDIS_URL);

  return getBullmqRuntimeInfo(RESUME_DOWNLOAD_QUEUE_NAME, env.RESUME_DOWNLOAD_QUEUE_PREFIX, redisUrl, env.SERVICE_NAME);
};

export const createResumeDownloadJobId = (data: Record<string, unknown>) => {
  return createBullmqJobId("resume-download", data);
};

export const getResumeQueue = () => {
  if (!resumeQueueInstance) {
    resumeQueueInstance = new Queue<ResumeDownloadJobData>(RESUME_DOWNLOAD_QUEUE_NAME, {
      connection: getSharedBullmqConnection(),
      prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
      defaultJobOptions: createBullmqQueueOptions(env.RESUME_DOWNLOAD_JOB_ATTEMPTS, env.RESUME_DOWNLOAD_BACKOFF_DELAY_MS) satisfies JobsOptions,
    });

    resumeQueueInstance.on("error", (error) => {
      logger.error({ error, queueName: RESUME_DOWNLOAD_QUEUE_NAME }, "Resume queue connection error");
    });
  }

  return resumeQueueInstance;
};

export const ensureResumeQueueReady = async () => {
  const queue = getResumeQueue();
  try {
    await queue.waitUntilReady();
    const runtimeInfo = getResumeQueueRuntimeInfo();
    logger.info(
      {
        ...runtimeInfo,
      },
      "Resume queue Redis connection verified",
    );
  } catch (error) {
    const runtimeInfo = getResumeQueueRuntimeInfo();
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        error: errorMessage,
        ...runtimeInfo,
      },
      "Failed to verify resume queue Redis connection",
    );
    throw new Error(
      `Resume download queue unavailable: ${errorMessage}. Ensure BULLMQ_REDIS_URL or REDIS_URL is properly configured.`,
    );
  }
};

export const closeResumeQueue = async () => {
  if (!resumeQueueInstance) {
    return;
  }

  await resumeQueueInstance.close();
  resumeQueueInstance = null;
};

export const enqueueResumeDownloadJob = async (data: ResumeDownloadJobData) => {
  const queue = getResumeQueue();
  const jobId = createResumeDownloadJobId(data);

  logger.info({ jobId, userId: data.userId, preset: data.preset }, "Enqueuing resume download job");

  try {
    const job = await queue.add("generate-resume-pdf", data, {
      jobId,
      ...createBullmqQueueOptions(env.RESUME_DOWNLOAD_JOB_ATTEMPTS, env.RESUME_DOWNLOAD_BACKOFF_DELAY_MS),
    });

    logger.info({ jobId, userId: data.userId, jobStatus: job.id }, "Resume download job successfully enqueued");
    return job;
  } catch (error) {
    logger.error(
      { jobId, userId: data.userId, error: error instanceof Error ? error.message : String(error) },
      "Failed to enqueue resume download job",
    );
    throw error;
  }
};

export const requeueResumeDownloadJob = async (data: ResumeDownloadJobData) => {
  const queue = getResumeQueue();
  const jobId = createResumeDownloadJobId(data);

  try {
    const existingQueueJob = await queue.getJob(jobId);

    if (existingQueueJob) {
      const state = await existingQueueJob.getState().catch(() => "unknown");
      logger.info({ jobId, state }, "Removing existing BullMQ job before requeue");
      await existingQueueJob.remove();
    }

    return enqueueResumeDownloadJob(data);
  } catch (error) {
    logger.error(
      { jobId, userId: data.userId, error: error instanceof Error ? error.message : String(error) },
      "Failed to requeue resume download job",
    );
    throw error;
  }
};

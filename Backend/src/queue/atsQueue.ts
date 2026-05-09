import { Queue, QueueEvents, type JobsOptions } from "bullmq";
import { env } from "../config/env";
import { logger } from "../observability";
import {
  ATS_ANALYSIS_QUEUE_NAME,
  createBullmqConnection,
  createBullmqJobId,
  createBullmqQueueOptions,
  getBullmqRuntimeInfo,
  resolveBullmqRedisUrl,
  type AtsAnalysisJobData,
} from "../../../shared/src/bullmq";

export type { AtsAnalysisJobData } from "../../../shared/src/bullmq";

let atsQueueInstance: Queue<AtsAnalysisJobData> | null = null;
let atsQueueEventsInstance: QueueEvents | null = null;

const getAtsBullmqConnection = () => {
  const redisUrl = resolveBullmqRedisUrl(env.BULLMQ_REDIS_URL, env.REDIS_URL);

  return createBullmqConnection({
    redisUrl,
    connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
    serviceName: `${env.SERVICE_NAME}-ats-analysis`,
  });
};

export const createAtsAnalysisJobId = (data: Record<string, unknown>) => createBullmqJobId("ats-analysis", data);

export const getAtsQueueRuntimeInfo = () => {
  const redisUrl = resolveBullmqRedisUrl(env.BULLMQ_REDIS_URL, env.REDIS_URL);
  return getBullmqRuntimeInfo(ATS_ANALYSIS_QUEUE_NAME, env.RESUME_DOWNLOAD_QUEUE_PREFIX, redisUrl, env.SERVICE_NAME);
};

export const getAtsQueue = () => {
  if (!atsQueueInstance) {
    atsQueueInstance = new Queue<AtsAnalysisJobData>(ATS_ANALYSIS_QUEUE_NAME, {
      connection: getAtsBullmqConnection(),
      prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
      defaultJobOptions: createBullmqQueueOptions(env.RESUME_DOWNLOAD_JOB_ATTEMPTS, env.RESUME_DOWNLOAD_BACKOFF_DELAY_MS) satisfies JobsOptions,
    });

    atsQueueInstance.on("error", (error) => {
      logger.error({ error, queueName: ATS_ANALYSIS_QUEUE_NAME }, "ATS queue connection error");
    });
  }

  return atsQueueInstance;
};

export const getAtsQueueEvents = () => {
  if (!atsQueueEventsInstance) {
    atsQueueEventsInstance = new QueueEvents(ATS_ANALYSIS_QUEUE_NAME, {
      connection: getAtsBullmqConnection(),
      prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
    });

    atsQueueEventsInstance.on("error", (error: Error) => {
      logger.error({ error, queueName: ATS_ANALYSIS_QUEUE_NAME }, "ATS queue events connection error");
    });
  }

  return atsQueueEventsInstance;
};

export const ensureAtsQueueReady = async () => {
  const queue = getAtsQueue();
  const queueEvents = getAtsQueueEvents();

  await Promise.all([queue.waitUntilReady(), queueEvents.waitUntilReady()]);
  logger.info({ ...getAtsQueueRuntimeInfo() }, "ATS queue Redis connection verified");
};

export const closeAtsQueue = async () => {
  const queue = atsQueueInstance;
  const queueEvents = atsQueueEventsInstance;

  atsQueueInstance = null;
  atsQueueEventsInstance = null;

  await Promise.all([
    queue ? queue.close() : Promise.resolve(),
    queueEvents ? queueEvents.close() : Promise.resolve(),
  ]);
};

export const enqueueAtsAnalysisJob = async (data: AtsAnalysisJobData) => {
  const queue = getAtsQueue();
  const jobId = createAtsAnalysisJobId(data);

  logger.info({ jobId, userId: data.userId, resumeId: data.resumeId }, "Enqueuing ATS analysis job");

  try {
    const job = await queue.add("analyze-ats", data, {
      jobId,
      ...createBullmqQueueOptions(env.RESUME_DOWNLOAD_JOB_ATTEMPTS, env.RESUME_DOWNLOAD_BACKOFF_DELAY_MS),
    });

    logger.info({ jobId, userId: data.userId, queueJobId: job.id }, "ATS analysis job successfully enqueued");
    return job;
  } catch (error) {
    logger.error(
      { jobId, userId: data.userId, error: error instanceof Error ? error.message : String(error) },
      "Failed to enqueue ATS analysis job",
    );
    throw error;
  }
};

export const requeueAtsAnalysisJob = async (data: AtsAnalysisJobData) => {
  const queue = getAtsQueue();
  const jobId = createAtsAnalysisJobId(data);

  try {
    const existingJob = await queue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState().catch(() => "unknown");
      logger.info({ jobId, state }, "Removing existing ATS BullMQ job before requeue");
      await existingJob.remove();
    }

    return enqueueAtsAnalysisJob(data);
  } catch (error) {
    logger.error(
      { jobId, userId: data.userId, error: error instanceof Error ? error.message : String(error) },
      "Failed to requeue ATS analysis job",
    );
    throw error;
  }
};
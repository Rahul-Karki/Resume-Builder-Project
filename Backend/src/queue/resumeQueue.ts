import crypto from "crypto";
import { Queue, type JobsOptions } from "bullmq";
import { env } from "../config/env";
import { logger } from "../observability";

export type ResumeDownloadPreset = "web" | "standard" | "print";

export type ResumeDownloadJobData = {
  userId: string;
  preset: ResumeDownloadPreset;
  resumeId?: string;
  resume: Record<string, unknown>;
  requestId?: string;
};

export const resumeDownloadQueueName = "resumeQueue";

let resumeQueueInstance: Queue<ResumeDownloadJobData> | null = null;

export const getBullmqConnection = () => {
  const redisUrl = env.BULLMQ_REDIS_URL || env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("BULLMQ_REDIS_URL or REDIS_URL must be configured for resume downloads");
  }

  if (redisUrl === "/") {
    throw new Error("Invalid BullMQ Redis URL: '/' is not a valid Redis connection string. Set BULLMQ_REDIS_URL or REDIS_URL to a real Redis URL like redis://host:6379/0");
  }

  try {
    const parsed = new URL(redisUrl);
    if (!parsed.protocol.startsWith("redis")) {
      throw new Error("Redis URL must use redis://, rediss://, or a supported Redis endpoint");
    }
  } catch (error) {
    throw new Error(`Invalid BullMQ Redis URL: ${redisUrl}. ${(error as Error).message}`);
  }

  return {
    url: redisUrl,
    connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectionName: `${env.SERVICE_NAME}-resume-downloads`,
  };
};

export const getResumeQueueRuntimeInfo = () => {
  const redisUrl = env.BULLMQ_REDIS_URL || env.REDIS_URL;
  const parsed = redisUrl ? new URL(redisUrl) : null;

  return {
    queueName: resumeDownloadQueueName,
    queuePrefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
    redisProtocol: parsed?.protocol.replace(":", "") || "not-configured",
    redisHost: parsed?.host || "not-configured",
    serviceName: env.SERVICE_NAME,
  };
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

  return `{${entries.join(",")}}`;
};

const resumeDownloadJobIdentity = (data: Record<string, unknown>) => {
  const { requestId: _requestId, ...stableData } = data;
  return stableData;
};

export const createResumeDownloadJobId = (data: Record<string, unknown>) => {
  const digest = crypto.createHash("sha256").update(stableStringify(resumeDownloadJobIdentity(data))).digest("hex");
  return `resume-download:${digest}`;
};

export const getResumeQueue = () => {
  if (!resumeQueueInstance) {
    resumeQueueInstance = new Queue<ResumeDownloadJobData>(resumeDownloadQueueName, {
      connection: getBullmqConnection(),
      prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: env.RESUME_DOWNLOAD_BACKOFF_DELAY_MS,
        },
        removeOnComplete: {
          age: 60 * 60 * 24,
          count: 2000,
        },
        removeOnFail: {
          age: 60 * 60 * 24 * 7,
          count: 5000,
        },
      } satisfies JobsOptions,
    });
  }

  return resumeQueueInstance;
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

  return queue.add("generate-resume-pdf", data, {
    jobId,
    attempts: env.RESUME_DOWNLOAD_JOB_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: env.RESUME_DOWNLOAD_BACKOFF_DELAY_MS,
    },
    removeOnComplete: {
      age: 60 * 60 * 24,
      count: 2000,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 7,
      count: 5000,
    },
  });
};

export const requeueResumeDownloadJob = async (data: ResumeDownloadJobData) => {
  const queue = getResumeQueue();
  const jobId = createResumeDownloadJobId(data);
  const existingQueueJob = await queue.getJob(jobId);

  if (existingQueueJob) {
    const state = await existingQueueJob.getState().catch(() => "unknown");
    logger.info({ jobId, state }, "Removing existing BullMQ job before requeue");
    await existingQueueJob.remove();
  }

  return enqueueResumeDownloadJob(data);
};

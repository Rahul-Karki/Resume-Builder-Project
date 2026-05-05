import crypto from "crypto";
import { Queue, type JobsOptions } from "bullmq";
import { env } from "../config/env";

export type ResumeDownloadPreset = "web" | "standard" | "print";

export type ResumeDownloadJobData = {
  userId: string;
  preset: ResumeDownloadPreset;
  resumeId?: string;
  resume: Record<string, unknown>;
  requestId?: string;
};

const queueName = "resumeQueue";

let resumeQueueInstance: Queue<ResumeDownloadJobData> | null = null;

const getBullmqConnection = () => {
  const redisUrl = env.BULLMQ_REDIS_URL || env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("BULLMQ_REDIS_URL or REDIS_URL must be configured for resume downloads");
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

export const createResumeDownloadJobId = (data: Record<string, unknown>) => {
  const digest = crypto.createHash("sha256").update(stableStringify(data)).digest("hex");
  return `resume-download:${digest}`;
};

export const getResumeQueue = () => {
  if (!resumeQueueInstance) {
    resumeQueueInstance = new Queue<ResumeDownloadJobData>(queueName, {
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
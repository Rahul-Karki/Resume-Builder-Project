import crypto from "crypto";

export const RESUME_DOWNLOAD_QUEUE_NAME = "resumeQueue";
export const ATS_ANALYSIS_QUEUE_NAME = "atsAnalysisQueue";

export type ResumeDownloadPreset = "web" | "standard" | "print";

export type ResumeDownloadJobData = {
  userId: string;
  preset: ResumeDownloadPreset;
  resumeId?: string;
  resume: Record<string, unknown>;
  requestId?: string;
};

export type AtsAnalysisJobData = {
  userId: string;
  resumeId: string;
  resume: Record<string, unknown>;
  jobTitle?: string;
  keywords: string[];
  requestId?: string;
};

export type BullmqConnectionConfig = {
  redisUrl: string;
  serviceName: string;
  connectTimeoutMs: number;
};

export type BullmqConnectionOptions = {
  url: string;
  connectTimeout: number;
  maxRetriesPerRequest: null;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  connectionName: string;
};

export type BullmqJobOptions = {
  attempts: number;
  backoff: {
    type: "exponential";
    delay: number;
  };
  removeOnComplete: {
    age: number;
    count: number;
  };
  removeOnFail: {
    age: number;
    count: number;
  };
};

export const resolveBullmqRedisUrl = (primary: string, fallback: string) => {
  const redisUrl = (primary || fallback || "").trim();

  if (!redisUrl) {
    throw new Error("BULLMQ_REDIS_URL or REDIS_URL must be configured for BullMQ");
  }

  if (redisUrl === "/") {
    throw new Error("Invalid BullMQ Redis URL: '/' is not a valid Redis connection string");
  }

  try {
    const parsed = new URL(redisUrl);
    if (!parsed.protocol.startsWith("redis")) {
      throw new Error("Redis URL must use redis://, rediss://, or a supported Redis endpoint");
    }
  } catch (error) {
    throw new Error(`Invalid BullMQ Redis URL: ${redisUrl}. ${(error as Error).message}`);
  }

  return redisUrl;
};

export const createBullmqConnection = ({ redisUrl, serviceName, connectTimeoutMs }: BullmqConnectionConfig): BullmqConnectionOptions => ({
  url: redisUrl,
  connectTimeout: connectTimeoutMs,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectionName: serviceName,
});

export const createBullmqQueueOptions = (attempts: number, backoffDelayMs: number): BullmqJobOptions => ({
  attempts,
  backoff: {
    type: "exponential",
    delay: backoffDelayMs,
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

const stripVolatileJobFields = (data: Record<string, unknown>) => {
  const { requestId: _requestId, ...stableData } = data;
  return stableData;
};

export const createBullmqJobId = (namespace: string, data: Record<string, unknown>) => {
  const digest = crypto
    .createHash("sha256")
    .update(stableStringify(stripVolatileJobFields(data)))
    .digest("hex");

  return `${namespace}-${digest}`;
};

export const createResumeDownloadFileName = (jobId: string) => `${jobId}.pdf`;

export const resolveResumeDownloadUrl = (jobId: string) => `/api/resumes/download-result/${encodeURIComponent(jobId)}`;

export const getBullmqRuntimeInfo = (queueName: string, queuePrefix: string, redisUrl: string, serviceName: string) => {
  const parsed = redisUrl ? new URL(redisUrl) : null;

  return {
    queueName,
    queuePrefix,
    redisProtocol: parsed?.protocol.replace(":", "") || "not-configured",
    redisHost: parsed?.host || "not-configured",
    serviceName,
  };
};

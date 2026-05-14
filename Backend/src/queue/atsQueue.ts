import { logger } from "../observability";
import type { AtsAnalysisJobData } from "../../../shared/src/bullmq";
import { processAtsAnalysisJob } from "../lib/workerShim";

export type { AtsAnalysisJobData } from "../../../shared/src/bullmq";

export const createAtsAnalysisJobId = (data: Record<string, unknown>) => `ats-${String(data.analysisId ?? cryptoRandom())}`;

const cryptoRandom = () => {
  return Math.random().toString(16).slice(2);
};

export const getAtsQueueRuntimeInfo = () => ({ enabled: false, reason: "BullMQ disabled - ATS runs synchronously", serviceName: "backend", queueName: "atsAnalysisQueue", queuePrefix: "" });

export const ensureAtsQueueReady = async () => { /* no-op; ATS runs synchronously now */ };

export const closeAtsQueue = async () => { /* no-op */ };

export const enqueueAtsAnalysisJob = async (data: AtsAnalysisJobData) => {
  const jobId = createAtsAnalysisJobId(data as unknown as Record<string, unknown>);
  logger.info({ jobId, userId: data.userId, resumeId: data.resumeId }, "Running ATS analysis synchronously (enqueue shim)");
  const job = { id: jobId, data } as any;
  const result = await processAtsAnalysisJob(job);
  return { id: jobId, result } as any;
};

export const requeueAtsAnalysisJob = async (data: AtsAnalysisJobData) => {
  return enqueueAtsAnalysisJob(data);
};
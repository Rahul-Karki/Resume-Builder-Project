import { logger } from "../observability";
import type { ResumeDownloadJobData } from "../../../shared/src/bullmq";
import { processResumeDownloadJob } from "../lib/workerShim";

export { /* keep export name for compatibility */ } from "../../../shared/src/bullmq";

export const createResumeDownloadJobId = (data: Record<string, unknown>) => `resume-download-${String(data.resumeId ?? cryptoRandom())}`;

const cryptoRandom = () => Math.random().toString(16).slice(2);

export const getResumeQueueRuntimeInfo = () => ({ enabled: false, reason: "BullMQ disabled - resume download runs synchronously", serviceName: "backend", queueName: "resumeQueue", queuePrefix: "" });

export const getResumeQueue = () => ({
  getJobCounts: async (...names: string[]) => {
    const defaults: Record<string, number> = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };
    if (!names || names.length === 0) return defaults;
    const out: Record<string, number> = {};
    for (const n of names) {
      out[n] = defaults[n] ?? 0;
    }
    return out;
  },
});

export const ensureResumeQueueReady = async () => { /* no-op */ };

export const closeResumeQueue = async () => { /* no-op */ };

export const enqueueResumeDownloadJob = async (data: ResumeDownloadJobData) => {
  const jobId = createResumeDownloadJobId(data as unknown as Record<string, unknown>);
  logger.info({ jobId, userId: data.userId, preset: data.preset }, "Running resume download synchronously (enqueue shim)");
  const job = { id: jobId, data, attemptsMade: 0, opts: { attempts: 1 } } as any;
  const result = await processResumeDownloadJob(job);
  return { id: jobId, result } as any;
};

export const requeueResumeDownloadJob = async (data: ResumeDownloadJobData) => {
  return enqueueResumeDownloadJob(data);
};

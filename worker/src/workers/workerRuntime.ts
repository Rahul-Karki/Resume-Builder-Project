import crypto from "crypto";
import { QueueEvents, Worker, type Job } from "bullmq";
import { env } from "../config/env";
import { getBullmqConnection, getBullmqRuntimeInfo } from "../config/bullmq";
import { logger } from "../observability";
import WorkerHeartbeat from "../models/WorkerHeartbeat";

export type StartWorkerOptions<T> = {
  workerLabel: string;
  queueName: string;
  concurrency: number;
  processJob: (job: Job<T>) => Promise<unknown>;
};

export type ManagedWorker = {
  shutdown: (signal: string) => Promise<void>;
};

const heartbeatIntervalMs = 30_000;

export const createWorkerId = (serviceName: string) => `${serviceName}-${crypto.randomUUID()}`;

const writeHeartbeat = async (
  workerId: string,
  status: "starting" | "ready" | "closing" | "error",
  queueName: string,
  details: Record<string, unknown> = {},
) => {
  const runtimeInfo = getBullmqRuntimeInfo(queueName);

  await WorkerHeartbeat.findOneAndUpdate(
    { workerId },
    {
      workerId,
      serviceName: env.SERVICE_NAME,
      queueName: runtimeInfo.queueName,
      queuePrefix: runtimeInfo.queuePrefix,
      status,
      lastSeenAt: new Date(),
      details: {
        ...runtimeInfo,
        concurrency: details.concurrency,
        ...details,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).catch((error) => {
    logger.warn({ error, workerId, status }, "Failed to write worker heartbeat");
  });
};

export const startManagedWorker = async <T>({
  workerLabel,
  queueName,
  concurrency,
  processJob,
}: StartWorkerOptions<T>): Promise<ManagedWorker> => {
  const workerId = createWorkerId(env.SERVICE_NAME);
  await writeHeartbeat(workerId, "starting", queueName, { concurrency, workerLabel });

  const queueEvents = new QueueEvents(queueName, {
    connection: getBullmqConnection(),
    prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  });

  const worker = new Worker<T>(queueName, processJob, {
    connection: getBullmqConnection(),
    prefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
    concurrency,
  });

  const heartbeatTimer = setInterval(() => {
    void writeHeartbeat(workerId, worker.isRunning() ? "ready" : "starting", queueName, {
      concurrency,
      workerLabel,
      running: worker.isRunning(),
    });
  }, heartbeatIntervalMs);

  worker.on("ready", () => {
    void writeHeartbeat(workerId, "ready", queueName, { concurrency, workerLabel, running: true });
    logger.info({ workerLabel, queueName, concurrency }, "Worker connected to BullMQ");
  });

  worker.on("completed", (job) => {
    logger.info({ workerLabel, queueName, jobId: job.id, attemptsMade: job.attemptsMade }, "Worker completed job");
  });

  worker.on("failed", (job, error) => {
    void writeHeartbeat(workerId, "error", queueName, { concurrency, workerLabel, lastError: error.message, jobId: job?.id });
    if (job) {
      logger.warn({ workerLabel, queueName, jobId: job.id, attemptsMade: job.attemptsMade, error }, "Worker observed failed job");
    }
  });

  worker.on("error", (error) => {
    void writeHeartbeat(workerId, "error", queueName, { concurrency, workerLabel, lastError: error.message });
    logger.error({ error, workerLabel, queueName }, "Worker error");
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ workerLabel, queueName, jobId }, "Worker observed stalled job");
  });

  queueEvents.on("waiting", ({ jobId }) => {
    logger.info({ workerLabel, queueName, jobId }, "Queue event waiting");
  });

  queueEvents.on("active", ({ jobId, prev }) => {
    logger.info({ workerLabel, queueName, jobId, prev }, "Queue event active");
  });

  queueEvents.on("failed", ({ jobId, failedReason, prev }) => {
    logger.warn({ workerLabel, queueName, jobId, failedReason, prev }, "Queue event failed");
  });

  const shutdown = async (signal: string) => {
    logger.info({ workerLabel, queueName, signal }, "Shutting down worker");
    clearInterval(heartbeatTimer);
    await writeHeartbeat(workerId, "closing", queueName, { concurrency, workerLabel, signal });
    await queueEvents.close();
    await worker.close();
  };

  logger.info({ workerLabel, queueName, concurrency }, "Worker started");

  return { shutdown };
};

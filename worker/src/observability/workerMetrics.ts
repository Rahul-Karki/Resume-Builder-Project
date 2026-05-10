/**
 * Worker monitoring utilities for tracking job health and worker crashes.
 * Integrates with Prometheus metrics for observability.
 */

import { logger } from "../observability";
import {
  trackWorkerCrash,
  updateQueueDepth,
  updateStalledJobs,
  trackQueueJob,
} from "../observability/aiMetrics";

export interface WorkerHealthContext {
  queue: string;
  processorName: string;
  jobId?: string;
  maxStalledTimeMs?: number;
}

/**
 * Initialize worker crash handlers.
 * Ensures worker crashes are logged and metrics are updated.
 */
export const initializeWorkerCrashHandling = (context: WorkerHealthContext) => {
  const handleCrash = (error: Error, type: "uncaught" | "rejection") => {
    logger.error(
      {
        queue: context.queue,
        processor: context.processorName,
        jobId: context.jobId,
        error: error.message,
        stack: error.stack,
        type,
      },
      `Worker crashed: ${type} exception`
    );

    trackWorkerCrash(context.queue, type === "uncaught" ? "uncaught_exception" : "unhandled_rejection");
  };

  if (process.env.NODE_ENV !== "test") {
    process.on("uncaughtException", (error) => {
      handleCrash(error, "uncaught");
      // In production, you might want to exit and let container restart
      // process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      handleCrash(error, "rejection");
    });
  }
};

/**
 * Track job completion with metrics and logging.
 */
export const trackJobCompletion = (
  queue: string,
  jobType: string,
  status: "success" | "failed" | "retried",
  durationMs: number,
  retries: number = 0,
  failureReason?: string
) => {
  trackQueueJob(queue, jobType, status, durationMs, retries);

  const logLevel = status === "success" ? "info" : "warn";
  logger.log(logLevel, {
    queue,
    jobType,
    status,
    durationMs,
    retries,
    failureReason,
  });
};

/**
 * Detect and log stalled jobs (jobs that haven't made progress in a long time).
 * Should be called periodically by a background health check.
 */
export const detectStalledJobs = async (
  getJobsFromQueue: (queue: string) => Promise<Array<{ id: string; createdAt: number }>>,
  queue: string,
  maxStalledTimeMs: number = 30 * 60 * 1000 // 30 minutes default
) => {
  try {
    const jobs = await getJobsFromQueue(queue);
    const now = Date.now();
    const stalledJobs = jobs.filter((job) => now - job.createdAt > maxStalledTimeMs);

    if (stalledJobs.length > 0) {
      logger.warn(
        {
          queue,
          stalledCount: stalledJobs.length,
          jobIds: stalledJobs.map((j) => j.id),
          maxStalledTimeMs,
        },
        "Stalled jobs detected"
      );

      updateStalledJobs(queue, stalledJobs.length);
    }
  } catch (error) {
    logger.error({ queue, error }, "Failed to detect stalled jobs");
  }
};

/**
 * Create a safe job processor wrapper that handles errors and tracks metrics.
 */
export interface SafeProcessorOptions {
  queue: string;
  jobType: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export const createSafeJobProcessor = <T, R>(
  processorFn: (job: T) => Promise<R>,
  options: SafeProcessorOptions
) => {
  return async (job: T): Promise<R> => {
    const startTime = Date.now();
    const jobId = (job as Record<string, unknown>).id || "unknown";

    try {
      const result = await Promise.race([
        processorFn(job),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Job timeout after ${options.timeoutMs}ms`)),
            options.timeoutMs || 60000
          )
        ),
      ]);

      const durationMs = Date.now() - startTime;
      trackJobCompletion(options.queue, options.jobType, "success", durationMs);

      logger.info(
        {
          queue: options.queue,
          jobType: options.jobType,
          jobId,
          durationMs,
        },
        "Job completed successfully"
      );

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(
        {
          queue: options.queue,
          jobType: options.jobType,
          jobId,
          durationMs,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Job failed"
      );

      trackJobCompletion(options.queue, options.jobType, "failed", durationMs, 0, errorMessage);

      throw error;
    }
  };
};

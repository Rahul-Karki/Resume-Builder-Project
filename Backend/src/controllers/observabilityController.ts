import { Request, Response } from "express";
import { ObservabilityService } from "../services/observabilityService";
import { wrapController } from "../utils/controllerWrapper";
import { sendSuccess } from "../utils/apiResponse";
import { trackHallucination, trackMalformedResponse, trackProviderError, trackRedisCommandDuration, trackRedisConnectionError, trackQueueJob, trackQueueJobFailure } from "../observability/aiMetrics";
import { logger } from "../observability";

export const getMetricsOverview = wrapController(async (_req: Request, res: Response) => {
  const [metrics, aiMetrics, systemHealth, errorMetrics] = await Promise.all([
    ObservabilityService.getMetricsSnapshot(),
    ObservabilityService.getAIMetrics(),
    ObservabilityService.getSystemHealth(),
    ObservabilityService.getErrorMetrics(),
  ]);
  return sendSuccess(res, { metrics, aiMetrics, systemHealth, errorMetrics });
}, "observability.getMetricsOverview");

export const getSystemHealth = wrapController(async (_req: Request, res: Response) => {
  const health = await ObservabilityService.getSystemHealth();
  return sendSuccess(res, health);
}, "observability.getSystemHealth");

export const getAIMetrics = wrapController(async (_req: Request, res: Response) => {
  const aiMetrics = await ObservabilityService.getAIMetrics();
  return sendSuccess(res, aiMetrics);
}, "observability.getAIMetrics");

export const getErrorMetrics = wrapController(async (_req: Request, res: Response) => {
  const errorMetrics = await ObservabilityService.getErrorMetrics();
  return sendSuccess(res, errorMetrics);
}, "observability.getErrorMetrics");

const PROVIDERS = ["openai", "gemini", "openrouter"] as const;
const ERROR_CATEGORIES = ["timeout", "http_error", "rate_limited", "auth_error", "invalid_response", "provider_unavailable"] as const;
const HALLUCINATION_TYPES = ["contradiction", "unsubstantiated_claim", "hallucinated_skill", "hallucinated_experience", "invented_fact"] as const;
const QUEUES = ["email", "pdf-export", "ats-analysis"] as const;
const QUEUE_FAILURE_TYPES = ["max_retries_exceeded", "worker_crash", "job_timeout", "invalid_job"] as const;
const REDIS_COMMANDS = ["get", "set", "eval", "ping", "del", "incr", "expire"] as const;

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Seed all diagnostic metrics for dashboard visibility.
 * Only available as admin route — generates synthetic provider errors,
 * malformed responses, hallucinations, Redis command durations,
 * queue job events, and connection errors to populate dashboard panels.
 */
export const seedAiDiagnostics = wrapController(async (_req: Request, res: Response) => {
  const counts: Record<string, number> = {};

  // AI provider errors
  counts.providerErrors = 0;
  for (let i = 0; i < 10; i++) {
    trackProviderError(pick(PROVIDERS), pick(ERROR_CATEGORIES));
    counts.providerErrors++;
  }

  // AI malformed responses
  counts.malformedResponses = 0;
  for (let i = 0; i < 5; i++) {
    trackMalformedResponse(pick(PROVIDERS));
    counts.malformedResponses++;
  }

  // AI hallucinations
  counts.hallucinations = 0;
  for (let i = 0; i < 5; i++) {
    trackHallucination(pick(HALLUCINATION_TYPES), "seeded_test_data");
    counts.hallucinations++;
  }

  // Redis command duration (simulate 20 commands with varying latency)
  counts.redisCommands = 0;
  for (let i = 0; i < 20; i++) {
    trackRedisCommandDuration(pick(REDIS_COMMANDS), rand(1, 200));
    counts.redisCommands++;
  }

  // Redis connection errors (simulate 3 errors)
  counts.redisConnectionErrors = 0;
  for (let i = 0; i < 3; i++) {
    trackRedisConnectionError();
    counts.redisConnectionErrors++;
  }

  // Queue jobs processed (simulate 15 successful + 2 failed + 3 retried)
  counts.queueJobsProcessed = 0;
  const queue = pick(QUEUES);
  for (let i = 0; i < 15; i++) {
    trackQueueJob(queue, "process", "success", rand(100, 5000), rand(0, 2));
    counts.queueJobsProcessed++;
  }
  for (let i = 0; i < 2; i++) {
    trackQueueJob(queue, "process", "failed", rand(1000, 10000), rand(2, 4));
    counts.queueJobsProcessed++;
  }
  for (let i = 0; i < 3; i++) {
    trackQueueJob(queue, "process", "retried", rand(500, 3000), rand(0, 1));
    counts.queueJobsProcessed++;
  }

  // Queue job failures
  counts.queueJobFailures = 0;
  for (let i = 0; i < 3; i++) {
    trackQueueJobFailure(pick(QUEUES), pick(QUEUE_FAILURE_TYPES));
    counts.queueJobFailures++;
  }

  logger.info({ counts }, "All diagnostic seed metrics generated");
  return sendSuccess(res, { message: "All diagnostic metrics seeded", counts });
}, "observability.seedAiDiagnostics");

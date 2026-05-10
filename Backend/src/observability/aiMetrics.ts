import { Counter, Histogram, Gauge } from "prom-client";
import { metricsRegistry } from "../observability";

/**
 * Prometheus metrics for AI operations.
 * Tracks requests, latency, tokens, and provider performance.
 */

// AI Request Metrics
export const aiRequestsTotal = new Counter({
  name: "resume_builder_ai_requests_total",
  help: "Total number of AI requests",
  labelNames: ["type", "provider", "status"],
  registers: [metricsRegistry],
});

export const aiRequestDurationSeconds = new Histogram({
  name: "resume_builder_ai_request_duration_seconds",
  help: "Duration of AI requests in seconds",
  labelNames: ["type", "provider"],
  buckets: [0.1, 0.25, 0.5, 1, 2, 3, 5, 8],
  registers: [metricsRegistry],
});

export const aiTokensUsedTotal = new Counter({
  name: "resume_builder_ai_tokens_used_total",
  help: "Total tokens used in AI requests",
  labelNames: ["type", "provider", "token_type"],
  registers: [metricsRegistry],
});

export const aiFallbackRate = new Gauge({
  name: "resume_builder_ai_fallback_rate",
  help: "Rate of using fallback suggestions (0-100)",
  labelNames: ["type"],
  registers: [metricsRegistry],
});

export const aiValidationErrorsTotal = new Counter({
  name: "resume_builder_ai_validation_errors_total",
  help: "Total validation errors in AI requests",
  labelNames: ["error_type"],
  registers: [metricsRegistry],
});

export const aiProviderErrorsTotal = new Counter({
  name: "resume_builder_ai_provider_errors_total",
  help: "Total errors from AI providers",
  labelNames: ["provider", "error_category"],
  registers: [metricsRegistry],
});

export const aiProviderLatencySeconds = new Histogram({
  name: "resume_builder_ai_provider_latency_seconds",
  help: "Latency of AI provider responses",
  labelNames: ["provider"],
  buckets: [0.1, 0.5, 1, 2, 3, 5],
  registers: [metricsRegistry],
});

export const aiProviderSuccessRate = new Gauge({
  name: "resume_builder_ai_provider_success_rate",
  help: "Success rate of AI provider (0-100)",
  labelNames: ["provider"],
  registers: [metricsRegistry],
});

export const aiMalformedResponsesTotal = new Counter({
  name: "resume_builder_ai_malformed_responses_total",
  help: "Total malformed responses from AI providers",
  labelNames: ["provider"],
  registers: [metricsRegistry],
});

export const aiHallucinationDetectedTotal = new Counter({
  name: "resume_builder_ai_hallucination_detected_total",
  help: "Number of hallucinations detected in AI responses",
  labelNames: ["type", "reason"],
  registers: [metricsRegistry],
});

// Queue and Worker Metrics
export const queueDepth = new Gauge({
  name: "resume_builder_queue_depth",
  help: "Current number of jobs in queue",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const queueJobsProcessedTotal = new Counter({
  name: "resume_builder_queue_jobs_processed_total",
  help: "Total jobs processed from queue",
  labelNames: ["queue", "status"],
  registers: [metricsRegistry],
});

export const queueJobDurationSeconds = new Histogram({
  name: "resume_builder_queue_job_duration_seconds",
  help: "Duration of queue jobs",
  labelNames: ["queue", "job_type"],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 300],
  registers: [metricsRegistry],
});

export const queueJobFailuresTotal = new Counter({
  name: "resume_builder_queue_job_failures_total",
  help: "Total job failures in queue",
  labelNames: ["queue", "failure_type"],
  registers: [metricsRegistry],
});

export const workerCrashesTotal = new Counter({
  name: "resume_builder_worker_crashes_total",
  help: "Total worker crashes",
  labelNames: ["reason", "queue"],
  registers: [metricsRegistry],
});

export const workerStalledJobsTotal = new Gauge({
  name: "resume_builder_worker_stalled_jobs",
  help: "Number of stalled jobs (> 30 minutes)",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const queueJobRetryCountHistogram = new Histogram({
  name: "resume_builder_queue_job_retries",
  help: "Number of retries for queue jobs",
  labelNames: ["queue", "status"],
  buckets: [0, 1, 2, 3, 5],
  registers: [metricsRegistry],
});

// System Health Metrics
export const redisConnectionErrorsTotal = new Counter({
  name: "resume_builder_redis_connection_errors_total",
  help: "Total Redis connection errors",
  registers: [metricsRegistry],
});

export const aiTokenBudgetRemaining = new Gauge({
  name: "resume_builder_ai_token_budget_remaining",
  help: "Remaining AI token budget for the day",
  registers: [metricsRegistry],
});

export const aiProviderQuotaUsedPercent = new Gauge({
  name: "resume_builder_ai_provider_quota_used_percent",
  help: "AI provider quota usage percentage (0-100)",
  labelNames: ["provider"],
  registers: [metricsRegistry],
});

/**
 * Track an AI request in metrics.
 */
export const trackAiRequest = (
  type: string,
  provider: string,
  status: "success" | "error" | "timeout" | "malformed",
  durationMs: number,
  tokens?: { input: number; output: number },
  fallback: boolean = false
) => {
  aiRequestsTotal.labels(type, provider, status).inc();
  aiRequestDurationSeconds.labels(type, provider).observe(durationMs / 1000);

  if (tokens) {
    aiTokensUsedTotal.labels(type, provider, "input").inc(tokens.input);
    aiTokensUsedTotal.labels(type, provider, "output").inc(tokens.output);
  }

  if (fallback) {
    aiFallbackRate.labels(type).set((aiFallbackRate.get()?.values || [])[0]?.value || 0);
  }
};

/**
 * Track a validation error.
 */
export const trackValidationError = (errorType: string) => {
  aiValidationErrorsTotal.labels(errorType).inc();
};

/**
 * Track a provider error.
 */
export const trackProviderError = (provider: string, errorCategory: string) => {
  aiProviderErrorsTotal.labels(provider, errorCategory).inc();
};

/**
 * Track a malformed response.
 */
export const trackMalformedResponse = (provider: string) => {
  aiMalformedResponsesTotal.labels(provider).inc();
};

/**
 * Track a detected hallucination.
 */
export const trackHallucination = (type: string, reason: string) => {
  aiHallucinationDetectedTotal.labels(type, reason).inc();
};

/**
 * Track queue metrics.
 */
export const trackQueueJob = (
  queue: string,
  jobType: string,
  status: "success" | "failed" | "retried",
  durationMs: number,
  retries: number = 0
) => {
  queueJobsProcessedTotal.labels(queue, status).inc();
  queueJobDurationSeconds.labels(queue, jobType).observe(durationMs / 1000);
  queueJobRetryCountHistogram.labels(queue, status).observe(retries);
};

/**
 * Track a queue job failure.
 */
export const trackQueueJobFailure = (queue: string, failureType: string) => {
  queueJobFailuresTotal.labels(queue, failureType).inc();
};

/**
 * Track a worker crash.
 */
export const trackWorkerCrash = (queue: string, reason: string) => {
  workerCrashesTotal.labels(reason, queue).inc();
};

/**
 * Update queue depth gauge.
 */
export const updateQueueDepth = (queue: string, depth: number) => {
  queueDepth.labels(queue).set(depth);
};

/**
 * Update worker stalled jobs gauge.
 */
export const updateStalledJobs = (queue: string, count: number) => {
  workerStalledJobsTotal.labels(queue).set(count);
};

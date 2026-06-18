import { metrics } from "@opentelemetry/api";
import { Counter, Histogram, Gauge } from "prom-client";
import { metricsRegistry } from "../observability";

const aiMeter = metrics.getMeter("resume-builder-ai");

// ── Prometheus Metrics (local /metrics endpoint) ─────────────────────

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

// ── OpenTelemetry Metrics (pushed to Grafana Cloud via OTLP) ────────

// Counters
const otelAiRequestsTotal = aiMeter.createCounter("ai_requests_total", {
  description: "Total number of AI requests",
});

const otelAiTokensUsedTotal = aiMeter.createCounter("ai_tokens_used_total", {
  description: "Total tokens used in AI requests",
});

const otelAiValidationErrorsTotal = aiMeter.createCounter("ai_validation_errors_total", {
  description: "Total validation errors in AI requests",
});

const otelAiProviderErrorsTotal = aiMeter.createCounter("ai_provider_errors_total", {
  description: "Total errors from AI providers",
});

const otelAiMalformedResponsesTotal = aiMeter.createCounter("ai_malformed_responses_total", {
  description: "Total malformed responses from AI providers",
});

const otelAiHallucinationDetectedTotal = aiMeter.createCounter("ai_hallucination_detected_total", {
  description: "Number of hallucinations detected in AI responses",
});

const otelQueueJobsProcessedTotal = aiMeter.createCounter("queue_jobs_processed_total", {
  description: "Total jobs processed from queue",
});

const otelQueueJobFailuresTotal = aiMeter.createCounter("queue_job_failures_total", {
  description: "Total job failures in queue",
});

const otelWorkerCrashesTotal = aiMeter.createCounter("worker_crashes_total", {
  description: "Total worker crashes",
});

const otelRedisConnectionErrorsTotal = aiMeter.createCounter("redis_connection_errors_total", {
  description: "Total Redis connection errors",
});

// Histograms
const otelAiRequestDuration = aiMeter.createHistogram("ai_request_duration_ms", {
  description: "Duration of AI requests",
  unit: "ms",
});

const otelAiProviderLatency = aiMeter.createHistogram("ai_provider_latency_ms", {
  description: "Latency of AI provider responses",
  unit: "ms",
});

const otelQueueJobDuration = aiMeter.createHistogram("queue_job_duration_ms", {
  description: "Duration of queue jobs",
  unit: "ms",
});

const otelQueueJobRetries = aiMeter.createHistogram("queue_job_retries", {
  description: "Number of retries for queue jobs",
});

// Observable Gauges — stores current value in a Map, reported on collection
const fallbackRateValues = new Map<string, number>();
const providerSuccessRateValues = new Map<string, number>();
const queueDepthValues = new Map<string, number>();
const stalledJobsValues = new Map<string, number>();
let tokenBudgetValue = 0;
const providerQuotaValues = new Map<string, number>();

const otelAiFallbackRate = aiMeter.createObservableGauge("ai_fallback_rate", {
  description: "Rate of using fallback suggestions (0-100)",
});
otelAiFallbackRate.addCallback((result) => {
  for (const [type, value] of fallbackRateValues) {
    result.observe(value, { type });
  }
});

const otelAiProviderSuccessRate = aiMeter.createObservableGauge("ai_provider_success_rate", {
  description: "Success rate of AI provider (0-100)",
});
otelAiProviderSuccessRate.addCallback((result) => {
  for (const [provider, value] of providerSuccessRateValues) {
    result.observe(value, { provider });
  }
});

const otelQueueDepth = aiMeter.createObservableGauge("queue_depth", {
  description: "Current number of jobs in queue",
});
otelQueueDepth.addCallback((result) => {
  for (const [queue, depth] of queueDepthValues) {
    result.observe(depth, { queue });
  }
});

const otelStalledJobs = aiMeter.createObservableGauge("worker_stalled_jobs", {
  description: "Number of stalled jobs (> 30 minutes)",
});
otelStalledJobs.addCallback((result) => {
  for (const [queue, count] of stalledJobsValues) {
    result.observe(count, { queue });
  }
});

const otelAiTokenBudget = aiMeter.createObservableGauge("ai_token_budget_remaining", {
  description: "Remaining AI token budget for the day",
});
otelAiTokenBudget.addCallback((result) => {
  result.observe(tokenBudgetValue);
});

const otelAiProviderQuota = aiMeter.createObservableGauge("ai_provider_quota_used_percent", {
  description: "AI provider quota usage percentage (0-100)",
});
otelAiProviderQuota.addCallback((result) => {
  for (const [provider, percent] of providerQuotaValues) {
    result.observe(percent, { provider });
  }
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
  otelAiRequestsTotal.add(1, { type, provider, status });

  aiRequestDurationSeconds.labels(type, provider).observe(durationMs / 1000);
  otelAiRequestDuration.record(durationMs, { type, provider });

  if (tokens) {
    aiTokensUsedTotal.labels(type, provider, "input").inc(tokens.input);
    aiTokensUsedTotal.labels(type, provider, "output").inc(tokens.output);
    otelAiTokensUsedTotal.add(tokens.input, { type, provider, token_type: "input" });
    otelAiTokensUsedTotal.add(tokens.output, { type, provider, token_type: "output" });
  }

  if (fallback) {
    aiFallbackRate.labels(type).set(100);
    fallbackRateValues.set(type, 100);
  } else {
    aiFallbackRate.labels(type).set(0);
    fallbackRateValues.set(type, 0);
  }
};

/**
 * Track a validation error.
 */
export const trackValidationError = (errorType: string) => {
  aiValidationErrorsTotal.labels(errorType).inc();
  otelAiValidationErrorsTotal.add(1, { error_type: errorType });
};

/**
 * Track a provider error.
 */
export const trackProviderError = (provider: string, errorCategory: string) => {
  aiProviderErrorsTotal.labels(provider, errorCategory).inc();
  otelAiProviderErrorsTotal.add(1, { provider, error_category: errorCategory });
};

/**
 * Track a malformed response.
 */
export const trackMalformedResponse = (provider: string) => {
  aiMalformedResponsesTotal.labels(provider).inc();
  otelAiMalformedResponsesTotal.add(1, { provider });
};

/**
 * Track a detected hallucination.
 */
export const trackHallucination = (type: string, reason: string) => {
  aiHallucinationDetectedTotal.labels(type, reason).inc();
  otelAiHallucinationDetectedTotal.add(1, { type, reason });
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
  otelQueueJobsProcessedTotal.add(1, { queue, status });

  queueJobDurationSeconds.labels(queue, jobType).observe(durationMs / 1000);
  otelQueueJobDuration.record(durationMs, { queue, job_type: jobType });

  queueJobRetryCountHistogram.labels(queue, status).observe(retries);
  otelQueueJobRetries.record(retries, { queue, status });
};

/**
 * Track a queue job failure.
 */
export const trackQueueJobFailure = (queue: string, failureType: string) => {
  queueJobFailuresTotal.labels(queue, failureType).inc();
  otelQueueJobFailuresTotal.add(1, { queue, failure_type: failureType });
};

/**
 * Track a worker crash.
 */
export const trackWorkerCrash = (queue: string, reason: string) => {
  workerCrashesTotal.labels(reason, queue).inc();
  otelWorkerCrashesTotal.add(1, { reason, queue });
};

/**
 * Update queue depth gauge.
 */
export const updateQueueDepth = (queue: string, depth: number) => {
  queueDepth.labels(queue).set(depth);
  queueDepthValues.set(queue, depth);
};

/**
 * Update worker stalled jobs gauge.
 */
export const updateStalledJobs = (queue: string, count: number) => {
  workerStalledJobsTotal.labels(queue).set(count);
  stalledJobsValues.set(queue, count);
};

/**
 * Track a Redis connection error.
 */
export const trackRedisConnectionError = () => {
  redisConnectionErrorsTotal.inc();
  otelRedisConnectionErrorsTotal.add(1);
};

/**
 * Update remaining AI token budget.
 */
export const updateAiTokenBudget = (remaining: number) => {
  aiTokenBudgetRemaining.set(remaining);
  tokenBudgetValue = remaining;
};

/**
 * Update AI provider quota usage.
 */
export const updateAiProviderQuota = (provider: string, percent: number) => {
  aiProviderQuotaUsedPercent.labels(provider).set(percent);
  providerQuotaValues.set(provider, percent);
};

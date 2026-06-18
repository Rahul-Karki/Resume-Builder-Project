import crypto from "crypto";
import { metrics } from "@opentelemetry/api";
import { Counter, Histogram, Gauge } from "prom-client";
import { metricsRegistry } from "../observability";

const aiMeter = metrics.getMeter("resume-builder-ai");

// ── Label Sanitization ──────────────────────────────────────────────
// Prevents cardinality explosion from unexpected or free-text label values.

const LABEL_MAX_LENGTH = 64;

const KNOWN_PROVIDERS = new Set(["openai", "gemini", "openrouter"]);
const KNOWN_ERROR_CATEGORIES = new Set(["timeout", "http_error", "rate_limited", "auth_error", "invalid_response", "provider_unavailable"]);
const KNOWN_QUEUE_FAILURE_TYPES = new Set(["max_retries_exceeded", "worker_crash", "job_timeout", "invalid_job"]);
const KNOWN_HALLUCINATION_TYPES = new Set(["contradiction", "unsubstantiated_claim", "hallucinated_skill", "hallucinated_experience", "invented_fact"]);

const sanitizeBounded = (value: string, allowed: Set<string>): string =>
  allowed.has(value) ? value : "other";

const sanitizeFreeText = (value: string): string => {
  if (typeof value !== "string" || value.length === 0) return "other";
  if (value.length > LABEL_MAX_LENGTH) {
    return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
  }
  return value;
};

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

export const redisCommandDurationSeconds = new Histogram({
  name: "resume_builder_redis_command_duration_seconds",
  help: "Duration of Redis commands",
  labelNames: ["command"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 3],
  registers: [metricsRegistry],
});

export const aiCostTotal = new Counter({
  name: "resume_builder_ai_cost_total",
  help: "Accumulated AI provider cost in USD",
  labelNames: ["provider", "model"],
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

const otelRedisConnectionErrorsTotal = aiMeter.createCounter("redis_connection_errors_total", {
  description: "Total Redis connection errors",
});

const otelRedisCommandDuration = aiMeter.createHistogram("redis_command_duration", {
  description: "Duration of Redis commands in milliseconds",
  unit: "ms",
});

const otelAiCostTotal = aiMeter.createCounter("ai_cost_total", {
  description: "Accumulated AI provider cost in USD",
});

// Histograms
const otelAiRequestDuration = aiMeter.createHistogram("ai_request_duration", {
  description: "Duration of AI requests",
  unit: "ms",
});

const otelQueueJobDuration = aiMeter.createHistogram("queue_job_duration", {
  description: "Duration of queue jobs",
  unit: "ms",
});

const otelQueueJobRetries = aiMeter.createHistogram("queue_job_retries", {
  description: "Number of retries for queue jobs",
});

// Observable Gauges — stores current value in a Map, reported on collection
const fallbackRateValues = new Map<string, number>();
const queueDepthValues = new Map<string, number>();

const otelAiFallbackRate = aiMeter.createObservableGauge("ai_fallback_rate", {
  description: "Rate of using fallback suggestions (0-100)",
});
otelAiFallbackRate.addCallback((result) => {
  for (const [type, value] of fallbackRateValues) {
    result.observe(value, { type });
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
  const safeType = sanitizeFreeText(errorType);
  aiValidationErrorsTotal.labels(safeType).inc();
  otelAiValidationErrorsTotal.add(1, { error_type: safeType });
};

/**
 * Track a provider error.
 */
export const trackProviderError = (provider: string, errorCategory: string) => {
  const safeProvider = sanitizeBounded(provider, KNOWN_PROVIDERS);
  const safeCategory = sanitizeBounded(errorCategory, KNOWN_ERROR_CATEGORIES);
  aiProviderErrorsTotal.labels(safeProvider, safeCategory).inc();
  otelAiProviderErrorsTotal.add(1, { provider: safeProvider, error_category: safeCategory });
};

/**
 * Track a malformed response.
 */
export const trackMalformedResponse = (provider: string) => {
  const safeProvider = sanitizeBounded(provider, KNOWN_PROVIDERS);
  aiMalformedResponsesTotal.labels(safeProvider).inc();
  otelAiMalformedResponsesTotal.add(1, { provider: safeProvider });
};

/**
 * Track a detected hallucination.
 */
export const trackHallucination = (type: string, reason: string) => {
  const safeType = sanitizeBounded(type, KNOWN_HALLUCINATION_TYPES);
  const safeReason = sanitizeFreeText(reason);
  aiHallucinationDetectedTotal.labels(safeType, safeReason).inc();
  otelAiHallucinationDetectedTotal.add(1, { type: safeType, reason: safeReason });
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
  const safeFailureType = sanitizeBounded(failureType, KNOWN_QUEUE_FAILURE_TYPES);
  queueJobFailuresTotal.labels(queue, safeFailureType).inc();
  otelQueueJobFailuresTotal.add(1, { queue, failure_type: safeFailureType });
};

/**
 * Update queue depth gauge.
 */
export const updateQueueDepth = (queue: string, depth: number) => {
  queueDepth.labels(queue).set(depth);
  queueDepthValues.set(queue, depth);
};

/**
 * Track AI provider cost.
 */
export const trackAiCost = (provider: string, model: string, costUsd: number) => {
  const safeProvider = sanitizeBounded(provider, KNOWN_PROVIDERS);
  const safeModel = sanitizeFreeText(model);
  aiCostTotal.labels(safeProvider, safeModel).inc(costUsd);
  otelAiCostTotal.add(costUsd, { provider: safeProvider, model: safeModel });
};

/**
 * Track a Redis command duration.
 */
export const trackRedisCommandDuration = (command: string, durationMs: number) => {
  const safeCommand = sanitizeFreeText(command);
  redisCommandDurationSeconds.labels(safeCommand).observe(durationMs / 1000);
  otelRedisCommandDuration.record(durationMs, { command: safeCommand });
};

/**
 * Track a Redis connection error.
 */
export const trackRedisConnectionError = () => {
  redisConnectionErrorsTotal.inc();
  otelRedisConnectionErrorsTotal.add(1);
};



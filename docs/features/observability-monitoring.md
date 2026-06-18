---
# Feature: Observability & Monitoring
Last updated: 2026-06-18
Status: [x] Complete

## Purpose
Provides comprehensive observability across the backend through structured logging, distributed tracing, Prometheus metrics — enabling operators to monitor performance, debug issues, and measure business KPIs.

## User Stories
- As an operator, I want to see structured logs with correlation IDs so that I can trace a request across services.
- As an operator, I want Prometheus metrics for request rates, error rates, and latency so that I can set up dashboards and alerts.
- As a developer, I want error capture so that I can fix bugs before users report them.
- As a product manager, I want business metrics (signups, resumes created) so that I can track growth.

## Scope
### In scope
- Structured JSON logging via Pino with request-level correlation IDs
- HTTP request logging via pino-http (method, url, status, duration)
- OpenTelemetry distributed tracing with OTLP export to Grafana Cloud
- OpenTelemetry auto-instrumentation for Express, HTTP, MongoDB
- Prometheus metrics endpoint with default Node.js + custom metrics
- Business metrics: signups, logins, resumes created, AI usage, template usage
- AI-specific metrics: request count, latency, tokens, fallback rate
- Compliance metrics: audit log entries, integrity violations, cascade failures
- Client-side error tracking (custom lib/errorTracking.ts)
- Grafana Loki log aggregation integration
- Health check counters and uptime tracking
- Alert dispatch (Slack, PagerDuty, email, webhook)
- Redis metrics: cache hits/misses, command duration, connection errors
- Label cardinality controls: bounded sets + free-text hashing for all metric labels

### Out of scope
- Database query performance tracing (only MongoDB operation duration)
- Frontend performance monitoring (basic only via usePerformanceMonitor)
- Redis slowlog monitoring (use Grafana Cloud integration if needed)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/observability.ts | Pino logger, pino-http, OTel tracer, Prometheus registry, metrics middleware |
| Backend/src/observability/aiMetrics.ts | AI + Redis + Queue Prometheus metrics, tracking functions, and label sanitization |
| Backend/src/observability/complianceMetrics.ts | Compliance Prometheus metrics |
| Backend/src/observability/alerting.ts | Alert dispatch to multiple channels |
| Backend/src/middleware/correlationId.ts | W3C traceparent parsing and response headers |
| Backend/src/instrumentation.ts | OpenTelemetry SDK bootstrap |
| Backend/src/utils/controllerObservability.ts | Span helpers for controllers |
| Backend/src/utils/securityLogger.ts | Security event logging |
| Backend/src/utils/businessMetrics.ts | Business KPI metric recording |
| frontend/src/utils/logger.ts | Client-side structured logging |
| frontend/src/utils/errorTracking.ts | Client-side error capture |
| frontend/src/utils/performance.ts | Client-side performance monitoring |

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /health/metrics | No | Prometheus metrics (uptime registry) |
| GET | /metrics | Yes (ENABLE_METRICS) | Full Prometheus metrics (app registry) |

## Edge Cases & Error Handling
- If the OTLP endpoint is unreachable, the OpenTelemetry SDK buffers and retries (non-blocking).
- If the Sentry DSN is empty, initialization is skipped and no errors are thrown.
- If a Prometheus registry conflict occurs, duplicate metric registration is handled gracefully.
- The Pino log level is configurable via the LOG_LEVEL env var and defaults to "info" in production.

## Tests
- Unit: __tests__/observability.test.ts, __tests__/aiMetrics.test.ts, __tests__/complianceMetrics.test.ts, __tests__/alerting.test.ts, __tests__/correlationId.test.ts, __tests__/utils/businessMetrics.test.ts, __tests__/utils/securityLogger.test.ts, __tests__/utils/controllerObservability.test.ts

## Data Retention & Cardinality Controls

### Metric Retention

| Storage | Retention | Details |
|---------|-----------|---------|
| prom-client (in-process) | Process lifetime | Ephemeral — all counters/gauges/histograms reset on restart. The `/metrics` endpoint snapshot is point-in-time only. |
| Grafana Cloud Metrics (OTLP) | 14 days (free tier) / 30 days (paid) | Configured via Grafana Cloud stack settings. Data is downsampled after 14 days. |
| Grafana Cloud Logs (Loki) | 30 days | Configured via retention period on the Loki data source. |
| Grafana Cloud Traces (Tempo) | 14 days | Set via Grafana Cloud stack configuration. |
| Log files (disk) | 7 days | Rotated via `pino/rotating-file` or Docker log driver. Not intended for long-term archival. |

### Cardinality Protection

All metric label values are sanitized before recording to prevent cardinality explosion:

| Tracking Function | Label | Protection |
|---|---|---|
| `trackProviderError` | `provider` | Bounded set: `openai`, `gemini`, `openrouter` → unknown values bucketed as `other` |
| `trackProviderError` | `errorCategory` | Bounded set: `timeout`, `http_error`, `rate_limited`, `auth_error`, `invalid_response`, `provider_unavailable` → unknown values bucketed as `other` |
| `trackValidationError` | `errorType` | Free-text truncated/hashed at 64 chars; values >64 chars replaced by a 12-char SHA-1 hash |
| `trackHallucination` | `type` | Bounded set: `contradiction`, `unsubstantiated_claim`, `hallucinated_skill`, `hallucinated_experience`, `invented_fact` → unknown values bucketed as `other` |
| `trackHallucination` | `reason` | Free-text truncated/hashed at 64 chars |
| `trackQueueJobFailure` | `failureType` | Bounded set: `max_retries_exceeded`, `worker_crash`, `job_timeout`, `invalid_job` → unknown values bucketed as `other` |
| `trackWorkerCrash` | `reason` | Free-text truncated/hashed at 64 chars |
| `trackMalformedResponse` | `provider` | Bounded set (same as above) |
| All other labels | all | Length-truncated at 64 characters; empty values mapped to `other` |

### Env vars

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_RETENTION_DAYS` | — | Read from Grafana Cloud stack config, not an env var. Tune via Grafana Cloud Settings. |

## SLO Definitions (Targets, not Contractual)

| SLO | Target | Measurement | Window |
|-----|--------|-------------|--------|
| HTTP API availability | 99.9% | `http_errors_total` / `http_requests_total` (non-5xx) | 30d rolling |
| HTTP API latency (p95) | < 500ms | `http_request_duration_seconds` | 30d rolling |
| HTTP API latency (p99) | < 2s | `http_request_duration_seconds` | 30d rolling |
| AI provider success rate | > 95% | `ai_requests_total{status="success"}` / total | 30d rolling |
| AI provider latency (p95) | < 3s | `ai_request_duration_seconds` | 30d rolling |
| AI hallucination rate | < 1% of successful responses | `ai_hallucination_detected_total` / `ai_requests_total{status="success"}` | 30d rolling |
| DB query latency (p95) | < 100ms | `db_query_duration_ms` | 30d rolling |
| DB operation error rate | < 0.1% | `db_errors_total` / `db_operations_total` | 30d rolling |
| Redis command latency (p95) | < 25ms | `redis_command_duration_seconds` | 30d rolling |
| Redis / Upstash availability | > 99% | `redis_connection_errors_total` rate vs call rate | 30d rolling |
| Cache hit rate | > 80% | `cache_hits_total` / (`cache_hits_total` + `cache_misses_total`) | 30d rolling |
| Email send success rate | > 99% | `email_sent_total{status="success"}` / total | 30d rolling |
| Frontend LCP (p75) | < 2.5s | `frontend_metric_value{name="LCP"}` | 7d rolling |
| Event loop lag (p99) | < 50ms | `event_loop_lag_ms` | 7d rolling |
| CPU utilization | < 80% sustained | `cpu_percent` | 5 min avg |

**Notes:**
- Availability = 100 × (1 − (error_count / total_count)), where "error" = 5xx for HTTP, non-success status for AI/DB/Redis/Email.
- These are operational targets, not contractual SLAs. Burn-rate alerts fire when error budget is > 50% consumed within a 1h window.
- Multi-window, multi-burn-rate alerting is preferred: fast (1m window, 2x burn rate) + slow (1h window, 1x burn rate).

## Open Questions
- None.

---
# Feature: Observability & Monitoring
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides comprehensive observability across the backend through structured logging, distributed tracing, Prometheus metrics, and Sentry error tracking — enabling operators to monitor performance, debug issues, and measure business KPIs.

## User Stories
- As an operator, I want to see structured logs with correlation IDs so that I can trace a request across services.
- As an operator, I want Prometheus metrics for request rates, error rates, and latency so that I can set up dashboards and alerts.
- As a developer, I want Sentry to capture unhandled errors so that I can fix bugs before users report them.
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
- Sentry error tracking (backend + frontend)
- Grafana Loki log aggregation integration
- Health check counters and uptime tracking
- Alert dispatch (Slack, PagerDuty, Sentry, email, webhook)

### Out of scope
- Database query performance tracing (only MongoDB operation duration)
- Frontend performance monitoring (basic only via usePerformanceMonitor)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/observability.ts | Pino logger, pino-http, OTel tracer, Prometheus registry, metrics middleware |
| Backend/src/observability/aiMetrics.ts | AI-specific Prometheus metrics and tracking functions |
| Backend/src/observability/complianceMetrics.ts | Compliance Prometheus metrics |
| Backend/src/observability/alerting.ts | Alert dispatch to multiple channels |
| Backend/src/middleware/correlationId.ts | W3C traceparent parsing and response headers |
| Backend/src/instrumentation.ts | OpenTelemetry SDK bootstrap |
| Backend/src/utils/controllerObservability.ts | Span helpers for controllers |
| Backend/src/utils/securityLogger.ts | Security event logging |
| Backend/src/utils/businessMetrics.ts | Business KPI metric recording |
| Backend/src/config/sentry.ts | Sentry SDK initialization and flush |
| frontend/src/utils/logger.ts | Client-side structured logging |
| frontend/src/utils/errorTracking.ts | Client-side error capture |
| frontend/src/utils/performance.ts | Client-side performance monitoring |
| frontend/src/lib/sentry.ts | Frontend Sentry initialization |
| frontend/src/lib/errorTracking.ts | Client error reporting to Sentry |

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

## Open Questions
- None.

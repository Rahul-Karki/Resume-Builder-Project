# Grafana Dashboards & Alerts for Resume Builder

## Quick start

| Step | Action |
|------|--------|
| 1 | Go to Grafana Cloud → Dashboards → New → Import |
| 2 | Upload the JSON file for your data source |
| 3 | Select `grafanawork123-prom` (OTel) or `prometheus` (/metrics) when prompted |
| 4 | Repeat for each dashboard you want |

## Data source: pick the right variant

| Your pipeline | Use suffix |
|---|---|
| **Grafana Cloud OTLP** (`grafanawork123-prom`) | `*-otel.json` — OTel metric names (no prefix) |
| **Prometheus scraping `/metrics`** | `*-prometheus.json` — `resume_builder_*` prefixed names |

Some dashboards are data-source-specific — check the table below.

## Dashboard reference

| # | Dashboard | File suffix | Panels | What it covers |
|---|-----------|-------------|--------|----------------|
| 1 | **Executive Overview** | `{otel,prometheus}` | 9–10 | Uptime, request rate, error budget, p95 latency, active users, AI cost MTD, queue depth, cache hit ratio, error budget remaining |
| 2 | **Service Health** | `{otel,prometheus}` | 10–11 | CPU %, event loop lag, resident memory, active connections, disk R/W, GC duration, memory timeline |
| 3 | **API Performance** | `{otel,prometheus}` | 14 | Request rate, error rate, p50/p95/p99 latency, 4xx/5xx status codes, request size, slowest endpoints, error rate by route |
| 4 | **AI Service** | `{otel,prometheus}` | 17 | AI requests, success rate, cost, latency, tokens, hallucinations, provider errors, malformed responses, fallback rate, cost projection |
| 5 | **Business KPIs** | `otel` only | 15 | Signups, logins, failures, resumes created, PDF exports, template selections, conversion funnels, DAU/MAU proxy |
| 6 | **Data Layer** | `{otel,prometheus}` | 15–17 | DB ops rate/errors, cache hit ratio, Redis p95 latency, queue depth/failures, email sent/failure rate, job duration |
| 7 | **Frontend RUM** | `prometheus` only | 15 | LCP, FID, CLS web vitals, JS heap usage, SPA navigation timing, metric reports, frontend error rate by source/type |
| 8 | **Errors & Security** | `{otel,prometheus}` | 11–14 | Client error rate, login failures, suspicious activity, 4xx/5xx by route, auth failures, HTTP error status codes |

## What makes this production-ready (interview talking points)

- **Full-stack observability**: frontend (web vitals, JS errors) + backend (API perf, runtime) + infra (CPU, memory, disk, event loop, GC)
- **Business metrics**: signup-to-resume conversion, PDF export funnel, DAU/MAU proxy, template popularity
- **AI cost tracking**: per-provider cost, cost projection, token usage, hallucination detection, fallback rate
- **SLO-based error budget**: 30-day rolling error budget with 99.9% target
- **Security monitoring**: login failures, suspicious activity, 4xx/5xx spike detection, unauthorized access tracking
- **Email & queue reliability**: email failure rate, queue depth/job failures, Redis connection errors
- **Dual pipeline**: OTel for Grafana Cloud, Prometheus for /metrics scraping — same dashboards, different naming

## Alert Rules

`alerts-provisioning.yaml` — 21 rules (7 critical, 12 warning, 3 SLO burn-rate).

Import: Grafana Cloud → Alerting → Alert rules → New → Import from YAML → paste → Import.

Then set up Notification policies with matchers like `severity = critical` → PagerDuty/Slack.

## Regenerating dashboards

After renaming a metric in the code, regenerate:

```
node scripts/generate-dashboards.js
```

Then re-import the affected JSON files into Grafana. The generator reads panel definitions from `scripts/generate-dashboards.js` — add or remove panels by editing the `defineDashboards()` function.

## Seeding data

```
node scripts/seed-grafana-data.js --duration 600 --concurrency 5 --burst 20
```

Hits all instrumented endpoints with realistic payloads at sustained concurrency.

## Complete metric name map

| OTel name (Grafana Cloud) | Prometheus name (`/metrics`) | Scope |
|---|---|---|
| `http_requests_total` | `resume_builder_http_requests_total` | API |
| `http_request_duration_seconds` | `resume_builder_http_request_duration_seconds` | API |
| `http_request_size_bytes` | `resume_builder_http_request_size_bytes` | API |
| `ai_requests_total` | `resume_builder_ai_requests_total` | AI |
| `ai_request_duration_seconds` | `resume_builder_ai_request_duration_seconds` | AI |
| `ai_cost_total` | `resume_builder_ai_cost_total` | AI |
| `ai_provider_errors_total` | `resume_builder_ai_provider_errors_total` | AI |
| `ai_hallucination_detected_total` | `resume_builder_ai_hallucination_detected_total` | AI |
| `ai_malformed_responses_total` | `resume_builder_ai_malformed_responses_total` | AI |
| `ai_tokens_used_total` | `resume_builder_ai_tokens_used_total` | AI |
| `db_operations_total` | `resume_builder_db_operations_total` | Data |
| `redis_command_duration_ms` | `resume_builder_redis_command_duration_seconds` | Data |
| `redis_connection_errors_total` | `resume_builder_redis_connection_errors_total` | Data |
| `queue_depth` | `resume_builder_queue_depth` | Data |
| `queue_jobs_processed_total` | `resume_builder_queue_jobs_processed_total` | Data |
| `queue_job_duration_ms` | `resume_builder_queue_job_duration_seconds` | Data |
| `queue_job_failures_total` | `resume_builder_queue_job_failures_total` | Data |
| `email_sent_total` | `resume_builder_email_sent_total` | Data |
| `email_duration_ms` | `resume_builder_email_duration_seconds` | Data |
| `event_loop_lag_ms` | `resume_builder_event_loop_lag_ms` | Runtime |
| `gc_duration_ms` | `resume_builder_gc_duration_ms` | Runtime |
| `cpu_percent` | `resume_builder_cpu_percent` | Runtime |
| `disk_read_ops_per_second` | `resume_builder_disk_read_ops_per_second` | Runtime |
| `disk_write_ops_per_second` | `resume_builder_disk_write_ops_per_second` | Runtime |
| — | `resume_builder_process_resident_memory_bytes` | Runtime (from collectDefaultMetrics) |
| — | `resume_builder_process_start_time_seconds` | Runtime (from collectDefaultMetrics) |
| — | `resume_builder_nodejs_heap_size_*` | Runtime (from collectDefaultMetrics) |
| — | `resume_builder_frontend_metrics_total` | Frontend RUM (Prometheus only) |
| — | `resume_builder_frontend_metric_value` | Frontend RUM (Prometheus only) |
| — | `resume_builder_client_errors_total` | Frontend RUM (Prometheus only) |
| `active_connections` | — | OTel only |
| `cache_hits_total` | — | OTel only |
| `cache_misses_total` | — | OTel only |
| `user_signups_total` | — | OTel only |
| `user_logins_total` | — | OTel only |
| `user_login_failures_total` | — | OTel only |
| `resumes_created_total` | — | OTel only |
| `pdf_exports_success_total` | — | OTel only |
| `pdf_export_duration_ms` | — | OTel only |
| `template_selections_total` | — | OTel only |
| `suspicious_activities_total` | — | OTel only |

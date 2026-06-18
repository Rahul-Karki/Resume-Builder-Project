# Grafana Dashboards & Alerts for Resume Builder

## Which file should I use?

| Your setup | Use this file |
|---|---|
| Scraping the **`/metrics`** endpoint directly (Prometheus scrapes `http://yourapp.com/metrics`) | **`dashboard-prometheus.json`** — all metrics prefixed with `resume_builder_` |
| **Grafana Cloud OTLP** (metrics flow via OpenTelemetry OTLP exporter) | **`dashboard-otel.json`** — uses OTel metric names (no prefix) |

> Business KPIs (signups, logins, resumes created, PDF exports, templates, suspicious activity) and cache hit ratio are **OTel-only** — they only appear in `dashboard-otel.json`. If you use the Prometheus version, those panels will show "No data".

---

## Files

| File | Purpose |
|---|---|
| `dashboard-prometheus.json` | Dashboard for `/metrics` endpoint — `resume_builder_*` metric names |
| `dashboard-otel.json` | Dashboard for Grafana Cloud OTLP — OTel metric names |
| `alerts-provisioning.yaml` | 21 alert rules (7 critical, 12 warning, 3 SLO burn-rate) — works with both setups |

---

## Import Instructions

### Dashboard
1. **Grafana Cloud** → Dashboards → New → Import
2. Paste the file contents or drag the file
3. When prompted, select your Prometheus data source for `DS_PROMETHEUS`
4. Click **Import**

### Alert Rules
**Grafana Cloud** → Alerting → Alert rules → **New** → **Import from YAML**
Paste contents of `alerts-provisioning.yaml` → **Import**

---

## Setting up the data source

### Option A: Scraping `/metrics` (Prometheus)

Add this scrape config to your Prometheus server:

```yaml
scrape_configs:
  - job_name: "resume-builder"
    scrape_interval: 15s
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:5000"]
```

If using **Grafana Cloud Prometheus**: configure the Prometheus integration to scrape your app's `/metrics` endpoint. Metrics appear with `resume_builder_` prefix.

### Option B: Grafana Cloud OTLP

Set these env vars on your backend:

```
GRAFANA_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
OTEL_INSTANCE_ID=<your-instance-id>
GRAFANA_API_TOKEN=<your-api-token>
```

Metrics appear in the auto-created `grafanacloud-<stack>-prom` data source with OTel names (no prefix).

---

## Notification Routing

After importing alert rules, configure:

| Contact point | Channels | Rule matcher |
|---|---|---|
| `critical-team` | PagerDuty + Slack urgent | `severity = critical` |
| `warning-slack` | Slack #monitoring | `severity = warning` |
| `security-alerts` | Slack #security + email | `team = security` |

Create a Notification policy with those matchers pointing to the contact points.

---

## Metric Name Reference

| OTel name (Grafana Cloud) | Prometheus name (`/metrics`) |
|---|---|
| `http_requests_total` | `resume_builder_http_requests_total` |
| `http_request_duration_ms` | `resume_builder_http_request_duration_seconds` |
| `http_request_size_bytes` | `resume_builder_http_request_size_bytes` |
| `http_errors_total` | — (otel only) |
| `active_connections` | — (otel only) |
| `ai_requests_total` | `resume_builder_ai_requests_total` |
| `ai_request_duration_ms` | `resume_builder_ai_request_duration_seconds` |
| `ai_cost_total` | `resume_builder_ai_cost_total` |
| `ai_provider_errors_total` | `resume_builder_ai_provider_errors_total` |
| `queue_depth` | `resume_builder_queue_depth` |
| `db_operations_total` | `resume_builder_db_operations_total` |
| `email_sent_total` | `resume_builder_email_sent_total` |
| `redis_command_duration_ms` | `resume_builder_redis_command_duration_seconds` |
| `event_loop_lag_ms` | `event_loop_lag_ms` |
| `cpu_percent` | `cpu_percent` |
| `disk_read_ops_per_second` | `resume_builder_disk_read_ops_per_second` |
| `user_signups_total` | — (otel only) |
| `resumes_created_total` | — (otel only) |
| `pdf_exports_success_total` | — (otel only) |

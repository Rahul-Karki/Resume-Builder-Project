/**
 * Grafana Dashboard Generator
 *
 * Regenerates all dashboard JSON files in docs/grafana/
 * Run: node scripts/generate-dashboards.js
 *
 * Each dashboard is generated in two variants:
 *   *-prometheus.json  — queries resume_builder_* metric names (for /metrics scraping)
 *   *-otel.json        — queries unprefixed OTel names (for Grafana Cloud OTLP)
 */

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs", "grafana");

function panel(id, title, type, grid, expr, opts = {}, useOtel = false) {
  const p = {
    id, title, type,
    datasource: { type: "prometheus", uid: "${datasource}" },
    gridPos: grid,
    description: opts.desc || "",
  };
  const target = { expr, legendFormat: opts.legend || "", refId: "A" };
  if (opts.instant) target.instant = true;
  if (opts.format) target.format = "table";
  p.targets = [target];
  p.fieldConfig = { defaults: opts.fieldDefaults || {} };
  p.options = opts.panelOptions || {};
  if (type === "table") p.options = { footer: { show: true, countRows: true } };
  if (type === "stat") {
    p.options = {
      colorMode: opts.colorMode || "background",
      graphMode: "none",
      reduceOptions: { calcs: ["lastNotNull"], values: false },
      textMode: "auto",
    };
  }
  if (opts.thresholds) {
    p.fieldConfig.defaults.thresholds = {
      mode: "absolute",
      steps: [{ color: "green", value: null }, ...opts.thresholds],
    };
  }
  if (opts.unit && !(opts.otelUnit && useOtel)) p.fieldConfig.defaults.unit = opts.unit;
  if (opts.otelUnit && useOtel) p.fieldConfig.defaults.unit = opts.otelUnit;
  if (opts.min != null) p.fieldConfig.defaults.min = opts.min;
  if (opts.max != null) p.fieldConfig.defaults.max = opts.max;
  if (opts.stacking) p.fieldConfig.defaults.custom = { stacking: { mode: "normal" }, lineInterpolation: "smooth" };
  if (opts.legend !== undefined) p.options.legend = opts.legend;
  else p.options.legend = { showAt: "right", calcs: ["max"] };
  return p;
}

function stat(title, expr, grid, extra, useOtel) { return panel(0, title, "stat", grid, expr, extra, useOtel); }
function timeseries(title, expr, grid, extra, useOtel) { return panel(0, title, "timeseries", grid, expr, extra, useOtel); }
function table(title, expr, grid, extra, useOtel) { return panel(0, title, "table", grid, expr, { unit: "short", ...extra }, useOtel); }

const P_ = "resume_builder_";
const O = (n) => n;

/* ── Shared helpers ─────────────────────────────────────────── */

const rate = (m, r = "5m") => `rate(${m}[${r}])`;
const sumBy = (m, labels = ["route"], r = "5m") => `sum by (${labels.join(",")}) (rate(${m}[${r}]))`;
const inc = (m, r = "24h") => `increase(${m}[${r}])`;
const pQuantile = (pct, m, labels = ["le"], r = "5m") =>
  `histogram_quantile(${pct}, sum by (${labels.join(",")}) (rate(${m}_bucket[${r}])))`;

/* ── Dashboard definitions ──────────────────────────────────── */

function defineDashboards() {
  return {

    /* ══════════════════════════════════════════════════════════
     * 1. EXECUTIVE OVERVIEW — single-page health snapshot
     * ══════════════════════════════════════════════════════════ */
    "executive-overview": {
      title: "Resume Builder — Executive Overview",
      desc: "Single-page health snapshot: uptime, request volume, error budget, latency, active users, AI cost, queue depth, cache ratio. Best imported as the first tab.",
      tags: ["resume-builder", "overview"],
      refresh: "30s", time: "now-6h",
      panels: [
        // Row 1: Top-line KPIs
        { t: "Uptime", g: { h: 3, w: 3, x: 0, y: 0 }, pr: `time() - ${P_}process_start_time_seconds`, ot: null, o: { unit: "s", thresholds: [{ color: "green", value: null }, { color: "orange", value: 86400 }, { color: "red", value: 3600 }] }, desc: "Green >24h, Orange >1h, Red <1h" },
        { t: "Request Rate", g: { h: 3, w: 3, x: 3, y: 0 }, pr: `sum(rate(${P_}http_requests_total[5m]))`, ot: `sum(rate(${O("http_requests_total")}[5m]))`, o: { unit: "reqps" } },
        { t: "Error Rate (5xx)", g: { h: 3, w: 3, x: 6, y: 0 }, pr: `sum(rate(${P_}http_requests_total{status_code=~"5.."}[5m])) / sum(rate(${P_}http_requests_total[5m]))`, ot: `sum(rate(${O("http_requests_total")}{status_code=~"5.."}[5m])) / sum(rate(${O("http_requests_total")}[5m]))`, o: { unit: "percentunit", min: 0, max: 1, thresholds: [{ color: "orange", value: 0.01 }, { color: "red", value: 0.05 }] } },
        { t: "p95 Latency", g: { h: 3, w: 3, x: 9, y: 0 }, pr: pQuantile(0.95, `${P_}http_request_duration_seconds`), ot: pQuantile(0.95, `${O("http_request_duration_milliseconds")}`), o: { unit: "s", otelUnit: "ms", thresholds: [{ color: "orange", value: 500 }, { color: "red", value: 2000 }] } },
        { t: "Active Users (24h)", g: { h: 3, w: 3, x: 12, y: 0 }, pr: null, ot: `increase(${O("user_logins_total")}[24h])`, o: { unit: "short", desc: "OTel-only" } },
        { t: "AI Cost (24h)", g: { h: 3, w: 3, x: 15, y: 0 }, pr: `sum(increase(${P_}ai_cost_total[24h]))`, ot: `sum(increase(${O("ai_cost_total")}[24h]))`, o: { unit: "currencyUSD", decimals: 4 } },
        { t: "Queue Depth", g: { h: 3, w: 3, x: 18, y: 0 }, pr: `sum(${P_}queue_depth)`, ot: `sum(${O("queue_depth")})`, o: { unit: "short", thresholds: [{ color: "orange", value: 20 }, { color: "red", value: 100 }] } },
        { t: "Cache Hit Ratio", g: { h: 3, w: 3, x: 21, y: 0 }, pr: null, ot: `sum(rate(${O("cache_hits_total")}[5m])) / (sum(rate(${O("cache_hits_total")}[5m])) + sum(rate(${O("cache_misses_total")}[5m])))`, o: { unit: "percentunit", min: 0, max: 1, thresholds: [{ color: "orange", value: 0.8 }, { color: "red", value: 0.5 }], desc: "OTel-only" } },
        // Row 2: Trends
        { t: "Request Rate (route breakdown)", g: { h: 5, w: 8, x: 0, y: 3 }, pr: sumBy(`${P_}http_requests_total`), ot: sumBy(O("http_requests_total")), o: { stacking: true } },
        { t: "Latency (p95)", g: { h: 5, w: 8, x: 8, y: 3 }, pr: pQuantile(0.95, `${P_}http_request_duration_seconds`), ot: pQuantile(0.95, `${O("http_request_duration_milliseconds")}`), o: { unit: "s", otelUnit: "ms" } },
        { t: "Error Budget Remaining (30d SLO 99.9%)", g: { h: 5, w: 8, x: 16, y: 3 }, pr: `1 - (sum(rate(${P_}http_requests_total{status_code=~"5.."}[30d])) / sum(rate(${P_}http_requests_total[30d])))`, ot: `1 - (sum(rate(${O("http_requests_total")}{status_code=~"5.."}[30d])) / sum(rate(${O("http_requests_total")}[30d])))`, o: { unit: "percentunit", min: 0.99, max: 1, thresholds: [{ color: "orange", value: 0.998 }, { color: "red", value: 0.995 }] } },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 2. SERVICE HEALTH — runtime + infra
     * ══════════════════════════════════════════════════════════ */
    "service-health": {
      title: "Resume Builder — Service Health",
      desc: "CPU, memory, event loop, GC, disk I/O, active connections. Bind to OTel for full panels; Prometheus for runtime + disk.",
      tags: ["resume-builder", "service-health"],
      refresh: "30s",
      panels: [
        { t: "CPU Usage %", g: { h: 4, w: 4, x: 0, y: 0 }, pr: `${P_}cpu_percent`, ot: O("cpu_percent"), o: { unit: "percent", min: 0, max: 100, thresholds: [{ color: "orange", value: 60 }, { color: "red", value: 80 }] } },
        { t: "Event Loop Lag", g: { h: 4, w: 4, x: 4, y: 0 }, pr: `${P_}event_loop_lag_ms`, ot: O("event_loop_lag_ms"), o: { unit: "ms", thresholds: [{ color: "orange", value: 50 }, { color: "red", value: 200 }] } },
        { t: "Resident Memory", g: { h: 4, w: 4, x: 8, y: 0 }, pr: `${P_}process_resident_memory_bytes`, ot: `process_resident_memory_bytes`, o: { unit: "bytes", thresholds: [{ color: "orange", value: 314572800 }, { color: "red", value: 524288000 }] } },
        { t: "Active Connections", g: { h: 4, w: 4, x: 12, y: 0 }, pr: null, ot: O("active_connections"), o: { unit: "short", thresholds: [{ color: "orange", value: 50 }, { color: "red", value: 100 }], desc: "OTel-only" } },
        { t: "Disk Read (ops/s)", g: { h: 4, w: 4, x: 16, y: 0 }, pr: `${P_}disk_read_ops_per_second`, ot: O("disk_read_ops_per_second"), o: { unit: "short", thresholds: [{ color: "orange", value: 500 }, { color: "red", value: 1000 }] } },
        { t: "Disk Write (ops/s)", g: { h: 4, w: 4, x: 20, y: 0 }, pr: `${P_}disk_write_ops_per_second`, ot: O("disk_write_ops_per_second"), o: { unit: "short", thresholds: [{ color: "orange", value: 500 }, { color: "red", value: 1000 }] } },
        { t: "Event Loop Lag over time", g: { h: 5, w: 8, x: 0, y: 4 }, pr: `${P_}event_loop_lag_ms`, ot: O("event_loop_lag_ms"), o: { unit: "ms" } },
        { t: "CPU % over time", g: { h: 5, w: 8, x: 8, y: 4 }, pr: `${P_}cpu_percent`, ot: O("cpu_percent"), o: { unit: "percent", min: 0, max: 100 } },
        { t: "Disk I/O", g: { h: 5, w: 8, x: 16, y: 4 }, pr: `${P_}disk_read_ops_per_second`, ot: O("disk_read_ops_per_second"), o: { unit: "short" } },
        { t: "GC Duration by type", g: { h: 5, w: 12, x: 0, y: 9 }, pr: `${P_}gc_duration_ms`, ot: O("gc_duration_ms"), o: { unit: "ms", stacking: true } },
        { t: "Memory Timeline", g: { h: 5, w: 12, x: 12, y: 9 }, pr: `${P_}process_resident_memory_bytes`, ot: `process_resident_memory_bytes`, o: { unit: "bytes" } },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 3. API PERFORMANCE — HTTP layer
     * ══════════════════════════════════════════════════════════ */
    "api-performance": {
      title: "Resume Builder — API Performance",
      desc: "HTTP request rate, latency, error rate, status codes, request size, slowest endpoints. Works with either data source.",
      tags: ["resume-builder", "api"],
      refresh: "30s",
      panels: [
        { t: "Request Rate", g: { h: 4, w: 3, x: 0, y: 0 }, pr: `sum(rate(${P_}http_requests_total[5m]))`, ot: `sum(rate(${O("http_requests_total")}[5m]))`, o: { unit: "reqps" } },
        { t: "Error Rate (5xx)", g: { h: 4, w: 3, x: 3, y: 0 }, pr: `sum(rate(${P_}http_requests_total{status_code=~"5.."}[5m])) / sum(rate(${P_}http_requests_total[5m]))`, ot: `sum(rate(${O("http_requests_total")}{status_code=~"5.."}[5m])) / sum(rate(${O("http_requests_total")}[5m]))`, o: { unit: "percentunit", min: 0, max: 1, thresholds: [{ color: "orange", value: 0.01 }, { color: "red", value: 0.05 }] } },
        { t: "p50 Latency", g: { h: 4, w: 3, x: 6, y: 0 }, pr: pQuantile(0.50, `${P_}http_request_duration_seconds`), ot: pQuantile(0.50, `${O("http_request_duration_milliseconds")}`), o: { unit: "s", otelUnit: "ms", thresholds: [{ color: "orange", value: 200 }, { color: "red", value: 500 }] } },
        { t: "p95 Latency", g: { h: 4, w: 3, x: 9, y: 0 }, pr: pQuantile(0.95, `${P_}http_request_duration_seconds`), ot: pQuantile(0.95, `${O("http_request_duration_milliseconds")}`), o: { unit: "s", otelUnit: "ms", thresholds: [{ color: "orange", value: 500 }, { color: "red", value: 2000 }] } },
        { t: "p99 Latency", g: { h: 4, w: 3, x: 12, y: 0 }, pr: pQuantile(0.99, `${P_}http_request_duration_seconds`), ot: pQuantile(0.99, `${O("http_request_duration_milliseconds")}`), o: { unit: "s", otelUnit: "ms", thresholds: [{ color: "orange", value: 1000 }, { color: "red", value: 3000 }] } },
        { t: "Client Errors (4xx)", g: { h: 4, w: 3, x: 15, y: 0 }, pr: `sum(rate(${P_}http_requests_total{status_code=~"4.."}[5m]))`, ot: `sum(rate(${O("http_requests_total")}{status_code=~"4.."}[5m]))`, o: { unit: "reqps", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }] } },
        { t: "Request Size (avg)", g: { h: 4, w: 3, x: 18, y: 0 }, pr: `sum(rate(${P_}http_request_size_bytes_sum[5m])) / sum(rate(${P_}http_request_size_bytes_count[5m]))`, ot: `sum(rate(${O("http_request_size_bytes")}_sum[5m])) / sum(rate(${O("http_request_size_bytes")}_count[5m]))`, o: { unit: "bytes" } },
        { t: "Avg Req Size", g: { h: 4, w: 3, x: 21, y: 0 }, pr: `sum(rate(${P_}http_request_size_bytes_sum[5m])) / sum(rate(${P_}http_request_size_bytes_count[5m]))`, ot: `sum(rate(${O("http_request_size_bytes")}_sum[5m])) / sum(rate(${O("http_request_size_bytes")}_count[5m]))`, o: { unit: "bytes" } },
        { t: "Request Rate by Route", g: { h: 6, w: 8, x: 0, y: 4 }, pr: sumBy(`${P_}http_requests_total`), ot: sumBy(O("http_requests_total")), o: { stacking: true } },
        { t: "Latency (p95 by route)", g: { h: 6, w: 8, x: 8, y: 4 }, pr: pQuantile(0.95, `${P_}http_request_duration_seconds`), ot: pQuantile(0.95, `${O("http_request_duration_milliseconds")}`), o: { unit: "s", otelUnit: "ms" } },
        { t: "Status Code Distribution", g: { h: 6, w: 8, x: 16, y: 4 }, pr: `sum by (status_code) (rate(${P_}http_requests_total[5m]))`, ot: `sum by (status_code) (rate(${O("http_requests_total")}[5m]))`, o: { stacking: true } },
        { t: "Slowest Endpoints (p95 by route)", g: { h: 5, w: 8, x: 0, y: 10 }, pr: `topk(10, histogram_quantile(0.95, sum by (le, route) (rate(${P_}http_request_duration_seconds_bucket[5m]))))`, ot: `topk(10, histogram_quantile(0.95, sum by (le, route) (rate(${O("http_request_duration_milliseconds")}_bucket[5m]))))`, o: { type: "table", unit: "s", otelUnit: "ms" } },
        { t: "Request Size by Route", g: { h: 5, w: 8, x: 8, y: 10 }, pr: `sum by (route) (rate(${P_}http_request_size_bytes_sum[5m])) / sum by (route) (rate(${P_}http_request_size_bytes_count[5m]))`, ot: `sum by (route) (rate(${O("http_request_size_bytes")}_sum[5m])) / sum by (route) (rate(${O("http_request_size_bytes")}_count[5m]))`, o: { unit: "bytes" } },
        { t: "Error Rate by Route", g: { h: 5, w: 8, x: 16, y: 10 }, pr: `sum by (route) (rate(${P_}http_requests_total{status_code=~"5.."}[5m])) / sum by (route) (rate(${P_}http_requests_total[5m]))`, ot: `sum by (route) (rate(${O("http_requests_total")}{status_code=~"5.."}[5m])) / sum by (route) (rate(${O("http_requests_total")}[5m]))`, o: { unit: "percentunit" } },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 4. AI SERVICE — LLM ops
     * ══════════════════════════════════════════════════════════ */
    "ai-service": {
      title: "Resume Builder — AI Service",
      desc: "AI request metrics, latency, tokens, cost, providers, hallucinations, fallback behavior.",
      tags: ["resume-builder", "ai"],
      refresh: "30s",
      panels: [
        { t: "AI Requests (5m)", g: { h: 3, w: 3, x: 0, y: 0 }, pr: `sum(rate(${P_}ai_requests_total[5m]))`, ot: `sum(rate(${O("ai_requests_total")}[5m]))`, o: { unit: "reqps" } },
        { t: "Success Rate", g: { h: 3, w: 3, x: 3, y: 0 }, pr: `sum(rate(${P_}ai_requests_total{status="success"}[5m])) / sum(rate(${P_}ai_requests_total[5m]))`, ot: `sum(rate(${O("ai_requests_total")}{status="success"}[5m])) / sum(rate(${O("ai_requests_total")}[5m]))`, o: { unit: "percentunit", min: 0, max: 1, thresholds: [{ color: "orange", value: 0.95 }, { color: "red", value: 0.90 }] } },
        { t: "AI Cost (24h)", g: { h: 3, w: 3, x: 6, y: 0 }, pr: `sum(increase(${P_}ai_cost_total[24h]))`, ot: `sum(increase(${O("ai_cost_total")}[24h]))`, o: { unit: "currencyUSD", decimals: 4 } },
        { t: "p95 Latency", g: { h: 3, w: 3, x: 9, y: 0 }, pr: pQuantile(0.95, `${P_}ai_request_duration_seconds`), ot: pQuantile(0.95, `${O("ai_request_duration")}`), o: { unit: "s", otelUnit: "ms", thresholds: [{ color: "orange", value: 3000 }, { color: "red", value: 8000 }] } },
        { t: "Token Rate (5m)", g: { h: 3, w: 3, x: 12, y: 0 }, pr: `sum(rate(${P_}ai_tokens_used_total[5m]))`, ot: `sum(rate(${O("ai_tokens_used_total")}[5m]))`, o: { unit: "short" } },
        { t: "Hallucinations (1h)", g: { h: 3, w: 3, x: 15, y: 0 }, pr: `increase(${P_}ai_hallucination_detected_total[1h])`, ot: `increase(${O("ai_hallucination_detected_total")}[1h])`, o: { unit: "short" } },
        { t: "Provider Errors (1h)", g: { h: 3, w: 3, x: 18, y: 0 }, pr: `increase(${P_}ai_provider_errors_total[1h])`, ot: `increase(${O("ai_provider_errors_total")}[1h])`, o: { unit: "short", thresholds: [{ color: "orange", value: 5 }, { color: "red", value: 20 }] } },
        { t: "Malformed Resp (1h)", g: { h: 3, w: 3, x: 21, y: 0 }, pr: `increase(${P_}ai_malformed_responses_total[1h])`, ot: `increase(${O("ai_malformed_responses_total")}[1h])`, o: { unit: "short", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }] } },
        { t: "AI Requests by Status", g: { h: 5, w: 8, x: 0, y: 3 }, pr: `sum by (status) (rate(${P_}ai_requests_total[5m]))`, ot: `sum by (status) (rate(${O("ai_requests_total")}[5m]))`, o: { stacking: true } },
        { t: "AI Latency by Provider (p95)", g: { h: 5, w: 8, x: 8, y: 3 }, pr: `histogram_quantile(0.95, sum by (le, provider) (rate(${P_}ai_request_duration_seconds_bucket[5m])))`, ot: `histogram_quantile(0.95, sum by (le, provider) (rate(${O("ai_request_duration")}_bucket[5m])))`, o: { unit: "s", otelUnit: "ms" } },
        { t: "Token Usage by Type", g: { h: 5, w: 8, x: 16, y: 3 }, pr: `sum by (token_type) (rate(${P_}ai_tokens_used_total[5m]))`, ot: `sum by (token_type) (rate(${O("ai_tokens_used_total")}[5m]))`, o: { stacking: true } },
        { t: "Provider Error Details (1h)", g: { h: 5, w: 8, x: 0, y: 8 }, pr: `sort_desc(sum by (provider, error_category) (increase(${P_}ai_provider_errors_total[1h])))`, ot: `sort_desc(sum by (provider, error_category) (increase(${O("ai_provider_errors_total")}[1h])))`, o: { type: "table" } },
        { t: "Hallucination Detection Rate", g: { h: 5, w: 8, x: 8, y: 8 }, pr: `rate(${P_}ai_hallucination_detected_total[5m])`, ot: `rate(${O("ai_hallucination_detected_total")}[5m])`, o: {} },
        { t: "AI Cost by Provider", g: { h: 5, w: 8, x: 16, y: 8 }, pr: `sum by (provider) (rate(${P_}ai_cost_total[5m]))`, ot: `sum by (provider) (rate(${O("ai_cost_total")}[5m]))`, o: { unit: "currencyUSD" } },
        { t: "Fallback Rate", g: { h: 4, w: 8, x: 0, y: 13 }, pr: `sum(rate(${P_}ai_provider_errors_total{error_category="timeout"}[5m])) / sum(rate(${P_}ai_requests_total[5m]))`, ot: `sum(rate(${O("ai_provider_errors_total")}{error_category="timeout"}[5m])) / sum(rate(${O("ai_requests_total")}[5m]))`, o: { unit: "percentunit", min: 0, max: 1 } },
        { t: "Cost Projection (30d)", g: { h: 4, w: 8, x: 8, y: 13 }, pr: `sum(increase(${P_}ai_cost_total[1h])) * 24 * 30`, ot: `sum(increase(${O("ai_cost_total")}[1h])) * 24 * 30`, o: { unit: "currencyUSD", thresholds: [{ color: "orange", value: 100 }, { color: "red", value: 500 }] }, desc: "Extrapolated monthly cost from hourly rate" },
        { t: "Avg Tokens per Request", g: { h: 4, w: 8, x: 16, y: 13 }, pr: `sum(rate(${P_}ai_tokens_used_total_sum[5m])) / sum(rate(${P_}ai_tokens_used_total_count[5m]))`, ot: `sum(rate(${O("ai_tokens_used_total")}_sum[5m])) / sum(rate(${O("ai_tokens_used_total")}_count[5m]))`, o: { unit: "short" } },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 5. BUSINESS KPIs — OTel only
     * ══════════════════════════════════════════════════════════ */
    "business-kpis": {
      title: "Resume Builder — Business KPIs",
      desc: "Signups, logins, resumes, PDF exports, templates, suspicious activity. REQUIRES OTel data source — OTel-only.",
      tags: ["resume-builder", "business"],
      refresh: "60s", time: "now-24h",
      panels: [
        { t: "Signups (24h)", g: { h: 4, w: 4, x: 0, y: 0 }, pr: null, ot: inc(O("user_signups_total")), o: { unit: "short" } },
        { t: "Logins (24h)", g: { h: 4, w: 4, x: 4, y: 0 }, pr: null, ot: inc(O("user_logins_total")), o: { unit: "short" } },
        { t: "Login Failures (24h)", g: { h: 4, w: 4, x: 8, y: 0 }, pr: null, ot: inc(O("user_login_failures_total")), o: { unit: "short", thresholds: [{ color: "orange", value: 10 }, { color: "red", value: 50 }] } },
        { t: "Resumes Created (24h)", g: { h: 4, w: 4, x: 12, y: 0 }, pr: null, ot: inc(O("resumes_created_total")), o: { unit: "short" } },
        { t: "PDF Exports (24h)", g: { h: 4, w: 4, x: 16, y: 0 }, pr: null, ot: inc(O("pdf_exports_success_total")), o: { unit: "short" } },
        { t: "Suspicious Activity (24h)", g: { h: 4, w: 4, x: 20, y: 0 }, pr: null, ot: inc(O("suspicious_activities_total")), o: { unit: "short", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }] } },
        { t: "Signups over time", g: { h: 5, w: 8, x: 0, y: 4 }, pr: null, ot: rate(O("user_signups_total")), o: {} },
        { t: "Logins vs Failures", g: { h: 5, w: 8, x: 8, y: 4 }, pr: null, ot: rate(O("user_logins_total")), o: {} },
        { t: "Resumes Created", g: { h: 5, w: 8, x: 16, y: 4 }, pr: null, ot: rate(O("resumes_created_total")), o: {} },
        { t: "PDF Export Duration (p95)", g: { h: 5, w: 8, x: 0, y: 9 }, pr: null, ot: pQuantile(0.95, O("pdf_export_duration")), o: { unit: "ms" } },
        { t: "Template Selections", g: { h: 5, w: 8, x: 8, y: 9 }, pr: null, ot: `sum by (templateId) (rate(${O("template_selections_total")}[5m]))`, o: { stacking: true } },
        { t: "Top Templates (7d)", g: { h: 5, w: 8, x: 16, y: 9 }, pr: null, ot: `topk(10, sum by (templateId) (increase(${O("template_selections_total")}[7d])))`, o: { type: "table" } },
        { t: "Conversion: Signup → Resume", g: { h: 4, w: 8, x: 0, y: 14 }, pr: null, ot: `sum(increase(${O("resumes_created_total")}[24h])) / sum(increase(${O("user_signups_total")}[24h]))`, o: { unit: "percentunit", min: 0, max: 1 } },
        { t: "Conversion: Resume → PDF Export", g: { h: 4, w: 8, x: 8, y: 14 }, pr: null, ot: `sum(increase(${O("pdf_exports_success_total")}[24h])) / sum(increase(${O("resumes_created_total")}[24h]))`, o: { unit: "percentunit", min: 0, max: 1 } },
        { t: "DAU / MAU Proxy (Logins)", g: { h: 4, w: 8, x: 16, y: 14 }, pr: null, ot: `sum(increase(${O("user_logins_total")}[1d])) / sum(increase(${O("user_logins_total")}[30d]))`, o: { unit: "percentunit", min: 0, max: 1 }, desc: "Daily active users as fraction of monthly" },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 6. DATA LAYER — DB, Redis, queue, email
     * ══════════════════════════════════════════════════════════ */
    "data-layer": {
      title: "Resume Builder — Data Layer",
      desc: "DB ops, cache, Redis, queue, email. Bind to OTel for full panels; Prometheus for DB+Redis+queue+email.",
      tags: ["resume-builder", "data"],
      refresh: "30s",
      panels: [
        { t: "DB Ops Rate", g: { h: 3, w: 3, x: 0, y: 0 }, pr: `sum(rate(${P_}db_operations_total[5m]))`, ot: `sum(rate(${O("db_operations_total")}[5m]))`, o: { unit: "short" } },
        { t: "DB Error Rate", g: { h: 3, w: 3, x: 3, y: 0 }, pr: `sum(rate(${P_}db_operations_total{status="error"}[5m]))`, ot: `sum(rate(${O("db_operations_total")}{status="error"}[5m]))`, o: { unit: "short", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }] } },
        { t: "Cache Hit Ratio", g: { h: 3, w: 3, x: 6, y: 0 }, pr: null, ot: `sum(rate(${O("cache_hits_total")}[5m])) / (sum(rate(${O("cache_hits_total")}[5m])) + sum(rate(${O("cache_misses_total")}[5m])))`, o: { unit: "percentunit", min: 0, max: 1, thresholds: [{ color: "orange", value: 0.8 }, { color: "red", value: 0.5 }], desc: "OTel-only" } },
        { t: "Redis p95 Latency", g: { h: 3, w: 3, x: 9, y: 0 }, pr: pQuantile(0.95, `${P_}redis_command_duration_seconds`), ot: pQuantile(0.95, `${O("redis_command_duration")}`), o: { unit: "ms", thresholds: [{ color: "orange", value: 25 }, { color: "red", value: 100 }] } },
        { t: "Queue Depth", g: { h: 3, w: 3, x: 12, y: 0 }, pr: `sum(${P_}queue_depth)`, ot: `sum(${O("queue_depth")})`, o: { unit: "short", thresholds: [{ color: "orange", value: 20 }, { color: "red", value: 100 }] } },
        { t: "Queue Failures (1h)", g: { h: 3, w: 3, x: 15, y: 0 }, pr: inc(`${P_}queue_job_failures_total`, "1h"), ot: inc(`${O("queue_job_failures_total")}`, "1h"), o: { unit: "short", thresholds: [{ color: "orange", value: 5 }, { color: "red", value: 20 }] } },
        { t: "Email Sent (1h)", g: { h: 3, w: 3, x: 18, y: 0 }, pr: inc(`${P_}email_sent_total`, "1h"), ot: inc(`${O("email_sent_total")}`, "1h"), o: { unit: "short" } },
        { t: "Email Failure Rate", g: { h: 3, w: 3, x: 21, y: 0 }, pr: `sum(increase(${P_}email_sent_total{status="error"}[1h])) / sum(increase(${P_}email_sent_total[1h]))`, ot: `sum(increase(${O("email_sent_total")}{status="error"}[1h])) / sum(increase(${O("email_sent_total")}[1h]))`, o: { unit: "percentunit", min: 0, max: 1, thresholds: [{ color: "orange", value: 0.01 }, { color: "red", value: 0.05 }] } },
        { t: "DB Ops by Model", g: { h: 5, w: 8, x: 0, y: 3 }, pr: `sum by (operation, model) (rate(${P_}db_operations_total[5m]))`, ot: `sum by (operation, model) (rate(${O("db_operations_total")}[5m]))`, o: { stacking: true } },
        { t: "Cache Hit / Miss Rate", g: { h: 5, w: 8, x: 8, y: 3 }, pr: null, ot: `rate(${O("cache_hits_total")}[5m])`, o: {}, desc: "OTel-only" },
        { t: "Redis Latency by Command (p95)", g: { h: 5, w: 8, x: 16, y: 3 }, pr: `histogram_quantile(0.95, sum by (le, command) (rate(${P_}redis_command_duration_seconds_bucket[5m])))`, ot: `histogram_quantile(0.95, sum by (le, command) (rate(${O("redis_command_duration")}_bucket[5m])))`, o: { unit: "ms" } },
        { t: "Queue Depth by Queue", g: { h: 5, w: 8, x: 0, y: 8 }, pr: `sum by (queue) (${P_}queue_depth)`, ot: `sum by (queue) (${O("queue_depth")})`, o: {} },
        { t: "Jobs Processed Rate", g: { h: 5, w: 8, x: 8, y: 8 }, pr: `sum by (queue, status) (rate(${P_}queue_jobs_processed_total[5m]))`, ot: `sum by (queue, status) (rate(${O("queue_jobs_processed_total")}[5m]))`, o: { stacking: true } },
        { t: "Email Send Rate", g: { h: 5, w: 8, x: 16, y: 8 }, pr: `sum by (type, status) (rate(${P_}email_sent_total[5m]))`, ot: `sum by (type, status) (rate(${O("email_sent_total")}[5m]))`, o: { stacking: true } },
        { t: "Redis Connection Errors", g: { h: 4, w: 8, x: 0, y: 13 }, pr: `rate(${P_}redis_connection_errors_total[5m])`, ot: `rate(${O("redis_connection_errors_total")}[5m])`, o: {} },
        { t: "Job Duration (p95)", g: { h: 4, w: 8, x: 8, y: 13 }, pr: pQuantile(0.95, `${P_}queue_job_duration_seconds`), ot: pQuantile(0.95, `${O("queue_job_duration")}`), o: { unit: "s", otelUnit: "ms" } },
        { t: "Queue Failure Details (1h)", g: { h: 4, w: 8, x: 16, y: 13 }, pr: `sort_desc(sum by (queue, failure_type) (increase(${P_}queue_job_failures_total[1h])))`, ot: `sort_desc(sum by (queue, failure_type) (increase(${O("queue_job_failures_total")}[1h])))`, o: { type: "table" } },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 7. FRONTEND RUM — web vitals, JS errors, SPA performance
     * ══════════════════════════════════════════════════════════ */
    "frontend-rum": {
      title: "Resume Builder — Frontend RUM",
      desc: "Web Vitals (LCP, FID, CLS), JS heap, SPA navigation timing, frontend error rates by source. Prometheus-only — from /metrics endpoint.",
      tags: ["resume-builder", "frontend"],
      refresh: "60s", time: "now-6h",
      panels: [
        { t: "LCP (p75)", g: { h: 3, w: 4, x: 0, y: 0 }, pr: `histogram_quantile(0.75, sum(rate(${P_}frontend_metric_value_bucket{name="LCP"}[5m])) by (le))`, ot: null, o: { unit: "ms", thresholds: [{ color: "orange", value: 2500 }, { color: "red", value: 4000 }], desc: "Good <2500ms, Poor >4000ms" } },
        { t: "FID (p75)", g: { h: 3, w: 4, x: 4, y: 0 }, pr: `histogram_quantile(0.75, sum(rate(${P_}frontend_metric_value_bucket{name="FID"}[5m])) by (le))`, ot: null, o: { unit: "ms", thresholds: [{ color: "orange", value: 100 }, { color: "red", value: 300 }], desc: "Good <100ms, Poor >300ms" } },
        { t: "CLS (p75)", g: { h: 3, w: 4, x: 8, y: 0 }, pr: `histogram_quantile(0.75, sum(rate(${P_}frontend_metric_value_bucket{name="CLS"}[5m])) by (le))`, ot: null, o: { thresholds: [{ color: "orange", value: 0.1 }, { color: "red", value: 0.25 }], desc: "Good <0.1, Poor >0.25" } },
        { t: "JS Heap (avg)", g: { h: 3, w: 4, x: 12, y: 0 }, pr: `sum(rate(${P_}frontend_metric_value_sum{name="heapUsed"}[5m])) / sum(rate(${P_}frontend_metric_value_count{name="heapUsed"}[5m]))`, ot: null, o: { unit: "bytes", thresholds: [{ color: "orange", value: 50000000 }, { color: "red", value: 100000000 }] } },
        { t: "SPA Nav Duration (p95)", g: { h: 3, w: 4, x: 16, y: 0 }, pr: `histogram_quantile(0.95, sum(rate(${P_}frontend_metric_value_bucket{name="spa_navigation"}[5m])) by (le))`, ot: null, o: { unit: "ms", thresholds: [{ color: "orange", value: 500 }, { color: "red", value: 1000 }] } },
        { t: "API Call Duration (p95)", g: { h: 3, w: 4, x: 20, y: 0 }, pr: `histogram_quantile(0.95, sum(rate(${P_}frontend_metric_value_bucket{name=~"api_.*"}[5m])) by (le))`, ot: null, o: { unit: "ms" } },
        { t: "Web Vitals Trend (LCP)", g: { h: 5, w: 8, x: 0, y: 3 }, pr: `histogram_quantile(0.75, sum by (le) (rate(${P_}frontend_metric_value_bucket{name="LCP"}[5m])))`, ot: null, o: { unit: "ms" } },
        { t: "Web Vitals Trend (FID)", g: { h: 5, w: 8, x: 8, y: 3 }, pr: `histogram_quantile(0.75, sum by (le) (rate(${P_}frontend_metric_value_bucket{name="FID"}[5m])))`, ot: null, o: { unit: "ms" } },
        { t: "Web Vitals Trend (CLS)", g: { h: 5, w: 8, x: 16, y: 3 }, pr: `histogram_quantile(0.75, sum by (le) (rate(${P_}frontend_metric_value_bucket{name="CLS"}[5m])))`, ot: null, o: {} },
        { t: "JS Heap Timeline", g: { h: 5, w: 8, x: 0, y: 8 }, pr: `sum by (name) (rate(${P_}frontend_metric_value_sum{name=~"heap.*"}[5m])) / sum by (name) (rate(${P_}frontend_metric_value_count{name=~"heap.*"}[5m]))`, ot: null, o: { unit: "bytes" } },
        { t: "SPA Navigation Duration", g: { h: 5, w: 8, x: 8, y: 8 }, pr: `histogram_quantile(0.95, sum by (le) (rate(${P_}frontend_metric_value_bucket{name="spa_navigation"}[5m])))`, ot: null, o: { unit: "ms" } },
        { t: "Metric Reports by Name", g: { h: 5, w: 8, x: 16, y: 8 }, pr: `sum by (name) (rate(${P_}frontend_metrics_total[5m]))`, ot: null, o: { stacking: true } },
        { t: "Error Rate by Source", g: { h: 4, w: 8, x: 0, y: 13 }, pr: `sum by (source) (rate(${P_}client_errors_total[5m]))`, ot: null, o: { stacking: true } },
        { t: "Error Rate by Type", g: { h: 4, w: 8, x: 8, y: 13 }, pr: `sum by (error_type) (rate(${P_}client_errors_total[5m]))`, ot: null, o: { stacking: true } },
        { t: "Errors Over Time", g: { h: 4, w: 8, x: 16, y: 13 }, pr: `rate(${P_}client_errors_total[5m])`, ot: null, o: {} },
      ],
    },

    /* ══════════════════════════════════════════════════════════
     * 8. ERRORS & SECURITY — auth failures, rate limits, 4xx
     * ══════════════════════════════════════════════════════════ */
    "errors-security": {
      title: "Resume Builder — Errors & Security",
      desc: "Client errors, auth failures, suspicious activity, 4xx by route, validation errors. Bind to OTel for auth/security panels; Prometheus for client errors.",
      tags: ["resume-builder", "errors", "security"],
      refresh: "30s", time: "now-3h",
      panels: [
        { t: "Client Error Rate", g: { h: 3, w: 3, x: 0, y: 0 }, pr: `rate(${P_}client_errors_total[5m])`, ot: null, o: { unit: "short", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }], desc: "Prometheus-only" } },
        { t: "Login Failures (1h)", g: { h: 3, w: 3, x: 3, y: 0 }, pr: null, ot: inc(O("user_login_failures_total"), "1h"), o: { unit: "short", thresholds: [{ color: "orange", value: 10 }, { color: "red", value: 50 }], desc: "OTel-only" } },
        { t: "Suspicious Activity (1h)", g: { h: 3, w: 3, x: 6, y: 0 }, pr: null, ot: inc(O("suspicious_activities_total"), "1h"), o: { unit: "short", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }], desc: "OTel-only" } },
        { t: "4xx Rate", g: { h: 3, w: 3, x: 9, y: 0 }, pr: `sum(rate(${P_}http_requests_total{status_code=~"4.."}[5m]))`, ot: `sum(rate(${O("http_requests_total")}{status_code=~"4.."}[5m]))`, o: { unit: "reqps", thresholds: [{ color: "orange", value: 1 }, { color: "red", value: 5 }] } },
        { t: "5xx Rate", g: { h: 3, w: 3, x: 12, y: 0 }, pr: `sum(rate(${P_}http_requests_total{status_code=~"5.."}[5m]))`, ot: `sum(rate(${O("http_requests_total")}{status_code=~"5.."}[5m]))`, o: { unit: "reqps", thresholds: [{ color: "orange", value: 0.5 }, { color: "red", value: 2 }] } },
        { t: "Validation Errors (1h)", g: { h: 3, w: 3, x: 15, y: 0 }, pr: `increase(${P_}http_requests_total{status_code="400"}[1h])`, ot: `increase(${O("http_requests_total")}{status_code="400"}[1h])`, o: { unit: "short", thresholds: [{ color: "orange", value: 20 }, { color: "red", value: 100 }] } },
        { t: "Not Found (404) (1h)", g: { h: 3, w: 3, x: 18, y: 0 }, pr: `increase(${P_}http_requests_total{status_code="404"}[1h])`, ot: `increase(${O("http_requests_total")}{status_code="404"}[1h])`, o: { unit: "short", thresholds: [{ color: "orange", value: 5 }, { color: "red", value: 50 }] } },
        { t: "Unauthorized (401) (1h)", g: { h: 3, w: 3, x: 21, y: 0 }, pr: `increase(${P_}http_requests_total{status_code="401"}[1h])`, ot: `increase(${O("http_requests_total")}{status_code="401"}[1h])`, o: { unit: "short", thresholds: [{ color: "orange", value: 5 }, { color: "red", value: 20 }] } },
        { t: "Client Errors by Source", g: { h: 5, w: 8, x: 0, y: 3 }, pr: `sum by (source) (rate(${P_}client_errors_total[5m]))`, ot: null, o: { stacking: true }, desc: "Prometheus-only" },
        { t: "Client Errors by Type", g: { h: 5, w: 8, x: 8, y: 3 }, pr: `sum by (error_type) (rate(${P_}client_errors_total[5m]))`, ot: null, o: { stacking: true }, desc: "Prometheus-only" },
        { t: "4xx by Route", g: { h: 5, w: 8, x: 16, y: 3 }, pr: `sum by (route) (rate(${P_}http_requests_total{status_code=~"4.."}[5m]))`, ot: `sum by (route) (rate(${O("http_requests_total")}{status_code=~"4.."}[5m]))`, o: { stacking: true } },
        { t: "Auth Failure Timeline", g: { h: 5, w: 8, x: 0, y: 8 }, pr: null, ot: rate(O("user_login_failures_total")), o: {}, desc: "OTel-only" },
        { t: "Suspicious Activity Timeline", g: { h: 5, w: 8, x: 8, y: 8 }, pr: null, ot: rate(O("suspicious_activities_total")), o: {}, desc: "OTel-only" },
        { t: "5xx by Route", g: { h: 5, w: 8, x: 16, y: 8 }, pr: `sum by (route) (rate(${P_}http_requests_total{status_code=~"5.."}[5m]))`, ot: `sum by (route) (rate(${O("http_requests_total")}{status_code=~"5.."}[5m]))`, o: { stacking: true } },
        { t: "HTTP Error Status Codes", g: { h: 5, w: 8, x: 0, y: 13 }, pr: `sum by (status_code) (rate(${P_}http_requests_total{status_code=~"4..|5.."}[5m]))`, ot: `sum by (status_code) (rate(${O("http_requests_total")}{status_code=~"4..|5.."}[5m]))`, o: { stacking: true } },
        { t: "Signups vs Failed Logins", g: { h: 5, w: 8, x: 8, y: 13 }, pr: null, ot: `${rate(O("user_signups_total"))} OR ${rate(O("user_login_failures_total"))}`, o: {} },
        { t: "Recent Suspicious Events", g: { h: 5, w: 8, x: 16, y: 13 }, pr: null, ot: `sort_desc(sum by (type) (increase(${O("suspicious_activities_total")}[1h])))`, o: { type: "table" }, desc: "OTel-only" },
      ],
    },
  };
}

/* ── Builder ─────────────────────────────────────────────────── */

function buildDashboard(name, cfg, useOtel) {
  const badge = useOtel ? "OTel" : "Prometheus";
  const panels = [];

  cfg.panels.forEach((p) => {
    const expr = useOtel ? (p.ot !== undefined ? p.ot : p.pr) : p.pr;
    if (!expr) return;
    const opts = { ...p.o };
    const type = opts.type || (p.g.h >= 5 ? "timeseries" : "stat");

    if (type === "table") panels.push(table(p.t, expr, p.g, opts, useOtel));
    else if (type === "timeseries") panels.push(timeseries(p.t, expr, p.g, opts, useOtel));
    else panels.push(stat(p.t, expr, p.g, opts, useOtel));
  });

  panels.forEach((p, i) => { p.id = i + 1; });

  return {
    __inputs: [{ name: "DS_PROMETHEUS", label: `Prometheus datasource (${badge})`, type: "datasource", pluginId: "prometheus", pluginName: "Prometheus" }],
    __requires: [{ type: "grafana", id: "grafana", name: "Grafana", version: "10.0.0" }, { type: "datasource", id: "prometheus", name: "Prometheus", version: "6.0.0" }],
    title: `${cfg.title} (${badge})`,
    description: cfg.desc,
    tags: cfg.tags,
    schemaVersion: 39, version: 1, timezone: "browser", refresh: cfg.refresh,
    time: { from: cfg.time || "now-6h", to: "now" },
    timepicker: { refresh_intervals: ["5s","10s","30s","1m","5m"], time_options: ["5m","15m","1h","6h","24h"] },
    templating: { list: [{ name: "datasource", type: "datasource", query: "prometheus", current: {}, hide: 0 }] },
    panels,
  };
}

/* ── Generate ────────────────────────────────────────────────── */

fs.mkdirSync(OUT, { recursive: true });
const dashDefs = defineDashboards();

for (const [key, cfg] of Object.entries(dashDefs)) {
  for (const useOtel of [false, true]) {
    const dash = buildDashboard(key, cfg, useOtel);
    if (dash.panels.length === 0) {
      console.log(`  (skipping ${key} ${useOtel ? "otel" : "prometheus"} — 0 panels)`);
      continue;
    }
    const file = `dashboard-${key}-${useOtel ? "otel" : "prometheus"}.json`;
    fs.writeFileSync(path.join(OUT, file), JSON.stringify(dash, null, 2));
    console.log(`  ${file} — ${dash.panels.length} panels`);
  }
}

console.log("\nDone. Import the appropriate variant for your data source.");

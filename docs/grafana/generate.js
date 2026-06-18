const fs = require("fs");

const src = JSON.parse(fs.readFileSync(__dirname + "/dashboard.json", "utf8"));

// Clone: keep original for OTel, create new for Prometheus
const otel = JSON.parse(JSON.stringify(src));
const prom = JSON.parse(JSON.stringify(src));

prom.title = "Resume Builder — Production Observability (/metrics)";

// Metric prefix map: OTel -> Prometheus
const otelToProm = {
  http_requests_total: "resume_builder_http_requests_total",
  http_errors_total: "resume_builder_http_requests_total",
  http_request_duration_ms_bucket: "resume_builder_http_request_duration_seconds_bucket",
  http_request_duration_ms: "resume_builder_http_request_duration_seconds",
  http_request_size_bytes_bucket: "resume_builder_http_request_size_bytes_bucket",
  http_request_size_bytes: "resume_builder_http_request_size_bytes",
  ai_requests_total: "resume_builder_ai_requests_total",
  ai_request_duration_ms_bucket: "resume_builder_ai_request_duration_seconds_bucket",
  ai_request_duration_ms: "resume_builder_ai_request_duration_seconds",
  ai_tokens_used_total: "resume_builder_ai_tokens_used_total",
  ai_cost_total: "resume_builder_ai_cost_total",
  ai_provider_errors_total: "resume_builder_ai_provider_errors_total",
  ai_hallucination_detected_total: "resume_builder_ai_hallucination_detected_total",
  ai_fallback_rate: "resume_builder_ai_fallback_rate",
  ai_malformed_responses_total: "resume_builder_ai_malformed_responses_total",
  cache_hits_total: "resume_builder_http_requests_total",
  cache_misses_total: "resume_builder_http_requests_total",
  queue_depth: "resume_builder_queue_depth",
  queue_jobs_processed_total: "resume_builder_queue_jobs_processed_total",
  queue_job_duration_ms_bucket: "resume_builder_queue_job_duration_seconds_bucket",
  queue_job_failures_total: "resume_builder_queue_job_failures_total",
  db_operations_total: "resume_builder_db_operations_total",
  redis_command_duration_ms_bucket: "resume_builder_redis_command_duration_seconds_bucket",
  redis_connection_errors_total: "resume_builder_redis_connection_errors_total",
  email_sent_total: "resume_builder_email_sent_total",
  email_duration_ms_bucket: "resume_builder_email_duration_seconds_bucket",
  active_connections: "resume_builder_http_requests_total",
  event_loop_lag_ms: "event_loop_lag_ms",
  gc_duration_ms: "gc_duration_ms",
  cpu_percent: "cpu_percent",
  disk_read_ops_per_second: "resume_builder_disk_read_ops_per_second",
  disk_write_ops_per_second: "resume_builder_disk_write_ops_per_second",
  resume_builder_client_errors_total: "resume_builder_client_errors_total",
  resume_builder_frontend_metric_value_bucket:
    "resume_builder_frontend_metric_value_bucket",
  resume_builder_frontend_metric_value: "resume_builder_frontend_metric_value",
  nodejs_external_memory_bytes: "resume_builder_process_resident_memory_bytes",
  user_signups_total: "resume_builder_http_requests_total",
  user_logins_total: "resume_builder_http_requests_total",
  user_login_failures_total: "resume_builder_http_requests_total",
  resumes_created_total: "resume_builder_http_requests_total",
  pdf_exports_success_total: "resume_builder_http_requests_total",
  pdf_exports_failure_total: "resume_builder_http_requests_total",
  pdf_export_duration_ms_bucket: "resume_builder_http_request_duration_seconds_bucket",
  template_selections_total: "resume_builder_http_requests_total",
  suspicious_activities_total: "resume_builder_http_requests_total",
};

function remap(expr) {
  for (const [otelName, promName] of Object.entries(otelToProm)) {
    const re = new RegExp(
      "(?<![a-zA-Z_])" +
        otelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "(?![a-zA-Z_])",
      "g"
    );
    expr = expr.replace(re, promName);
  }
  return expr;
}

// Process all panels
prom.panels.forEach((p) => {
  if (p.targets) {
    p.targets.forEach((t) => {
      if (t.expr) t.expr = remap(t.expr);
    });
  }
});

// Mark OTel-only panels
const otelOnlyPanels = new Set([
  "User Signups (24h)",
  "User Logins (24h)",
  "Login Failures (24h)",
  "Resumes Created (24h)",
  "PDF Exports (24h)",
  "PDF Export Duration (p95)",
  "Top Templates (7d)",
  "Suspicious Activity (24h)",
  "Cache Hit Ratio",
]);
otel.panels.forEach((p) => {
  if (otelOnlyPanels.has(p.title)) {
    p.description =
      (p.description || "") +
      " [OTel-only: requires Grafana Cloud OTLP]";
  }
});

// Also mark in prometheus version
prom.panels.forEach((p) => {
  if (otelOnlyPanels.has(p.title)) {
    p.description =
      (p.description || "") +
      " [No data from /metrics — requires Grafana Cloud OTLP for business metrics]";
  }
});

fs.writeFileSync(
  __dirname + "/dashboard-prometheus.json",
  JSON.stringify(prom, null, 2)
);
fs.writeFileSync(
  __dirname + "/dashboard-otel.json",
  JSON.stringify(otel, null, 2)
);
console.log("Generated dashboard-prometheus.json (for /metrics endpoint)");
console.log("Generated dashboard-otel.json (for Grafana Cloud OTLP)");

/**
 * Custom Business Metrics
 * 
 * Tracks application-specific events and metrics beyond HTTP/DB level
 * Examples: user signups, resumes created, PDF exports, etc.
 * 
 * Integration with OpenTelemetry for production monitoring
 */

import { metrics } from "@opentelemetry/api";
import { Counter, Gauge, Histogram } from "prom-client";
import { metricsRegistry } from "../observability";

// Get global meter
const meter = metrics.getMeter("resume-builder-business");

// ── Prometheus Metrics (local /metrics endpoint) ────────────────

export const promUserSignupCounter = new Counter({
  name: "resume_builder_user_signups_total",
  help: "Total number of user signups",
  labelNames: ["provider"],
  registers: [metricsRegistry],
});

export const promUserLoginCounter = new Counter({
  name: "resume_builder_user_logins_total",
  help: "Total successful user logins",
  labelNames: ["email"],
  registers: [metricsRegistry],
});

export const promUserLoginFailureCounter = new Counter({
  name: "resume_builder_user_login_failures_total",
  help: "Total failed login attempts",
  labelNames: ["reason"],
  registers: [metricsRegistry],
});

export const promResumeCreatedCounter = new Counter({
  name: "resume_builder_resumes_created_total",
  help: "Total number of resumes created",
  labelNames: ["templateId"],
  registers: [metricsRegistry],
});

export const promResumeDeletedCounter = new Counter({
  name: "resume_builder_resumes_deleted_total",
  help: "Total number of resumes deleted",
  registers: [metricsRegistry],
});

export const promTotalResumesGauge = new Gauge({
  name: "resume_builder_resumes_total",
  help: "Total number of resumes in system",
  registers: [metricsRegistry],
});

export const promPdfExportSuccessCounter = new Counter({
  name: "resume_builder_pdf_exports_success_total",
  help: "Total successful PDF exports",
  labelNames: ["preset"],
  registers: [metricsRegistry],
});

export const promPdfExportFailureCounter = new Counter({
  name: "resume_builder_pdf_exports_failure_total",
  help: "Total failed PDF exports",
  labelNames: ["reason"],
  registers: [metricsRegistry],
});

export const promPdfExportRetryCounter = new Counter({
  name: "resume_builder_pdf_exports_retries_total",
  help: "Total PDF export retry attempts",
  labelNames: ["reason"],
  registers: [metricsRegistry],
});

export const promPdfExportDurationHistogram = new Histogram({
  name: "resume_builder_pdf_export_duration",
  help: "Time taken to export resume as PDF in milliseconds",
  labelNames: ["preset"],
  buckets: [100, 250, 500, 1000, 2000, 5000, 10000, 30000],
  registers: [metricsRegistry],
});

export const promTemplateSelectedCounter = new Counter({
  name: "resume_builder_template_selections_total",
  help: "Total times a template was selected",
  labelNames: ["templateId", "templateName"],
  registers: [metricsRegistry],
});

export const promTemplateUsageGauge = new Gauge({
  name: "resume_builder_template_usage_current",
  help: "Current number of resumes using each template",
  labelNames: ["templateId"],
  registers: [metricsRegistry],
});

export const promSuspiciousActivityCounter = new Counter({
  name: "resume_builder_suspicious_activities_total",
  help: "Total suspicious activities detected",
  labelNames: ["type", "details"],
  registers: [metricsRegistry],
});

// ─────────────────────────────────────────────────────────────────
// USER METRICS
// ─────────────────────────────────────────────────────────────────

/**
 * Counter for user signups
 */
export const userSignupCounter = meter.createCounter("user_signups_total", {
  description: "Total number of user signups",
});

/**
 * Counter for successful logins
 */
export const userLoginCounter = meter.createCounter("user_logins_total", {
  description: "Total successful user logins",
});

/**
 * Counter for failed login attempts
 */
export const userLoginFailureCounter = meter.createCounter(
  "user_login_failures_total",
  {
    description: "Total failed login attempts",
  }
);

// ─────────────────────────────────────────────────────────────────
// RESUME METRICS
// ─────────────────────────────────────────────────────────────────

/**
 * Counter for resumes created
 */
export const resumeCreatedCounter = meter.createCounter("resumes_created_total", {
  description: "Total number of resumes created",
});

/**
 * Counter for resumes deleted
 */
export const resumeDeletedCounter = meter.createCounter("resumes_deleted_total", {
  description: "Total number of resumes deleted",
});

/**
 * Gauge for total resumes in system
 */
export const totalResumesGauge = meter.createUpDownCounter("resumes_total", {
  description: "Total number of resumes in system",
});

// ─────────────────────────────────────────────────────────────────
// PDF EXPORT METRICS
// ─────────────────────────────────────────────────────────────────

/**
 * Counter for successful PDF exports
 */
export const pdfExportSuccessCounter = meter.createCounter(
  "pdf_exports_success_total",
  {
    description: "Total successful PDF exports",
  }
);

/**
 * Counter for failed PDF exports
 */
export const pdfExportFailureCounter = meter.createCounter(
  "pdf_exports_failure_total",
  {
    description: "Total failed PDF exports",
  }
);

/**
 * Counter for PDF export retries (non-final failures)
 */
export const pdfExportRetryCounter = meter.createCounter("pdf_exports_retries_total", {
  description: "Total PDF export retry attempts (non-final failures)",
});

/**
 * Histogram for PDF export duration (milliseconds)
 */
export const pdfExportDurationHistogram = meter.createHistogram(
  "pdf_export_duration",
  {
    description: "Time taken to export resume as PDF",
    unit: "ms",
  }
);

// ─────────────────────────────────────────────────────────────────
// TEMPLATE METRICS
// ─────────────────────────────────────────────────────────────────

/**
 * Counter for template selections
 */
export const templateSelectedCounter = meter.createCounter(
  "template_selections_total",
  {
    description: "Total times a template was selected",
  }
);

/**
 * Gauge for template usage distribution
 */
export const templateUsageGauge = meter.createUpDownCounter(
  "template_usage_current",
  {
    description: "Current number of resumes using each template",
  }
);

// ─────────────────────────────────────────────────────────────────
// SECURITY METRICS
// ─────────────────────────────────────────────────────────────────

/**
 * Counter for suspicious activities detected
 */
export const suspiciousActivityCounter = meter.createCounter(
  "suspicious_activities_total",
  {
    description: "Total suspicious activities detected",
  }
);

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Record user signup
 */
export function recordUserSignup(attributes?: Record<string, string>) {
  userSignupCounter.add(1, attributes);
  promUserSignupCounter.labels(attributes?.provider || "unknown").inc();
}

/**
 * Record successful login
 */
export function recordLogin(attributes?: Record<string, string>) {
  userLoginCounter.add(1, attributes);
  promUserLoginCounter.labels(attributes?.email || "unknown").inc();
}

/**
 * Record failed login
 */
export function recordLoginFailure(reason: string) {
  userLoginFailureCounter.add(1, { reason });
  promUserLoginFailureCounter.labels(reason).inc();
}

/**
 * Record resume creation
 */
export function recordResumeCreated(templateId: string) {
  resumeCreatedCounter.add(1, { templateId });
  totalResumesGauge.add(1);
  promResumeCreatedCounter.labels(templateId).inc();
  promTotalResumesGauge.inc();
}

/**
 * Record resume deletion
 */
export function recordResumeDeleted() {
  resumeDeletedCounter.add(1);
  totalResumesGauge.add(-1);
  promResumeDeletedCounter.inc();
  promTotalResumesGauge.dec();
}

/**
 * Record successful PDF export
 */
export function recordPdfExportSuccess(durationMs: number, preset: string) {
  pdfExportSuccessCounter.add(1, { preset });
  pdfExportDurationHistogram.record(durationMs, { preset });
  promPdfExportSuccessCounter.labels(preset).inc();
  promPdfExportDurationHistogram.labels(preset).observe(durationMs);
}

/**
 * Record failed PDF export
 */
export function recordPdfExportFailure(reason: string) {
  pdfExportFailureCounter.add(1, { reason });
  promPdfExportFailureCounter.labels(reason).inc();
}

/**
 * Record a retry attempt (job failed but will be retried)
 */
export function recordPdfExportRetry(reason?: string) {
  pdfExportRetryCounter.add(1, reason ? { reason } : {});
  promPdfExportRetryCounter.labels(reason || "unknown").inc();
}

/**
 * Record template selection
 */
export function recordTemplateSelection(templateId: string, templateName: string) {
  templateSelectedCounter.add(1, { templateId, templateName });
  templateUsageGauge.add(1, { templateId });
  promTemplateSelectedCounter.labels(templateId, templateName).inc();
  promTemplateUsageGauge.labels(templateId).inc();
}

/**
 * Record suspicious activity
 */
export function recordSuspiciousActivity(type: string, details?: string) {
  suspiciousActivityCounter.add(1, { type, details: details || "unknown" });
  promSuspiciousActivityCounter.labels(type, details || "unknown").inc();
}

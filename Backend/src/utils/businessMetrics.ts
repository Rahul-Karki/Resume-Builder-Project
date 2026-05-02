/**
 * Custom Business Metrics
 * 
 * Tracks application-specific events and metrics beyond HTTP/DB level
 * Examples: user signups, resumes created, PDF exports, etc.
 * 
 * Integration with OpenTelemetry for production monitoring
 */

import { metrics } from "@opentelemetry/api";

// Get global meter
const meter = metrics.getMeter("resume-builder-business");

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

/**
 * Gauge for active users (sessions)
 */
export const activeUsersGauge = meter.createUpDownCounter("active_users", {
  description: "Number of currently active users",
});

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

/**
 * Histogram for resume content size (in bytes)
 */
export const resumeSizeHistogram = meter.createHistogram("resume_size_bytes", {
  description: "Distribution of resume content size",
  unit: "bytes",
});

/**
 * Histogram for time to save a resume (milliseconds)
 */
export const resumeSaveTimeHistogram = meter.createHistogram(
  "resume_save_duration_ms",
  {
    description: "Time taken to save resume changes",
    unit: "ms",
  }
);

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
 * Histogram for PDF export duration (milliseconds)
 */
export const pdfExportDurationHistogram = meter.createHistogram(
  "pdf_export_duration_ms",
  {
    description: "Time taken to export resume as PDF",
    unit: "ms",
  }
);

/**
 * Gauge for PDF export queue size
 */
export const pdfExportQueueGauge = meter.createUpDownCounter(
  "pdf_export_queue_size",
  {
    description: "Number of PDF exports in queue",
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
 * Counter for CSRF failures
 */
export const csrfFailureCounter = meter.createCounter("csrf_failures_total", {
  description: "Total CSRF validation failures",
});

/**
 * Counter for authentication failures
 */
export const authFailureCounter = meter.createCounter(
  "auth_failures_total",
  {
    description: "Total authentication failures",
  }
);

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
}

/**
 * Record successful login
 */
export function recordLogin(attributes?: Record<string, string>) {
  userLoginCounter.add(1, attributes);
}

/**
 * Record failed login
 */
export function recordLoginFailure(reason: string) {
  userLoginFailureCounter.add(1, { reason });
}

/**
 * Update active users (increment/decrement)
 */
export function updateActiveUsers(delta: number) {
  activeUsersGauge.add(delta);
}

/**
 * Record resume creation
 */
export function recordResumeCreated(templateId: string) {
  resumeCreatedCounter.add(1, { templateId });
  totalResumesGauge.add(1);
}

/**
 * Record resume deletion
 */
export function recordResumeDeleted() {
  resumeDeletedCounter.add(1);
  totalResumesGauge.add(-1);
}

/**
 * Record resume content size
 */
export function recordResumeSizeChange(sizeBytes: number) {
  resumeSizeHistogram.record(sizeBytes);
}

/**
 * Record resume save time
 */
export function recordResumeSaveTime(durationMs: number) {
  resumeSaveTimeHistogram.record(durationMs);
}

/**
 * Record successful PDF export
 */
export function recordPdfExportSuccess(durationMs: number, preset: string) {
  pdfExportSuccessCounter.add(1, { preset });
  pdfExportDurationHistogram.record(durationMs, { preset });
}

/**
 * Record failed PDF export
 */
export function recordPdfExportFailure(reason: string) {
  pdfExportFailureCounter.add(1, { reason });
}

/**
 * Update PDF export queue size
 */
export function updatePdfExportQueue(delta: number) {
  pdfExportQueueGauge.add(delta);
}

/**
 * Record template selection
 */
export function recordTemplateSelection(templateId: string, templateName: string) {
  templateSelectedCounter.add(1, { templateId, templateName });
  templateUsageGauge.add(1, { templateId });
}

/**
 * Record template deselection
 */
export function recordTemplateDeselection(templateId: string) {
  templateUsageGauge.add(-1, { templateId });
}

/**
 * Record CSRF failure
 */
export function recordCsrfFailure(path: string) {
  csrfFailureCounter.add(1, { path });
}

/**
 * Record authentication failure
 */
export function recordAuthFailure(reason: string) {
  authFailureCounter.add(1, { reason });
}

/**
 * Record suspicious activity
 */
export function recordSuspiciousActivity(type: string, details?: string) {
  suspiciousActivityCounter.add(1, { type, details: details || "unknown" });
}

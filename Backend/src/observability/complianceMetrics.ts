import { metrics } from "@opentelemetry/api";
import { Counter, Histogram, Gauge, collectDefaultMetrics, Registry } from "prom-client";

const complianceMeter = metrics.getMeter("resume-builder-compliance");

/**
 * Error Rate Monitoring & Compliance Metrics
 * 
 * Tracks:
 * - Error rates by type and endpoint
 * - Data integrity issues
 * - Referential integrity violations
 * - Audit trail completeness
 * - Performance and SLA metrics
 */

const complianceRegistry = new Registry();

collectDefaultMetrics({ register: complianceRegistry, prefix: "compliance_" });

// ── Prometheus Metrics (local registry, not served on any endpoint) ──

export const errorRateTotalCounter = new Counter({
  name: "error_rate_total",
  help: "Total errors by type and endpoint",
  labelNames: ["error_type", "endpoint", "method", "status_code"],
  registers: [complianceRegistry],
});

export const validationErrorsCounter = new Counter({
  name: "validation_errors_total",
  help: "Total validation errors",
  labelNames: ["field", "type", "endpoint"],
  registers: [complianceRegistry],
});

export const referentialIntegrityViolationsCounter = new Counter({
  name: "referential_integrity_violations_total",
  help: "Total referential integrity violations (orphaned documents)",
  labelNames: ["collection", "reference_field"],
  registers: [complianceRegistry],
});

export const cascadeDeleteFailuresCounter = new Counter({
  name: "cascade_delete_failures_total",
  help: "Total cascade delete operation failures",
  labelNames: ["parent_collection", "child_collection"],
  registers: [complianceRegistry],
});

export const auditLogEntriesCounter = new Counter({
  name: "audit_log_entries_total",
  help: "Total audit log entries created",
  labelNames: ["action", "collection"],
  registers: [complianceRegistry],
});

export const auditLogLatencyHistogram = new Histogram({
  name: "audit_log_latency_ms",
  help: "Latency of audit log creation in milliseconds",
  labelNames: ["action", "collection"],
  buckets: [10, 50, 100, 250, 500, 1000, 2500],
  registers: [complianceRegistry],
});

export const missingAuditLogsCounter = new Counter({
  name: "missing_audit_logs_total",
  help: "Documents missing audit trail entries",
  labelNames: ["collection"],
  registers: [complianceRegistry],
});

export const orphanedDocumentsGauge = new Gauge({
  name: "orphaned_documents_count",
  help: "Number of orphaned documents (references to deleted parents)",
  labelNames: ["collection", "reference_field"],
  registers: [complianceRegistry],
});

export const dataCorruptionDetectionsCounter = new Counter({
  name: "data_corruption_detections_total",
  help: "Total data corruption issues detected",
  labelNames: ["collection", "issue_type"],
  registers: [complianceRegistry],
});

export const softDeleteGauge = new Gauge({
  name: "soft_deleted_documents_count",
  help: "Number of soft-deleted documents",
  labelNames: ["collection"],
  registers: [complianceRegistry],
});

export const requestComplianceHistogram = new Histogram({
  name: "request_compliance_check_duration_ms",
  help: "Duration of compliance checks per request",
  labelNames: ["check_type"],
  buckets: [5, 10, 25, 50, 100, 250],
  registers: [complianceRegistry],
});

export const complianceViolationsCounter = new Counter({
  name: "compliance_violations_total",
  help: "Total compliance violations detected",
  labelNames: ["violation_type", "severity"],
  registers: [complianceRegistry],
});

export const dataAccessLogsCounter = new Counter({
  name: "data_access_logs_total",
  help: "Total data access events logged",
  labelNames: ["user_id", "action", "collection"],
  registers: [complianceRegistry],
});

// ── OpenTelemetry Metrics (pushed to Grafana Cloud via OTLP) ────────

const otelErrorRateTotal = complianceMeter.createCounter("compliance_error_rate_total", {
  description: "Total errors by type and endpoint",
});

const otelValidationErrors = complianceMeter.createCounter("compliance_validation_errors_total", {
  description: "Total validation errors",
});

const otelReferentialIntegrityViolations = complianceMeter.createCounter(
  "compliance_referential_integrity_violations_total",
  { description: "Total referential integrity violations" },
);

const otelCascadeDeleteFailures = complianceMeter.createCounter(
  "compliance_cascade_delete_failures_total",
  { description: "Total cascade delete operation failures" },
);

const otelAuditLogEntries = complianceMeter.createCounter("compliance_audit_log_entries_total", {
  description: "Total audit log entries created",
});

const otelMissingAuditLogs = complianceMeter.createCounter("compliance_missing_audit_logs_total", {
  description: "Documents missing audit trail entries",
});

const otelDataCorruptionDetections = complianceMeter.createCounter(
  "compliance_data_corruption_detections_total",
  { description: "Total data corruption issues detected" },
);

const otelComplianceViolations = complianceMeter.createCounter(
  "compliance_violations_total",
  { description: "Total compliance violations detected" },
);

const otelDataAccessLogs = complianceMeter.createCounter("compliance_data_access_logs_total", {
  description: "Total data access events logged",
});

const otelAuditLogLatency = complianceMeter.createHistogram("compliance_audit_log_latency_ms", {
  description: "Latency of audit log creation",
  unit: "ms",
});

const otelRequestComplianceDuration = complianceMeter.createHistogram(
  "compliance_request_check_duration_ms",
  { description: "Duration of compliance checks per request", unit: "ms" },
);

// Observable gauges for set-style metrics
const orphanedDocValues = new Map<string, number>();
const softDeleteValues = new Map<string, number>();

const otelOrphanedDocuments = complianceMeter.createObservableGauge(
  "compliance_orphaned_documents_count",
  { description: "Number of orphaned documents" },
);
otelOrphanedDocuments.addCallback((result) => {
  for (const [key, count] of orphanedDocValues) {
    const [collection, refField] = key.split("\0");
    result.observe(count, { collection, reference_field: refField });
  }
});

const otelSoftDeletedDocs = complianceMeter.createObservableGauge(
  "compliance_soft_deleted_documents_count",
  { description: "Number of soft-deleted documents" },
);
otelSoftDeletedDocs.addCallback((result) => {
  for (const [collection, count] of softDeleteValues) {
    result.observe(count, { collection });
  }
});

// ══════════════════════════════════════════════════════════════════
// ERROR RATE CALCULATION
// ══════════════════════════════════════════════════════════════════

export interface ErrorRateMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  errorRate: number; // errors per minute
  criticalErrors: number;
  warningErrors: number;
}

/**
 * Track error occurrence
 */
export function recordError(
  errorType: string,
  endpoint: string,
  method: string,
  statusCode: number | string,
  isCritical = false
) {
  const statusStr = String(statusCode);
  errorRateTotalCounter.labels(errorType, endpoint, method, statusStr).inc();
  otelErrorRateTotal.add(1, { error_type: errorType, endpoint, method, status_code: statusStr });

  if (isCritical) {
    complianceViolationsCounter.labels(errorType, "critical").inc();
    otelComplianceViolations.add(1, { violation_type: errorType, severity: "critical" });
  }
}

/**
 * Track validation errors
 */
export function recordValidationError(
  field: string,
  type: string,
  endpoint: string
) {
  validationErrorsCounter.labels(field, type, endpoint).inc();
  otelValidationErrors.add(1, { field, type, endpoint });

  complianceViolationsCounter.labels("validation_error", "warning").inc();
  otelComplianceViolations.add(1, { violation_type: "validation_error", severity: "warning" });
}

/**
 * Track referential integrity violations
 */
export function recordIntegrityViolation(collection: string, refField: string) {
  referentialIntegrityViolationsCounter.labels(collection, refField).inc();
  otelReferentialIntegrityViolations.add(1, { collection, reference_field: refField });

  complianceViolationsCounter.labels("referential_integrity", "critical").inc();
  otelComplianceViolations.add(1, { violation_type: "referential_integrity", severity: "critical" });
}

/**
 * Track cascade delete failures
 */
export function recordCascadeDeleteFailure(
  parentCollection: string,
  childCollection: string
) {
  cascadeDeleteFailuresCounter.labels(parentCollection, childCollection).inc();
  otelCascadeDeleteFailures.add(1, { parent_collection: parentCollection, child_collection: childCollection });

  complianceViolationsCounter.labels("cascade_delete_failure", "critical").inc();
  otelComplianceViolations.add(1, { violation_type: "cascade_delete_failure", severity: "critical" });
}

/**
 * Track audit log creation
 */
export function recordAuditLog(action: string, collection: string, durationMs: number) {
  auditLogEntriesCounter.labels(action, collection).inc();
  otelAuditLogEntries.add(1, { action, collection });

  auditLogLatencyHistogram.labels(action, collection).observe(durationMs / 1000);
  otelAuditLogLatency.record(durationMs, { action, collection });
}

/**
 * Record orphaned documents found
 */
export function recordOrphanedDocuments(
  collection: string,
  refField: string,
  count: number
) {
  orphanedDocumentsGauge.labels(collection, refField).set(count);
  orphanedDocValues.set(`${collection}\0${refField}`, count);

  if (count > 0) {
    dataCorruptionDetectionsCounter.labels(collection, "orphaned_documents").inc();
    otelDataCorruptionDetections.add(1, { collection, issue_type: "orphaned_documents" });

    complianceViolationsCounter.labels("orphaned_documents", "warning").inc();
    otelComplianceViolations.add(1, { violation_type: "orphaned_documents", severity: "warning" });
  }
}

/**
 * Record soft deleted documents count
 */
export function recordSoftDeletedCount(collection: string, count: number) {
  softDeleteGauge.labels(collection).set(count);
  softDeleteValues.set(collection, count);
}

/**
 * Get current compliance status
 */
export async function getComplianceStatus(): Promise<{
  status: "healthy" | "degraded" | "critical";
  metrics: ErrorRateMetrics;
  violations: Record<string, number>;
}> {
  // This would be implemented with actual metric collection
  return {
    status: "healthy",
    metrics: {
      totalErrors: 0,
      errorsByType: {},
      errorsByEndpoint: {},
      errorRate: 0,
      criticalErrors: 0,
      warningErrors: 0,
    },
    violations: {},
  };
}

export { complianceRegistry };

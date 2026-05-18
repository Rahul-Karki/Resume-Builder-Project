import { Counter, Histogram, Gauge, collectDefaultMetrics, Registry } from "prom-client";

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

// Collect default metrics
collectDefaultMetrics({ register: complianceRegistry, prefix: "compliance_" });

// ══════════════════════════════════════════════════════════════════
// ERROR RATE METRICS
// ══════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════
// AUDIT TRAIL METRICS
// ══════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════
// DATA INTEGRITY METRICS
// ══════════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════════
// COMPLIANCE & SLA METRICS
// ══════════════════════════════════════════════════════════════════

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

  if (isCritical) {
    complianceViolationsCounter.labels(errorType, "critical").inc();
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
  complianceViolationsCounter.labels("validation_error", "warning").inc();
}

/**
 * Track referential integrity violations
 */
export function recordIntegrityViolation(collection: string, refField: string) {
  referentialIntegrityViolationsCounter
    .labels(collection, refField)
    .inc();
  complianceViolationsCounter
    .labels("referential_integrity", "critical")
    .inc();
}

/**
 * Track cascade delete failures
 */
export function recordCascadeDeleteFailure(
  parentCollection: string,
  childCollection: string
) {
  cascadeDeleteFailuresCounter.labels(parentCollection, childCollection).inc();
  complianceViolationsCounter
    .labels("cascade_delete_failure", "critical")
    .inc();
}

/**
 * Track audit log creation
 */
export function recordAuditLog(action: string, collection: string, durationMs: number) {
  auditLogEntriesCounter.labels(action, collection).inc();
  auditLogLatencyHistogram.labels(action, collection).observe(durationMs / 1000); // Convert to seconds
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

  if (count > 0) {
    dataCorruptionDetectionsCounter
      .labels(collection, "orphaned_documents")
      .inc();
    complianceViolationsCounter.labels("orphaned_documents", "warning").inc();
  }
}

/**
 * Record soft deleted documents count
 */
export function recordSoftDeletedCount(collection: string, count: number) {
  softDeleteGauge.labels(collection).set(count);
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

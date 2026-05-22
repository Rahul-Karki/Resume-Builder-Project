---
# Feature: Admin Audit & Compliance
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides a comprehensive compliance layer that automatically logs all data changes, ensures referential integrity, supports soft-delete with restore, and cascades deletes to child documents — all backed by admin-facing query and reporting endpoints.

## User Stories
- As an admin, I want to view the full audit history of any document so that I can investigate data changes.
- As an admin, I want to check data integrity so that I can detect orphaned documents.
- As a compliance officer, I want to export audit logs so that I can meet regulatory requirements.
- As an admin, I want to receive alerts when compliance violations are detected.

## Scope
### In scope
- Automatic audit logging for all create, update, delete, restore operations via Mongoose plugin
- Soft delete with restore capability on all models
- Cascade delete of child documents when parent is deleted
- Audit log query with filters (userId, collection, action, date range)
- Audit log CSV export
- Data integrity checker (periodic orphaned-document detection)
- Manual integrity check trigger
- Compliance report endpoint
- Compliance metrics (Prometheus)
- Alert dispatch on violations (Slack, PagerDuty, Sentry, email, webhook)
- Alert test endpoint

### Out of scope
- Real-time compliance monitoring dashboard
- Automated fix for orphaned documents (detect only)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/router/compliance.routes.ts | All compliance/audit/alert admin endpoints |
| Backend/src/models/AuditLog.ts | Audit log schema with TTL and compound indexes |
| Backend/src/models/plugins/auditTrail.ts | Mongoose plugin — auto-logs all mutations |
| Backend/src/models/plugins/softDelete.ts | Mongoose plugin — adds deletedAt, softDelete(), restore() |
| Backend/src/models/plugins/cascadeDelete.ts | Mongoose plugin — deletes dependent documents |
| Backend/src/services/dataIntegrityService.ts | Periodic orphaned-document checker |
| Backend/src/middleware/referentialIntegrity.ts | Pre-creation/update foreign key validation |
| Backend/src/observability/complianceMetrics.ts | Prometheus compliance metrics |
| Backend/src/observability/alerting.ts | Alert dispatch service |
| Backend/src/middleware/adminAudit.ts | Express middleware — logs admin action access |

### Data model
`	ypescript
// AuditLog model (simplified)
interface IAuditLog {
  collectionName: string;
  documentId: string;
  userId?: ObjectId;
  userEmail?: string;
  ipAddress?: string;
  action: "create" | "update" | "delete" | "restore" | "read";
  changes?: Array<{ field, from, to }>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  errorMessage?: string;
  timestamp: Date;           // TTL index: auto-delete after 1 year
}
`

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /admin/audit-logs | Admin | Query audit logs with filters |
| GET | /admin/audit-logs/:documentId | Admin | Get full audit history for a document |
| GET | /admin/audit-export | Admin | Export audit logs as CSV |
| GET | /admin/integrity-status | Admin | Current data integrity status |
| POST | /admin/integrity-check | Admin | Trigger manual integrity check |
| GET | /admin/compliance-report | Admin | Compliance summary report |
| GET | /admin/compliance-violations | Admin | Recent compliance violations |
| POST | /admin/alert-test | Admin | Send a test alert to configured channels |
| GET | /admin/metrics/compliance | Admin | Compliance metrics snapshot |

## Edge Cases & Error Handling
- TTL cleanup removes old audit logs automatically (1-year retention).
- Soft-deleted documents are excluded from normal queries; withDeleted() exposes them.
- Cascade delete is best-effort: if a child collection is missing, it logs a warning and continues.
- Data integrity check runs on a configurable interval; overlaps are prevented.
- Alert channel failure is non-fatal — errors are logged but the check continues.

## Tests
- Unit: __tests__/models/plugins.test.ts, __tests__/models/auditLog.test.ts, __tests__/dataIntegrityService.test.ts, __tests__/complianceMetrics.test.ts, __tests__/alerting.test.ts, __tests__/referentialIntegrity.test.ts
- Integration: part of __tests__/integration/admin.test.ts

## Open Questions
- Should the 1-year audit log retention be configurable per deployment? (owner: TBD)
- Should backup codes in the User model be hashed? Currently stored in plaintext. (owner: TBD)

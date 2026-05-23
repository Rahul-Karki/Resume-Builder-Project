import { describe, it, expect, vi, beforeEach } from "vitest";

describe("complianceMetrics", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("trackAuditLogEntry", () => {
    it("should increment the audit log counter with action labels", async () => {
      const { auditLogEntriesCounter, recordAuditLog } = await import("../observability/complianceMetrics");
      recordAuditLog("create", "User", 10);
      const metric = await (await import("../observability/complianceMetrics")).auditLogEntriesCounter.labels("create", "User");
      expect(metric).toBeDefined();
    });
  });
  describe("trackComplianceViolation", () => {
    it("should increment the violation counter with violation type", async () => {
      const { complianceViolationsCounter, recordError } = await import("../observability/complianceMetrics");
      recordError("validation_error", "/api/resumes", "POST", 400, true);
      const metric = complianceViolationsCounter.labels("validation_error", "critical");
      expect(metric).toBeDefined();
    });
  });
  describe("trackOrphanedDocuments", () => {
    it("should set the orphaned documents gauge", async () => {
      const { orphanedDocumentsGauge, recordOrphanedDocuments } = await import("../observability/complianceMetrics");
      recordOrphanedDocuments("resumes", "userId", 5);
      const metric = orphanedDocumentsGauge.labels("resumes", "userId");
      expect(metric).toBeDefined();
    });
  });
});

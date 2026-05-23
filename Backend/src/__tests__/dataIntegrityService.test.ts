import { describe, it, expect, vi, beforeEach } from "vitest";

describe("dataIntegrityService", () => {
  let mockOrphans: any[];
  let DataIntegrityCheckerClass: any;

  beforeEach(async () => {
    mockOrphans = [];
    vi.resetModules();
    vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
    vi.doMock("../observability/complianceMetrics", () => ({
      recordOrphanedDocuments: vi.fn(),
      recordSoftDeletedCount: vi.fn(),
    }));
    vi.doMock("../observability/alerting", () => ({ alertDataIntegrityIssue: vi.fn() }));
    vi.doMock("../middleware/referentialIntegrity", () => ({
      default: class MockValidator {
        findOrphanedDocuments = vi.fn().mockImplementation(() => Promise.resolve(mockOrphans));
        validate = vi.fn().mockResolvedValue({ valid: true, errors: [] });
      },
    }));
    vi.doMock("../utils/mongooseModelResolver", () => ({
      getModelIfRegistered: vi.fn().mockReturnValue(null),
      resolveModelByCollection: vi.fn().mockReturnValue(null),
    }));
    vi.doMock("../models/AuditLog", () => ({
      default: { findOne: vi.fn().mockResolvedValue(null), countDocuments: vi.fn().mockResolvedValue(0) },
    }));
    const mod = await import("../services/dataIntegrityService");
    DataIntegrityCheckerClass = mod.DataIntegrityChecker;
  });

  describe("checkReferentialIntegrity", () => {
    it("should return no violations when all references are valid", async () => {
      const instance = new DataIntegrityCheckerClass();
      const result = await instance.runFullIntegrityCheck();
      expect(result).toBeDefined();
      expect(result.orphanedDocuments).toEqual([]);
    });
    it("should detect orphaned resume references to deleted users", async () => {
      mockOrphans = [{ _id: "orphan1", userId: "deletedUser" }];
      const instance = new DataIntegrityCheckerClass();
      const result = await instance.runFullIntegrityCheck();
      expect(result.orphanedDocuments.length).toBeGreaterThan(0);
    });
    it("should detect orphaned ATS analysis references to deleted resumes", async () => {
      mockOrphans = [{ _id: "orphan-ats" }];
      const instance = new DataIntegrityCheckerClass();
      const result = await instance.runFullIntegrityCheck();
      expect(result.orphanedDocuments.length).toBeGreaterThan(0);
    });
  });
  describe("startPeriodicChecks", () => {
    it("should run checks on the configured interval", async () => {
      vi.useFakeTimers();
      const instance = new DataIntegrityCheckerClass();
      const spy = vi.spyOn(instance, "runFullIntegrityCheck").mockResolvedValue({});
      instance.startPeriodicChecks(1000);
      vi.advanceTimersByTime(1000);
      expect(spy).toHaveBeenCalled();
      instance.stopPeriodicChecks();
      vi.useRealTimers();
    });
    it("should not overlap concurrent runs", async () => {
      const instance = new DataIntegrityCheckerClass();
      instance.isRunning = true;
      const result = await instance.runFullIntegrityCheck();
      expect(result).toBeUndefined();
    });
  });
  describe("stopPeriodicChecks", () => {
    it("should clear the interval timer", async () => {
      vi.useFakeTimers();
      const instance = new DataIntegrityCheckerClass();
      const spy = vi.spyOn(instance, "runFullIntegrityCheck").mockResolvedValue({});
      instance.startPeriodicChecks(1000);
      instance.stopPeriodicChecks();
      vi.advanceTimersByTime(2000);
      expect(spy).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});

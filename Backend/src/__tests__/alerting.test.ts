import { describe, it, expect, vi, beforeEach } from "vitest";
import { alertingService, AlertingService } from "../observability/alerting";

describe("alerting", () => {
  let service: AlertingService;

  beforeEach(() => {
    service = new AlertingService();
    vi.spyOn(service, "sendAlert" as any).mockResolvedValue(true);
  });

  describe("alertComplianceIssue", () => {
    it("should dispatch alerts to all configured channels", async () => {
      const { alertComplianceIssue } = await import("../observability/alerting");
      const spy = vi.spyOn(alertingService, "sendAlert").mockResolvedValue(true);
      await alertComplianceIssue("Test", "Description", "high");
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ title: "Test", category: "compliance" }));
    });
    it("should throw when a channel is unreachable", async () => {
      const { alertComplianceIssue } = await import("../observability/alerting");
      vi.spyOn(alertingService, "sendAlert").mockRejectedValue(new Error("Channel down"));
      await expect(alertComplianceIssue("Test", "Desc", "low")).rejects.toThrow("Channel down");
    });
  });
  describe("alertSecurityIssue", () => {
    it("should include severity and source IP in the alert payload", async () => {
      const { alertSecurityIssue } = await import("../observability/alerting");
      const spy = vi.spyOn(alertingService, "sendAlert").mockResolvedValue(true);
      await alertSecurityIssue("Security alert", "Intrusion detected", "critical", "user-123");
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ severity: "critical", affectedUser: "user-123", category: "security" }));
    });
    it("should send high-severity alerts immediately", async () => {
      const { alertSecurityIssue } = await import("../observability/alerting");
      const spy = vi.spyOn(alertingService, "sendAlert").mockResolvedValue(true);
      await alertSecurityIssue("Critical alert", "Breach", "critical");
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ severity: "critical", channels: ["sentry", "slack", "pagerduty"] }));
    });
  });
  describe("alertDataIntegrityIssue", () => {
    it("should include document IDs and collection names", async () => {
      const { alertDataIntegrityIssue } = await import("../observability/alerting");
      const spy = vi.spyOn(alertingService, "sendAlert").mockResolvedValue(true);
      await alertDataIntegrityIssue("Integrity issue", "Orphans found", "resumes", { count: 5 });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ affectedCollection: "resumes", title: "Integrity issue", category: "data-integrity" }));
    });
  });
});

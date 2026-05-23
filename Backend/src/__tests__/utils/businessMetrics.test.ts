import { describe, it, expect, vi, beforeEach } from "vitest";
import { recordUserSignup, recordLogin, recordLoginFailure, recordResumeCreated, userSignupCounter, userLoginCounter, userLoginFailureCounter, resumeCreatedCounter, resumeDeletedCounter, totalResumesGauge } from "../../utils/businessMetrics";

vi.mock("@opentelemetry/api", () => ({
  metrics: {
    getMeter: vi.fn(() => ({
      createCounter: vi.fn(() => ({ add: vi.fn() })),
      createHistogram: vi.fn(() => ({ record: vi.fn() })),
      createUpDownCounter: vi.fn(() => ({ add: vi.fn() })),
    })),
  },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("businessMetrics", () => {
  describe("recordUserSignup", () => {
    it("should increment the signup counter", () => {
      recordUserSignup();
      expect(vi.mocked(userSignupCounter.add)).toHaveBeenCalledWith(1, undefined);
    });

    it("should record the signup method", () => {
      recordUserSignup({ method: "google" });
      expect(vi.mocked(userSignupCounter.add)).toHaveBeenCalledWith(1, { method: "google" });
    });
  });

  describe("recordLogin", () => {
    it("should increment the login success counter", () => {
      recordLogin();
      expect(vi.mocked(userLoginCounter.add)).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe("recordLoginFailure", () => {
    it("should increment the login failure counter", () => {
      recordLoginFailure("invalid_password");
      expect(vi.mocked(userLoginFailureCounter.add)).toHaveBeenCalledWith(1, { reason: "invalid_password" });
    });
  });

  describe("recordResumeCreated", () => {
    it("should increment the resume created counter", () => {
      recordResumeCreated("template-1");
      expect(vi.mocked(resumeCreatedCounter.add)).toHaveBeenCalledWith(1, { templateId: "template-1" });
      expect(vi.mocked(totalResumesGauge.add)).toHaveBeenCalledWith(1);
    });
  });
});

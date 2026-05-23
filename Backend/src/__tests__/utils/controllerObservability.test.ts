import { describe, it, expect, vi, beforeEach } from "vitest";
import { startControllerSpan, markSpanSuccess, markSpanError } from "../../utils/controllerObservability";
import { tracer } from "../../observability";

vi.mock("../../observability", () => ({
  tracer: {
    startSpan: vi.fn(() => ({
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
      end: vi.fn(),
    })),
  },
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("controllerObservability", () => {
  describe("startControllerSpan", () => {
    it("should create and return a new span with controller name", () => {
      const req = { method: "GET", path: "/test", headers: {} } as any;
      const span = startControllerSpan("test-controller", req);
      expect(vi.mocked(tracer.startSpan)).toHaveBeenCalledWith("test-controller");
      expect(vi.mocked(span.setAttribute)).toHaveBeenCalledWith("http.method", "GET");
    });
  });

  describe("markSpanSuccess", () => {
    it("should set the span status to OK", () => {
      const span = vi.mocked(tracer.startSpan)();
      markSpanSuccess(span);
      expect(vi.mocked(span.setStatus)).toHaveBeenCalledWith({ code: 1 });
    });
  });

  describe("markSpanError", () => {
    it("should record the error and set span status to ERROR", () => {
      const span = vi.mocked(tracer.startSpan)();
      const error = new Error("test error");
      markSpanError(span, error, "Something failed");
      expect(vi.mocked(span.recordException)).toHaveBeenCalledWith(error);
      expect(vi.mocked(span.setStatus)).toHaveBeenCalledWith({ code: 2, message: "Something failed" });
    });
  });
});

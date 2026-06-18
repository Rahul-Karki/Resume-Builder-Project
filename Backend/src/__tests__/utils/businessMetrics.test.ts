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
  trace: {
    getTracer: vi.fn(() => ({
      startSpan: vi.fn(() => ({ setAttribute: vi.fn(), setStatus: vi.fn(), end: vi.fn() })),
    })),
    getSpan: vi.fn(() => ({ spanContext: vi.fn(() => ({ traceId: "mock", spanId: "mock" })) })),
    SpanStatusCode: { OK: 0, ERROR: 1 },
  },
}));

vi.mock("prom-client", () => {
  const noop = () => {};
  const mockLabels = vi.fn(function () { return { inc: vi.fn(noop), dec: vi.fn(noop), set: vi.fn(noop), observe: vi.fn(noop) }; });
  const MockCounter = vi.fn(function () { this.inc = vi.fn(noop); this.labels = mockLabels; return this; });
  const MockGauge = vi.fn(function () { this.inc = vi.fn(noop); this.dec = vi.fn(noop); this.set = vi.fn(noop); this.labels = mockLabels; return this; });
  const MockHistogram = vi.fn(function () { this.observe = vi.fn(noop); this.labels = mockLabels; return this; });
  const MockRegistry = vi.fn(function () { this.registerMetric = vi.fn(noop); this.contentType = "text/plain"; this.metrics = vi.fn(noop); return this; });
  return { Counter: MockCounter, Gauge: MockGauge, Histogram: MockHistogram, Registry: MockRegistry };
});

vi.mock("../../observability", () => ({
  metricsRegistry: { registerMetric: vi.fn(), contentType: "text/plain", metrics: vi.fn() },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
  },
  appMetrics: {
    httpRequestsTotal: { add: vi.fn() },
    httpRequestDuration: { record: vi.fn() },
    httpRequestSize: { record: vi.fn() },
    httpErrorsTotal: { add: vi.fn() },
    activeConnections: { add: vi.fn() },
    dbQueryDuration: { record: vi.fn() },
    dbOperationsTotal: { add: vi.fn() },
    emailSentTotal: { add: vi.fn() },
    emailDuration: { record: vi.fn() },
    cacheHits: { add: vi.fn() },
    cacheMisses: { add: vi.fn() },
  },
  context: { active: vi.fn(), bind: vi.fn() },
  metrics: { getMeter: vi.fn() },
  trace: { getTracer: vi.fn() },
  SpanStatusCode: { OK: 0, ERROR: 1 },
  requestLogger: vi.fn(),
  metricsMiddleware: vi.fn(),
  metricsHandler: vi.fn(),
  clientErrorHandler: vi.fn(),
  clientMetricsHandler: vi.fn(),
  initializeObservability: vi.fn(),
  shutdownObservability: vi.fn(),
  trackEmailSent: vi.fn(),
  pushFrontendLog: vi.fn(),
  tracer: { startSpan: vi.fn() },
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

import { Registry } from "prom-client";
import { vi } from "vitest";

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

const mockRegistry = new Registry();

const mockHistogram = {
  record: vi.fn(),
  add: vi.fn(),
};

const mockCounter = {
  add: vi.fn(),
  inc: vi.fn(),
};

const mockGauge = {
  add: vi.fn(),
  set: vi.fn(),
  inc: vi.fn(),
  dec: vi.fn(),
};

const mockAppMetrics = {
  httpRequestsTotal: mockCounter,
  httpRequestDuration: mockHistogram,
  httpErrorsTotal: mockCounter,
  activeConnections: mockCounter,
  dbQueryDuration: mockHistogram,
  cacheHits: mockCounter,
  cacheMisses: mockCounter,
};

const mockTracer = {
  startSpan: vi.fn().mockReturnValue({ setAttribute: vi.fn(), end: vi.fn() }),
};

export const logger = mockLogger;
export const metricsRegistry = mockRegistry;
export const appMetrics = mockAppMetrics;
export const tracer = mockTracer;
export const requestLogger = vi.fn();
export const metricsMiddleware = vi.fn();
export const clientErrorHandler = vi.fn();
export const clientMetricsHandler = vi.fn();
export const metricsHandler = vi.fn();
export const frontendMetricsCounter = mockCounter;
export const frontendMetricsHistogram = mockHistogram;
export const context = {};
export const metrics = {
  getMeter: vi.fn().mockReturnValue({
    createCounter: vi.fn().mockReturnValue(mockCounter),
    createHistogram: vi.fn().mockReturnValue(mockHistogram),
    createUpDownCounter: vi.fn().mockReturnValue(mockGauge),
    createObservableGauge: vi.fn().mockReturnValue({ addCallback: vi.fn() }),
  }),
};
export const SpanStatusCode = { OK: 0, ERROR: 1 };
export const trace = {
  getSpan: vi.fn(),
  getTracer: vi.fn().mockReturnValue(mockTracer),
};
export const pushFrontendLog = vi.fn();
export const initializeObservability = vi.fn();
export const shutdownObservability = vi.fn();

export default { logger: mockLogger, metricsRegistry: mockRegistry };

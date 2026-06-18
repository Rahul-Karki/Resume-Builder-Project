import crypto from "crypto";
import { context, metrics, SpanStatusCode, trace } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { MongoDBInstrumentation } from "@opentelemetry/instrumentation-mongodb";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { NextFunction, Request, Response } from "express";
import pino, { LoggerOptions } from "pino";
import pinoHttp from "pino-http";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { env } from "./config/env";

const metricsRegistry = new Registry();

export { metricsRegistry };

if (env.ENABLE_METRICS) {
  collectDefaultMetrics({
    register: metricsRegistry,
    prefix: "resume_builder_",
  });
}

const eventLoopLagGauge = new Gauge({
  name: "resume_builder_event_loop_lag_ms",
  help: "Event loop lag in milliseconds",
  registers: [metricsRegistry],
});

const gcDurationGauge = new Gauge({
  name: "resume_builder_gc_duration_ms",
  help: "Garbage collection duration in milliseconds",
  labelNames: ["type"],
  registers: [metricsRegistry],
});

const cpuPercentGauge = new Gauge({
  name: "resume_builder_cpu_percent",
  help: "Process CPU usage percentage (0-100 per core)",
  registers: [metricsRegistry],
});

export const promDbOperationsTotal = new Counter({
  name: "resume_builder_db_operations_total",
  help: "Total database operations",
  labelNames: ["operation", "model", "status"],
  registers: [metricsRegistry],
});

export const promEmailSentTotal = new Counter({
  name: "resume_builder_email_sent_total",
  help: "Total emails sent",
  labelNames: ["type", "provider", "status"],
  registers: [metricsRegistry],
});

export const promEmailDurationSeconds = new Histogram({
  name: "resume_builder_email_duration_seconds",
  help: "Email send duration in seconds",
  labelNames: ["type", "provider"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

const promRequestCounter = new Counter({
  name: "resume_builder_http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

const promRequestDurationHistogram = new Histogram({
  name: "resume_builder_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

const promRequestSizeHistogram = new Histogram({
  name: "resume_builder_http_request_size_bytes",
  help: "HTTP request size in bytes",
  labelNames: ["method", "route"],
  buckets: [64, 256, 1024, 4096, 16384, 65536, 262144, 1048576],
  registers: [metricsRegistry],
});

const promDiskReadOpsRate = new Gauge({
  name: "resume_builder_disk_read_ops_per_second",
  help: "Filesystem read operations per second",
  registers: [metricsRegistry],
});

const promDiskWriteOpsRate = new Gauge({
  name: "resume_builder_disk_write_ops_per_second",
  help: "Filesystem write operations per second",
  registers: [metricsRegistry],
});

const clientErrorCounter = new Counter({
  name: "resume_builder_client_errors_total",
  help: "Total client-side (frontend) errors reported",
  labelNames: ["source", "error_type"],
  registers: [metricsRegistry],
});

export const frontendMetricsCounter = new Counter({
  name: "resume_builder_frontend_metrics_total",
  help: "Total frontend performance metrics reported by clients",
  labelNames: ["name", "unit"],
  registers: [metricsRegistry],
});

export const frontendMetricsHistogram = new Histogram({
  name: "resume_builder_frontend_metric_value",
  help: "Distribution of frontend performance metric values",
  labelNames: ["name", "unit"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 3000, 10000, 30000],
  registers: [metricsRegistry],
});

const serviceName = env.SERVICE_NAME;
const serviceVersion = env.SERVICE_VERSION;
const environment = env.NODE_ENV;

const otlpEndpoint = env.GRAFANA_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT;
const otlpInstanceId = env.OTEL_INSTANCE_ID;
const grafanaApiToken = env.GRAFANA_API_TOKEN;

const otlpAuthHeader =
  otlpInstanceId && grafanaApiToken
    ? Buffer.from(`${otlpInstanceId}:${grafanaApiToken}`).toString("base64")
    : "";

const traceExportUrl = env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  ? env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  : otlpEndpoint
    ? `${otlpEndpoint.replace(/\/$/, "")}/v1/traces`
    : "";

const metricExportUrl = env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
  ? env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
  : otlpEndpoint
    ? `${otlpEndpoint.replace(/\/$/, "")}/v1/metrics`
    : "";

const sharedResource = resourceFromAttributes({
  "service.name": serviceName,
  "service.version": serviceVersion,
  "deployment.environment": environment,
});

let meterProvider: MeterProvider | null = null;
let tracerProvider: NodeTracerProvider | null = null;
let initialized = false;

const meterProviderFallback = new MeterProvider({ resource: sharedResource });

type AppMetrics = {
  httpRequestsTotal: { add: (value: number, attributes?: Record<string, string>) => void };
  httpRequestDuration: { record: (value: number, attributes?: Record<string, string>) => void };
  httpRequestSize: { record: (value: number, attributes?: Record<string, string>) => void };
  httpErrorsTotal: { add: (value: number, attributes?: Record<string, string>) => void };
  activeConnections: { add: (value: number, attributes?: Record<string, string>) => void };
  dbQueryDuration: { record: (value: number, attributes?: Record<string, string>) => void };
  dbOperationsTotal: { add: (value: number, attributes?: Record<string, string>) => void };
  emailSentTotal: { add: (value: number, attributes?: Record<string, string>) => void };
  emailDuration: { record: (value: number, attributes?: Record<string, string>) => void };
  cacheHits: { add: (value: number, attributes?: Record<string, string>) => void };
  cacheMisses: { add: (value: number, attributes?: Record<string, string>) => void };
};

const createAppMetrics = (meterInstance: ReturnType<MeterProvider["getMeter"]>): AppMetrics => ({
  httpRequestsTotal: meterInstance.createCounter("http_requests_total", {
    description: "Total HTTP requests",
  }),
  httpRequestDuration: meterInstance.createHistogram("http_request_duration", {
    description: "HTTP request duration in milliseconds",
    unit: "ms",
  }),
  httpRequestSize: meterInstance.createHistogram("http_request_size_bytes", {
    description: "HTTP request size in bytes",
    unit: "By",
  }),
  httpErrorsTotal: meterInstance.createCounter("http_errors_total", {
    description: "Total HTTP errors",
  }),
  activeConnections: meterInstance.createUpDownCounter("active_connections", {
    description: "Active connections",
  }),
  dbQueryDuration: meterInstance.createHistogram("db_query_duration", {
    description: "Database query duration in milliseconds",
    unit: "ms",
  }),
  dbOperationsTotal: meterInstance.createCounter("db_operations_total", {
    description: "Total database operations",
  }),
  emailSentTotal: meterInstance.createCounter("email_sent_total", {
    description: "Total emails sent",
  }),
  emailDuration: meterInstance.createHistogram("email_duration", {
    description: "Email send duration in milliseconds",
    unit: "ms",
  }),
  cacheHits: meterInstance.createCounter("cache_hits_total", {
    description: "Cache hits",
  }),
  cacheMisses: meterInstance.createCounter("cache_misses_total", {
    description: "Cache misses",
  }),
});

// Saturation / runtime gauges (dual-written to OTel)
let otelEventLoopLag: ReturnType<MeterProvider["getMeter"]>["createObservableGauge"] | null = null;
let otelGcDuration: ReturnType<MeterProvider["getMeter"]>["createObservableGauge"] | null = null;
let lastEventLoopLag = 0;
let lastGcDuration = 0;
let lastGcType = "";
let lastCpuPercent = 0;
let lastDiskReadOpsPerSec = 0;
let lastDiskWriteOpsPerSec = 0;

export let appMetrics: AppMetrics = createAppMetrics(
  meterProviderFallback.getMeter(serviceName, serviceVersion),
);

const currentTraceContext = () => {
  const span = trace.getSpan(context.active());

  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();

  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
};

const lokiEnabled = Boolean(env.GRAFANA_LOKI_URL && env.LOKI_INSTANCE_ID && grafanaApiToken);

type LokiPushEntry = {
  ts: string;
  line: string;
};

const lokiBuffer: LokiPushEntry[] = [];
let lokiFlushTimer: NodeJS.Timeout | null = null;
let lokiFlushing = false;

const getLokiLabels = () => ({
  service: serviceName,
  version: serviceVersion,
  env: environment,
});

const flushLokiBuffer = async () => {
  if (!lokiEnabled || lokiFlushing || lokiBuffer.length === 0) {
    return;
  }

  lokiFlushing = true;
  const batch = lokiBuffer.splice(0, lokiBuffer.length);

  try {
    const authHeader = Buffer.from(`${env.LOKI_INSTANCE_ID}:${grafanaApiToken}`).toString("base64");
    const response = await fetch(env.GRAFANA_LOKI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        streams: [
          {
            stream: getLokiLabels(),
            values: batch.map((entry) => [entry.ts, entry.line]),
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.error(
        { status: response.status, responseText: await response.text().catch(() => "") },
        "Loki push failed",
      );
    }
  } catch (error) {
    logger.error({ error }, "Loki push error");
  } finally {
    lokiFlushing = false;
  }
};

const queueLokiLine = (line: string) => {
  if (!lokiEnabled) {
    return;
  }

  lokiBuffer.push({
    ts: (BigInt(Date.now()) * 1_000_000n).toString(),
    line: line.trimEnd(),
  });

  if (lokiBuffer.length >= 20) {
    void flushLokiBuffer();
    return;
  }

  if (!lokiFlushTimer) {
    lokiFlushTimer = setTimeout(() => {
      lokiFlushTimer = null;
      void flushLokiBuffer();
    }, 5000);
  }
};

const lokiStream = {
  write(chunk: string | Buffer) {
    queueLokiLine(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    return true;
  },
};

const frontendLokiBuffer: LokiPushEntry[] = [];
let frontendLokiFlushTimer: NodeJS.Timeout | null = null;
let frontendLokiFlushing = false;

const flushFrontendLokiBuffer = async () => {
  if (!lokiEnabled || frontendLokiFlushing || frontendLokiBuffer.length === 0) return;
  frontendLokiFlushing = true;
  const batch = frontendLokiBuffer.splice(0, frontendLokiBuffer.length);
  try {
    const authHeader = Buffer.from(`${env.LOKI_INSTANCE_ID}:${grafanaApiToken}`).toString("base64");
    await fetch(env.GRAFANA_LOKI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        streams: [{
          stream: { ...getLokiLabels(), source: "frontend" },
          values: batch.map((e) => [e.ts, e.line]),
        }],
      }),
    });
  } catch {
    // Silent — avoid logger to prevent feedback loop
  } finally {
    frontendLokiFlushing = false;
  }
};

const queueFrontendLokiLine = (line: string) => {
  if (!lokiEnabled) return;
  frontendLokiBuffer.push({
    ts: (BigInt(Date.now()) * 1_000_000n).toString(),
    line: line.trimEnd(),
  });
  if (frontendLokiBuffer.length >= 20) {
    void flushFrontendLokiBuffer();
    return;
  }
  if (!frontendLokiFlushTimer) {
    frontendLokiFlushTimer = setTimeout(() => {
      frontendLokiFlushTimer = null;
      void flushFrontendLokiBuffer();
    }, 5000);
  }
};

export const trackEmailSent = (type: string, provider: string, status: "success" | "error", durationMs: number) => {
  promEmailSentTotal.labels(type, provider, status).inc();
  appMetrics.emailSentTotal.add(1, { type, provider, status });
  promEmailDurationSeconds.labels(type, provider).observe(durationMs / 1000);
  appMetrics.emailDuration.record(durationMs, { type, provider });
};

export const pushFrontendLog = (line: string) => {
  queueFrontendLokiLine(line);
};

const redactCommandArgs = (record: Record<string, unknown>) => {
  const command = record.command;

  if (command && typeof command === "object") {
    const commandRecord = { ...(command as Record<string, unknown>) };
    if (Array.isArray(commandRecord.args)) {
      commandRecord.args = `[redacted:${commandRecord.args.length}]`;
    }
    record.command = commandRecord;
  }

  return record;
};

const sanitizeErrorForLogs = (value: unknown) => {
  if (value instanceof Error) {
    const errorRecord: Record<string, unknown> = {
      type: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as unknown as Record<string, unknown>),
    };
    return redactCommandArgs(errorRecord);
  }

  if (value && typeof value === "object") {
    return redactCommandArgs({ ...(value as Record<string, unknown>) });
  }

  return value;
};

const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: {
    service: serviceName,
    version: serviceVersion,
    env: environment,
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin: currentTraceContext,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
    remove: true,
  },
  formatters: {
    level(label) {
      return {
        level: label,
        severity: label.toUpperCase(),
      };
    },
  },
  serializers: {
    error: sanitizeErrorForLogs,
    err: sanitizeErrorForLogs,
  },
};

const transport = pino.multistream([
  { stream: process.stdout },
  ...(lokiEnabled ? [{ stream: lokiStream }] : []),
]);

export const logger = pino(loggerOptions, transport);

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incomingRequestId = req.headers["x-request-id"];
    const requestId =
      typeof incomingRequestId === "string" && incomingRequestId.trim().length > 0
        ? incomingRequestId
        : crypto.randomUUID();

    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps: () => currentTraceContext(),
});

const resolveRouteLabel = (req: Request) => {
  if (req.route?.path) {
    return `${req.baseUrl || ""}${String(req.route.path)}`;
  }

  return "unmatched";
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!env.ENABLE_METRICS) {
    next();
    return;
  }

  const startNs = process.hrtime.bigint();
  appMetrics.activeConnections.add(1);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const labels = {
      method: req.method,
      route: resolveRouteLabel(req),
      status_code: String(res.statusCode),
    };

    promRequestCounter.inc(labels);
    promRequestDurationHistogram.observe(labels, durationMs / 1000);
    appMetrics.httpRequestsTotal.add(1, labels);
    appMetrics.httpRequestDuration.record(durationMs, labels);

    if (res.statusCode >= 400) {
      appMetrics.httpErrorsTotal.add(1, labels);
    }

    appMetrics.activeConnections.add(-1);

    const contentLength = req.headers["content-length"];
    if (contentLength) {
      const sizeLabels = { method: req.method, route: resolveRouteLabel(req) };
      const bytes = parseInt(contentLength, 10);
      if (!isNaN(bytes) && bytes > 0) {
        promRequestSizeHistogram.observe(sizeLabels, bytes);
        appMetrics.httpRequestSize.record(bytes, sizeLabels);
      }
    }
  });

  next();
};

const MAX_CLIENT_ERROR_BODY_BYTES = 8192;

export const clientErrorHandler = (req: Request, res: Response) => {
  const rawBody = req.body || {};

  if (typeof rawBody !== "object" || Buffer.byteLength(JSON.stringify(rawBody), "utf8") > MAX_CLIENT_ERROR_BODY_BYTES) {
    res.status(200).json({ ok: true });
    return;
  }

  const message = typeof rawBody.message === "string" ? rawBody.message.substring(0, 500) : "unknown";
  const source = typeof rawBody.source === "string" ? rawBody.source.substring(0, 100) : "unknown";
  const url = typeof rawBody.url === "string" ? rawBody.url.substring(0, 500) : undefined;
  const userAgent = typeof rawBody.userAgent === "string" ? rawBody.userAgent.substring(0, 300) : undefined;

  const labels = {
    source,
    error_type: message.substring(0, 100),
  };
  clientErrorCounter.labels(labels.source, labels.error_type).inc();

  logger.warn({ source, message, url, userAgent }, "Client-side error reported");
  res.status(200).json({ ok: true });
};

export const clientMetricsHandler = (req: Request, res: Response) => {
  const rawBody = req.body || {};

  if (typeof rawBody !== "object" || !Array.isArray(rawBody.metrics)) {
    res.status(200).json({ ok: true });
    return;
  }

  for (const m of rawBody.metrics) {
    const name = typeof m.name === "string" ? m.name.substring(0, 200) : "unknown";
    const value = typeof m.value === "number" ? m.value : 0;
    const unit = typeof m.unit === "string" ? m.unit.substring(0, 20) : "ms";
    const context = typeof m.context === "object" && m.context ? m.context : {};

    const labels = { name, unit };
    frontendMetricsCounter.labels(name, unit).inc();

    if (value > 0) {
      frontendMetricsHistogram.observe(labels, value);
    }
  }

  logger.info({ count: rawBody.metrics.length }, "Frontend metrics reported");
  res.status(200).json({ ok: true });
};

export const metricsHandler = async (_req: Request, res: Response) => {
  if (!env.ENABLE_METRICS) {
    res.status(404).json({ message: "Metrics are disabled" });
    return;
  }

  res.setHeader("Content-Type", metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
};

export const tracer = trace.getTracer(serviceName, serviceVersion);

export const initializeObservability = () => {
  if (initialized) {
    return;
  }

  initialized = true;

  if (env.ENABLE_METRICS && metricExportUrl && otlpAuthHeader) {
    const metricExporter = new OTLPMetricExporter({
      url: metricExportUrl,
      headers: {
        Authorization: `Basic ${otlpAuthHeader}`,
      },
    });

    meterProvider = new MeterProvider({
      resource: sharedResource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: env.OTEL_METRIC_EXPORT_INTERVAL_MS,
        }),
      ],
    });

    metrics.setGlobalMeterProvider(meterProvider);
    appMetrics = createAppMetrics(meterProvider.getMeter(serviceName, serviceVersion));
    logger.info({ metricExportUrl }, "OTLP metrics exporter enabled");
  } else if (env.ENABLE_METRICS) {
    metrics.setGlobalMeterProvider(meterProviderFallback);
    appMetrics = createAppMetrics(meterProviderFallback.getMeter(serviceName, serviceVersion));
    logger.warn("OTLP metrics exporter not configured. Metrics remain local (/metrics)");
  }

  // Initialize saturation / runtime gauges (event loop lag, GC)
  const runtimeMeter = meterProvider ?? meterProviderFallback;
  const rm = runtimeMeter.getMeter(serviceName, serviceVersion);
  rm.createObservableGauge("event_loop_lag_ms", {
    description: "Event loop lag in milliseconds",
  }).addCallback((result) => {
    result.observe(lastEventLoopLag);
  });
  rm.createObservableGauge("gc_duration_ms", {
    description: "Garbage collection duration in milliseconds",
  }).addCallback((result) => {
    if (lastGcDuration > 0) result.observe(lastGcDuration, { type: lastGcType });
  });
  rm.createObservableGauge("cpu_percent", {
    description: "Process CPU usage percentage (0-100 per core)",
  }).addCallback((result) => {
    result.observe(lastCpuPercent);
  });
  rm.createObservableGauge("disk_read_ops_per_second", {
    description: "Filesystem read operations per second",
  }).addCallback((result) => {
    result.observe(lastDiskReadOpsPerSec);
  });
  rm.createObservableGauge("disk_write_ops_per_second", {
    description: "Filesystem write operations per second",
  }).addCallback((result) => {
    result.observe(lastDiskWriteOpsPerSec);
  });
  rm.createObservableGauge("process_resident_memory_bytes", {
    description: "Resident memory size in bytes",
  }).addCallback((result) => {
    result.observe(process.memoryUsage().rss);
  });

  // Start event loop lag monitoring (measure every 2s)
  let expected = Date.now() + 2000;
  const measureLag = () => {
    const actual = Date.now();
    lastEventLoopLag = Math.max(0, actual - expected);
    eventLoopLagGauge.set(lastEventLoopLag);
    expected = actual + 2000;
    setTimeout(measureLag, 2000);
  };
  setTimeout(measureLag, 2000);

  // Start CPU usage monitoring (measure every 2s)
  let lastCpuUsage = process.cpuUsage();
  let lastCpuTime = Date.now();
  const measureCpu = () => {
    const now = Date.now();
    const cpu = process.cpuUsage();
    const wallMs = now - lastCpuTime;
    if (wallMs > 0) {
      const totalMicro = (cpu.user - lastCpuUsage.user) + (cpu.system - lastCpuUsage.system);
      lastCpuPercent = Math.min(100, Math.round((totalMicro / (wallMs * 1000)) * 100));
      cpuPercentGauge.set(lastCpuPercent);
    }
    lastCpuUsage = cpu;
    lastCpuTime = now;
    setTimeout(measureCpu, 2000);
  };
  setTimeout(measureCpu, 2000);

  // Start disk I/O monitoring (measure every 2s)
  let lastResourceUsage: { fsRead: number; fsWrite: number } = { fsRead: 0, fsWrite: 0 };
  let lastDiskTime = Date.now();
  try {
    lastResourceUsage = process.resourceUsage();
  } catch {
    // resourceUsage not available on older Node
  }
  const measureDisk = () => {
    const now = Date.now();
    try {
      const usage = process.resourceUsage();
      const wallMs = now - lastDiskTime;
      if (wallMs > 0) {
        lastDiskReadOpsPerSec = Math.round((usage.fsRead - lastResourceUsage.fsRead) / (wallMs / 1000));
        lastDiskWriteOpsPerSec = Math.round((usage.fsWrite - lastResourceUsage.fsWrite) / (wallMs / 1000));
        promDiskReadOpsRate.set(lastDiskReadOpsPerSec);
        promDiskWriteOpsRate.set(lastDiskWriteOpsPerSec);
      }
      lastResourceUsage = usage;
    } catch {
      // resourceUsage not available
    }
    lastDiskTime = now;
    setTimeout(measureDisk, 2000);
  };
  setTimeout(measureDisk, 2000);

  // GC monitoring via perf_hooks
  try {
    const { PerformanceObserver } = require("perf_hooks") as typeof import("perf_hooks");
    const gcObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const kind = (entry as any).detail?.kind ?? "unknown";
        lastGcDuration = entry.duration;
        lastGcType = kind;
        gcDurationGauge.labels(kind).set(entry.duration);
      }
    });
    gcObs.observe({ entryTypes: ["gc"] });
  } catch {
    // GC monitoring not available (Node < 14 or non-V8 engine)
  }

  if (traceExportUrl && otlpAuthHeader) {
    const traceExporter = new OTLPTraceExporter({
      url: traceExportUrl,
      headers: {
        Authorization: `Basic ${otlpAuthHeader}`,
      },
      timeoutMillis: 10000,
    });

    tracerProvider = new NodeTracerProvider({
      resource: sharedResource,
      spanProcessors: [new SimpleSpanProcessor(traceExporter)],
    });
    tracerProvider.register();

    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new MongoDBInstrumentation(),
      ],
    });

    logger.info({ traceExportUrl }, "OTLP tracing enabled");
  } else {
    tracerProvider = new NodeTracerProvider({ resource: sharedResource });
    tracerProvider.register();
    logger.warn(
      "OTLP tracing exporter not configured. Set GRAFANA_OTLP_ENDPOINT + OTEL_INSTANCE_ID (or OTLP_INSTANCE_ID) + GRAFANA_API_TOKEN.",
    );
  }

  logger.info(
    {
      lokiEnabled,
      lokiUrl: env.GRAFANA_LOKI_URL || undefined,
    },
    "Structured logging initialized",
  );
};

export const shutdownObservability = async () => {
  if (lokiFlushTimer) {
    clearTimeout(lokiFlushTimer);
    lokiFlushTimer = null;
  }

  if (frontendLokiFlushTimer) {
    clearTimeout(frontendLokiFlushTimer);
    frontendLokiFlushTimer = null;
  }

  await Promise.all([
    flushLokiBuffer(),
    flushFrontendLokiBuffer(),
    meterProvider?.shutdown(),
    tracerProvider?.shutdown(),
  ].filter(Boolean));
};

process.once("SIGTERM", () => {
  void shutdownObservability().finally(() => process.exit(0));
});

export { context, metrics, SpanStatusCode, trace };

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
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { env } from "./config/env";

const metricsRegistry = new Registry();

if (env.ENABLE_METRICS) {
  collectDefaultMetrics({
    register: metricsRegistry,
    prefix: "resume_builder_",
  });
}

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

const serviceName = env.SERVICE_NAME;
const serviceVersion = env.SERVICE_VERSION;
const environment = env.NODE_ENV;

const otlpEndpoint = env.GRAFANA_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_ENDPOINT;
const otlpInstanceId = env.OTLP_INSTANCE_ID || env.OPTL_INSTANCE_ID;
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
  httpErrorsTotal: { add: (value: number, attributes?: Record<string, string>) => void };
  activeConnections: { add: (value: number, attributes?: Record<string, string>) => void };
  dbQueryDuration: { record: (value: number, attributes?: Record<string, string>) => void };
  cacheHits: { add: (value: number, attributes?: Record<string, string>) => void };
  cacheMisses: { add: (value: number, attributes?: Record<string, string>) => void };
};

const createAppMetrics = (meterInstance: ReturnType<MeterProvider["getMeter"]>): AppMetrics => ({
  httpRequestsTotal: meterInstance.createCounter("http_requests_total", {
    description: "Total HTTP requests",
  }),
  httpRequestDuration: meterInstance.createHistogram("http_request_duration_ms", {
    description: "HTTP request duration in milliseconds",
    unit: "ms",
  }),
  httpErrorsTotal: meterInstance.createCounter("http_errors_total", {
    description: "Total HTTP errors",
  }),
  activeConnections: meterInstance.createUpDownCounter("active_connections", {
    description: "Active connections",
  }),
  dbQueryDuration: meterInstance.createHistogram("db_query_duration_ms", {
    description: "Database query duration in milliseconds",
    unit: "ms",
  }),
  cacheHits: meterInstance.createCounter("cache_hits_total", {
    description: "Cache hits",
  }),
  cacheMisses: meterInstance.createCounter("cache_misses_total", {
    description: "Cache misses",
  }),
});

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
  });

  next();
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
      "OTLP tracing exporter not configured. Set GRAFANA_OTLP_ENDPOINT + OTLP_INSTANCE_ID + GRAFANA_API_TOKEN.",
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

  await flushLokiBuffer();

  await Promise.all([
    meterProvider?.shutdown(),
    tracerProvider?.shutdown(),
  ]);
};

process.once("SIGTERM", () => {
  void shutdownObservability().finally(() => process.exit(0));
});

export { context, metrics, SpanStatusCode, trace };

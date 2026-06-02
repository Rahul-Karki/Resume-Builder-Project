import os from "os";
import { metricsRegistry } from "../observability";
import { env } from "../config/env";
import mongoose from "mongoose";
import { createClient } from "redis";

interface MetricsSnapshot {
  requestsPerMinute: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  activeConnections: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  cacheHitRatio: number;
  dbQueryTimeMs: number;
  totalUsers: number;
  totalResumes: number;
  activeSessions: number;
}

interface AIMetricsSnapshot {
  totalRequests: number;
  successRate: number;
  averageLatencyMs: number;
  totalTokens: number;
  estimatedCost: number;
  fallbackRate: number;
  providerLatency: Record<string, number>;
  failuresByType: Record<string, number>;
  recentErrors: { provider: string; errorCategory: string; count: number }[];
}

interface SystemHealth {
  redis: { status: "healthy" | "degraded" | "down"; latency: number; lastChecked: string; message?: string };
  mongodb: { status: "healthy" | "degraded" | "down"; latency: number; lastChecked: string; message?: string };
  api: { status: "healthy" | "degraded" | "down"; latency: number; lastChecked: string; message?: string };
  queue: { status: "healthy" | "degraded" | "down"; latency: number; lastChecked: string; message?: string };
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  authFailures: number;
  rateLimitHits: number;
  recentErrors: { timestamp: string; type: string; route: string; count: number }[];
}

function findMetricValue(metrics: any[], name: string, labels?: Record<string, string>): number | null {
  const metric = metrics.find((m: any) => m.name === name);
  if (!metric) return null;
  if (labels && metric.values) {
    const val = metric.values.find((v: any) =>
      Object.entries(labels).every(([k, v2]) => v.labels[k] === v2)
    );
    return val ? Number(val.value) : null;
  }
  if (metric.values && metric.values.length > 0) {
    return metric.values.reduce((sum: number, v: any) => sum + Number(v.value), 0);
  }
  return null;
}

function sumMetricValues(metrics: any[], name: string, filterLabels?: Record<string, string>): number {
  const metric = metrics.find((m: any) => m.name === name);
  if (!metric || !metric.values) return 0;
  return metric.values
    .filter((v: any) => {
      if (!filterLabels) return true;
      return Object.entries(filterLabels).every(([k, v2]) => v.labels[k] === v2);
    })
    .reduce((sum: number, v: any) => sum + Number(v.value), 0);
}

function getHistogramPercentile(metrics: any[], name: string, percentile: number): number | null {
  const metric = metrics.find((m: any) => m.name === name);
  if (!metric || !metric.values) return null;
  const leValues = metric.values
    .filter((v: any) => v.labels && v.labels.le !== undefined)
    .map((v: any) => ({ le: Number(v.labels.le), count: Number(v.value) }));
  leValues.sort((a: any, b: any) => a.le - b.le);
  const total = leValues.length > 0 ? leValues[leValues.length - 1].count : 0;
  if (total === 0) return null;
  const target = total * percentile;
  let cumulative = 0;
  for (const entry of leValues) {
    cumulative += entry.count;
    if (cumulative >= target) return entry.le * 1000;
  }
  return null;
}

export class ObservabilityService {
  static async getMetricsSnapshot(): Promise<MetricsSnapshot> {
    try {
      const allMetrics = await metricsRegistry.getMetricsAsJSON();
      const totalRequests = sumMetricValues(allMetrics, "resume_builder_http_requests_total");
      const errorCount = sumMetricValues(allMetrics, "resume_builder_http_requests_total", { status_code: "5" as any }) +
        sumMetricValues(allMetrics, "resume_builder_http_requests_total", { status_code: "4" as any });
      const currentMemory = process.memoryUsage();
      const memoryUsageMb = Math.round((currentMemory.heapUsed / 1024 / 1024) * 10) / 10;
      const cacheHits = sumMetricValues(allMetrics, "cache_hits_total");
      const cacheMisses = sumMetricValues(allMetrics, "cache_misses_total");
      const totalCache = cacheHits + cacheMisses;
      const cacheHitRatio = totalCache > 0 ? Math.round((cacheHits / totalCache) * 1000) / 10 : 0;
      const dbQueryMs = findMetricValue(allMetrics, "db_query_duration_ms");
      const p95 = getHistogramPercentile(allMetrics, "resume_builder_http_request_duration_seconds", 0.95);
      const p99 = getHistogramPercentile(allMetrics, "resume_builder_http_request_duration_seconds", 0.99);
      const avg = findMetricValue(allMetrics, "http_request_duration_ms");

      return {
        requestsPerMinute: totalRequests > 0 ? Math.round(totalRequests / 5) : 0,
        avgLatencyMs: avg !== null ? Math.round(avg * 10) / 10 : 0,
        p95LatencyMs: p95 !== null ? Math.round(p95 * 10) / 10 : 0,
        p99LatencyMs: p99 !== null ? Math.round(p99 * 10) / 10 : 0,
        errorRate: totalRequests > 0 ? Math.round((errorCount / totalRequests) * 1000) / 10 : 0,
        activeConnections: findMetricValue(allMetrics, "active_connections") ?? 0,
        memoryUsageMb,
        cpuUsagePercent: Math.min(100, Math.round(os.loadavg()[0] * 100 / os.cpus().length * 10) / 10),
        cacheHitRatio,
        dbQueryTimeMs: dbQueryMs !== null ? Math.round(dbQueryMs * 10) / 10 : 0,
        totalUsers: 0,
        totalResumes: 0,
        activeSessions: 0,
      };
    } catch {
      return {
        requestsPerMinute: 0, avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0,
        errorRate: 0, activeConnections: 0, memoryUsageMb: 0, cpuUsagePercent: 0,
        cacheHitRatio: 0, dbQueryTimeMs: 0, totalUsers: 0, totalResumes: 0, activeSessions: 0,
      };
    }
  }

  static async getAIMetrics(): Promise<AIMetricsSnapshot> {
    try {
      const allMetrics = await metricsRegistry.getMetricsAsJSON();
      const totalRequests = sumMetricValues(allMetrics, "resume_builder_ai_requests_total");
      const successCount = sumMetricValues(allMetrics, "resume_builder_ai_requests_total", { status: "success" as any });
      const errorCount = sumMetricValues(allMetrics, "resume_builder_ai_requests_total", { status: "error" as any });
      const malformedCount = sumMetricValues(allMetrics, "resume_builder_ai_requests_total", { status: "malformed" as any });
      const totalTokens = sumMetricValues(allMetrics, "resume_builder_ai_tokens_used_total");
      const providerLatencyMetric = allMetrics.find((m: any) => m.name === "resume_builder_ai_provider_latency_seconds");
      const providerLatency: Record<string, number> = {};
      if (providerLatencyMetric?.values) {
        for (const v of providerLatencyMetric.values) {
          const provider = String(v.labels?.provider ?? "");
          if (provider) {
            providerLatency[provider] = Math.round(Number(v.value) * 1000 * 10) / 10;
          }
        }
      }
      const failuresByType: Record<string, number> = {};
      const providerErrors = allMetrics.find((m: any) => m.name === "resume_builder_ai_provider_errors_total");
      if (providerErrors?.values) {
        for (const v of providerErrors.values) {
          const key = String(v.labels?.error_category || v.labels?.provider || "unknown");
          failuresByType[key] = (failuresByType[key] || 0) + Number(v.value);
        }
      }
      const recentErrors: { provider: string; errorCategory: string; count: number }[] = [];
      if (providerErrors?.values) {
        for (const v of providerErrors.values) {
          recentErrors.push({
            provider: String(v.labels?.provider || "unknown"),
            errorCategory: String(v.labels?.error_category || "unknown"),
            count: Number(v.value),
          });
        }
      }
      const costPer1kTokens = 0.002;
      const estimatedCost = Math.round(totalTokens * costPer1kTokens * 100) / 100;

      return {
        totalRequests,
        successRate: totalRequests > 0 ? Math.round((successCount / totalRequests) * 1000) / 10 : 100,
        averageLatencyMs: 0,
        totalTokens,
        estimatedCost,
        fallbackRate: 0,
        providerLatency,
        failuresByType,
        recentErrors,
      };
    } catch {
      return {
        totalRequests: 0, successRate: 100, averageLatencyMs: 0, totalTokens: 0,
        estimatedCost: 0, fallbackRate: 0, providerLatency: {}, failuresByType: {},
        recentErrors: [],
      };
    }
  }

  static async getSystemHealth(): Promise<SystemHealth> {
    const redisStart = Date.now();
    let redisStatus: SystemHealth["redis"] = { status: "down", latency: 0, lastChecked: new Date().toISOString(), message: "Not configured" };
    try {
      if (env.REDIS_URL) {
        const redisClient = createClient({ url: env.REDIS_URL, socket: { connectTimeout: 3000 } });
        await redisClient.connect();
        await redisClient.ping();
        redisStatus = { status: "healthy", latency: Date.now() - redisStart, lastChecked: new Date().toISOString() };
        await redisClient.quit();
      }
    } catch (e: any) {
      redisStatus = { status: "degraded", latency: Date.now() - redisStart, lastChecked: new Date().toISOString(), message: e?.message || "Redis error" };
    }

    const dbStart = Date.now();
    let dbStatus: SystemHealth["mongodb"] = { status: "down", latency: 0, lastChecked: new Date().toISOString(), message: "Not connected" };
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db?.admin().ping();
        dbStatus = { status: "healthy", latency: Date.now() - dbStart, lastChecked: new Date().toISOString() };
      } else {
        dbStatus = { status: "degraded", latency: 0, lastChecked: new Date().toISOString(), message: `Connection state: ${mongoose.connection.readyState}` };
      }
    } catch (e: any) {
      dbStatus = { status: "degraded", latency: Date.now() - dbStart, lastChecked: new Date().toISOString(), message: e?.message || "DB ping failed" };
    }

    const apiStatus: SystemHealth["api"] = { status: "healthy", latency: 0, lastChecked: new Date().toISOString() };

    return {
      redis: redisStatus,
      mongodb: dbStatus,
      api: apiStatus,
      queue: { status: "healthy", latency: 0, lastChecked: new Date().toISOString() },
    };
  }

  static async getErrorMetrics(): Promise<ErrorMetrics> {
    try {
      const allMetrics = await metricsRegistry.getMetricsAsJSON();
      const totalErrors = sumMetricValues(allMetrics, "resume_builder_http_requests_total", { status_code: "5" as any });
      const authFailures = sumMetricValues(allMetrics, "resume_builder_http_requests_total", { status_code: "401" as any }) +
        sumMetricValues(allMetrics, "resume_builder_http_requests_total", { status_code: "403" as any });
      const errorsByType: Record<string, number> = {};
      const httpMetric = allMetrics.find((m: any) => m.name === "resume_builder_http_requests_total");
      if (httpMetric?.values) {
        for (const v of httpMetric.values) {
          const sc = String(v.labels?.status_code ?? "");
          if (sc && parseInt(sc) >= 400) {
            const route = String(v.labels?.route || "unknown");
            errorsByType[route] = (errorsByType[route] || 0) + Number(v.value);
          }
        }
      }
      return {
        totalErrors,
        errorsByType,
        authFailures,
        rateLimitHits: 0,
        recentErrors: [],
      };
    } catch {
      return { totalErrors: 0, errorsByType: {}, authFailures: 0, rateLimitHits: 0, recentErrors: [] };
    }
  }
}

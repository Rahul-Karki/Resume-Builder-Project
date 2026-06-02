import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ObservabilityOverview, SystemHealth, AIMetricsSnapshot, ErrorMetrics } from "@/types/admin.types";

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string };

export function useObservabilityOverview() {
  return useQuery({
    queryKey: ["admin", "observability", "overview"],
    queryFn: async (): Promise<ObservabilityOverview> => {
      const res = await api.get<ApiEnvelope<ObservabilityOverview>>("/admin/observability/overview");
      return res.data.data ?? {
        metrics: {
          requestsPerMinute: 0, avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0,
          errorRate: 0, activeConnections: 0, memoryUsageMb: 0, cpuUsagePercent: 0,
          cacheHitRatio: 0, dbQueryTimeMs: 0, totalUsers: 0, totalResumes: 0, activeSessions: 0,
        },
        aiMetrics: {
          totalRequests: 0, successRate: 100, averageLatencyMs: 0, totalTokens: 0,
          estimatedCost: 0, fallbackRate: 0, providerLatency: {}, failuresByType: {},
          recentErrors: [],
        },
        systemHealth: {
          redis: { status: "down", latency: 0, lastChecked: "", message: "Not available" },
          mongodb: { status: "down", latency: 0, lastChecked: "", message: "Not available" },
          api: { status: "healthy", latency: 0, lastChecked: "" },
          queue: { status: "healthy", latency: 0, lastChecked: "" },
        },
        errorMetrics: { totalErrors: 0, errorsByType: {}, authFailures: 0, rateLimitHits: 0, recentErrors: [] },
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["admin", "observability", "system"],
    queryFn: async (): Promise<SystemHealth> => {
      const res = await api.get<ApiEnvelope<SystemHealth>>("/admin/observability/system");
      return res.data.data ?? {};
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
  });
}

export function useAIMetrics() {
  return useQuery({
    queryKey: ["admin", "observability", "ai"],
    queryFn: async (): Promise<AIMetricsSnapshot> => {
      const res = await api.get<ApiEnvelope<AIMetricsSnapshot>>("/admin/observability/ai");
      return res.data.data ?? {};
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}

export function useErrorMetrics() {
  return useQuery({
    queryKey: ["admin", "observability", "errors"],
    queryFn: async (): Promise<ErrorMetrics> => {
      const res = await api.get<ApiEnvelope<ErrorMetrics>>("/admin/observability/errors");
      return res.data.data ?? {};
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}

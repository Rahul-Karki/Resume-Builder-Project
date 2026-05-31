import { useState, useEffect, useCallback } from "react";
import { DashboardStats, TemplateAnalytics } from "@/types/admin.types";
import { api } from "@/services/api";
import { BACKEND_WAKING_UP_MESSAGE, getFriendlyApiErrorMessage } from "@/utils/backendStatus";

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const getErrorMessage = (error: unknown) => getFriendlyApiErrorMessage(error, BACKEND_WAKING_UP_MESSAGE);

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalytics(period: 7 | 30 = 30) {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<TemplateAnalytics[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [dashboardRes, analyticsRes] = await Promise.all([
        api.get<ApiEnvelope<DashboardStats>>("/admin/analytics/dashboard"),
        api.get<ApiEnvelope<TemplateAnalytics[]>>(`/admin/analytics/templates?days=${period}`),
      ]);

      const dashboardStats = dashboardRes.data.data ?? {
        totalUsers: 0,
        totalTemplates: 0,
        publishedTemplates: 0,
        draftTemplates: 0,
        premiumTemplates: 0,
        totalUsesThisWeek: 0,
        totalUsesThisMonth: 0,
        mostUsed: null,
        leastUsed: null,
      };
      const analyticsData = analyticsRes.data.data ?? [];
      const publishedAnalytics = analyticsData.filter((item) => item.status === "published");

      setStats({
        ...dashboardStats,
        mostUsed: dashboardStats?.mostUsed ?? publishedAnalytics[0] ?? null,
        leastUsed: dashboardStats?.leastUsed ?? (publishedAnalytics.length > 0 ? publishedAnalytics[publishedAnalytics.length - 1] : null),
      });
      setAnalytics(analyticsData);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, analytics, loading, error, refetch: fetch };
}
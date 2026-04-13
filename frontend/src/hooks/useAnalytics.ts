import { useState, useEffect, useCallback } from "react";
import { AdminTemplate, DashboardStats, TemplateAnalytics } from "../types/admin.types";
import { api } from "@/services/api";

type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const getErrorMessage = (error: unknown) => {
  const e = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return e.response?.data?.error ?? e.response?.data?.message ?? e.message ?? "Failed to load analytics";
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalytics(period: 7 | 30 = 30) {
  const [stats,     setStats]     = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<TemplateAnalytics[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [templatesRes, analyticsRes] = await Promise.all([
        api.get<ApiEnvelope<AdminTemplate[]>>("/admin/templates"),
        api.get<ApiEnvelope<TemplateAnalytics[]>>(`/admin/analytics/templates?days=${period}`),
      ]);

      const templates = templatesRes.data.data ?? [];
      const analyticsData = analyticsRes.data.data ?? [];
      const publishedAnalytics = analyticsData.filter((item) => item.status === "published");

      const computedStats: DashboardStats = {
        totalTemplates: templates.length,
        publishedTemplates: templates.filter((item) => item.status === "published").length,
        draftTemplates: templates.filter((item) => item.status === "draft").length,
        premiumTemplates: templates.filter((item) => item.isPremium).length,
        totalUsesThisWeek: analyticsData.reduce((sum, item) => sum + (item.weeklyUses || 0), 0),
        totalUsesThisMonth: analyticsData.reduce((sum, item) => sum + (item.monthlyUses || 0), 0),
        mostUsed: publishedAnalytics[0] ?? null,
        leastUsed: publishedAnalytics.length > 0 ? publishedAnalytics[publishedAnalytics.length - 1] : null,
      };

      setStats(computedStats);
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
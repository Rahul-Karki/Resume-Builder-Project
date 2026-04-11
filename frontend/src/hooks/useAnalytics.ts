import { useState, useEffect, useCallback } from "react";
import { DashboardStats, TemplateAnalytics } from "../types/admin.types";
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
      const [statsRes, analyticsRes] = await Promise.all([
        api.get<ApiEnvelope<DashboardStats>>("/admin/analytics/dashboard"),
        api.get<ApiEnvelope<TemplateAnalytics[]>>(`/admin/analytics/templates?days=${period}`),
      ]);

      setStats(statsRes.data.data ?? null);
      setAnalytics(analyticsRes.data.data ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, analytics, loading, error, refetch: fetch };
}
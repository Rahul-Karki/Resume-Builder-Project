import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AdminTemplate, DashboardStats, TemplateAnalytics } from "@/types/admin.types";

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string };

const getErrorMessage = (error: unknown) => {
  const e = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return e.response?.data?.error ?? e.response?.data?.message ?? e.message ?? "Failed to load data";
};

export function useDashboardStats(period: 7 | 30) {
  return useQuery({
    queryKey: ["admin", "dashboard-stats", period],
    queryFn: async (): Promise<{ stats: DashboardStats; analytics: TemplateAnalytics[] }> => {
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

      return { stats: computedStats, analytics: analyticsData };
    },
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
    retry: 2,
  });
}

export function useAdminTemplatesQuery() {
  return useQuery({
    queryKey: ["admin", "templates"],
    queryFn: async (): Promise<AdminTemplate[]> => {
      const res = await api.get<ApiEnvelope<AdminTemplate[]>>("/admin/templates");
      return res.data.data ?? [];
    },
    staleTime: 120 * 1000,
    retry: 2,
  });
}



import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AdminTemplate, DashboardStats, TemplateAnalytics } from "@/types/admin.types";
import { BACKEND_WAKING_UP_MESSAGE, getFriendlyApiErrorMessage } from "@/utils/backendStatus";

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string };

const getErrorMessage = (error: unknown) => getFriendlyApiErrorMessage(error, BACKEND_WAKING_UP_MESSAGE);

export function useDashboardStats(period: 7 | 30) {
  return useQuery({
    queryKey: ["admin", "dashboard-stats", period],
    queryFn: async (): Promise<{ stats: DashboardStats; analytics: TemplateAnalytics[] }> => {
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
          userSignups: [],
        };
        const analyticsData = analyticsRes.data.data ?? [];
        const publishedAnalytics = analyticsData.filter((item) => item.status === "published");

        return {
          stats: {
            ...dashboardStats,
            mostUsed: dashboardStats.mostUsed ?? publishedAnalytics[0] ?? null,
            leastUsed: dashboardStats.leastUsed ?? (publishedAnalytics.length > 0 ? publishedAnalytics[publishedAnalytics.length - 1] : null),
          },
          analytics: analyticsData,
        };
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
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



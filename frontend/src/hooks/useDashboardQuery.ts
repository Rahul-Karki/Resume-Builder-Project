import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AdminTemplate, DashboardStats, TemplateAnalytics } from "@/types/admin.types";
import { BACKEND_WAKING_UP_MESSAGE, getFriendlyApiErrorMessage } from "@/utils/backendStatus";
import { demoDashboardAnalytics, demoDashboardStats } from "@/utils/adminDashboardFallback";

type ApiEnvelope<T> = { ok: boolean; data: T; error?: string };

const getErrorMessage = (error: unknown) => getFriendlyApiErrorMessage(error, BACKEND_WAKING_UP_MESSAGE);

const EMPTY_STATS: DashboardStats = {
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

export function useDashboardStats(period: 7 | 30) {
  return useQuery({
    queryKey: ["admin", "dashboard-stats", period],
    queryFn: async (): Promise<{ stats: DashboardStats; analytics: TemplateAnalytics[]; isDemoData: boolean }> => {
      try {
        const [dashboardRes, analyticsRes] = await Promise.all([
          api.get<ApiEnvelope<DashboardStats>>("/admin/analytics/dashboard"),
          api.get<ApiEnvelope<TemplateAnalytics[]>>(`/admin/analytics/templates?days=${period}`),
        ]);

        const dashboardStats = dashboardRes.data.data ?? EMPTY_STATS;
        const analyticsData = analyticsRes.data.data ?? [];
        const publishedAnalytics = analyticsData.filter((item) => item.status === "published");
        const hasLiveData =
          dashboardStats.totalUsers > 0 ||
          dashboardStats.totalTemplates > 0 ||
          analyticsData.length > 0;

        if (!hasLiveData) {
          return {
            stats: demoDashboardStats,
            analytics: demoDashboardAnalytics,
            isDemoData: true,
          };
        }

        return {
          stats: {
            ...dashboardStats,
            mostUsed: dashboardStats.mostUsed ?? publishedAnalytics[0] ?? null,
            leastUsed: dashboardStats.leastUsed ?? (publishedAnalytics.length > 0 ? publishedAnalytics[publishedAnalytics.length - 1] : null),
          },
          analytics: analyticsData.length > 0 ? analyticsData : demoDashboardAnalytics,
          isDemoData: analyticsData.length === 0 || dashboardStats.totalUsers === 0,
        };
      } catch {
        return {
          stats: demoDashboardStats,
          analytics: demoDashboardAnalytics,
          isDemoData: true,
        };
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



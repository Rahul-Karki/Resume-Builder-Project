import { useState, useEffect, useCallback } from "react";
import { DashboardStats, TemplateAnalytics } from "../types/admin.types";

const API = "/api/admin";
const getToken = () => localStorage.getItem("adminToken") ?? "";
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

// ─── Mock analytics data generator ────────────────────────────────────────────

function mockDaily(days: number, base: number, variance: number) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const count = Math.max(0, Math.round(base + (Math.random() - 0.5) * variance));
    result.push({
      date:           d.toISOString().slice(0, 10),
      count,
      resumesCreated: Math.round(count * 0.7),
      resumesEdited:  Math.round(count * 0.3),
    });
  }
  return result;
}

const MOCK_ANALYTICS: TemplateAnalytics[] = [
  { templateId:"t3", layoutId:"modern",    name:"Modern",    status:"published", totalUses:6140, weeklyUses:420, monthlyUses:1820, trend:"up",     daily:mockDaily(30, 61, 40) },
  { templateId:"t1", layoutId:"classic",   name:"Classic",   status:"published", totalUses:4820, weeklyUses:310, monthlyUses:1340, trend:"stable", daily:mockDaily(30, 45, 30) },
  { templateId:"t2", layoutId:"executive", name:"Executive", status:"published", totalUses:3210, weeklyUses:195, monthlyUses:870,  trend:"up",     daily:mockDaily(30, 29, 20) },
  { templateId:"t4", layoutId:"compact",   name:"Compact",   status:"published", totalUses:2890, weeklyUses:180, monthlyUses:790,  trend:"stable", daily:mockDaily(30, 26, 18) },
  { templateId:"t5", layoutId:"sidebar",   name:"Sidebar",   status:"published", totalUses:1950, weeklyUses:98,  monthlyUses:430,  trend:"down",   daily:mockDaily(30, 14, 12) },
  { templateId:"t6", layoutId:"minimal",   name:"Minimal",   status:"draft",     totalUses:0,    weeklyUses:0,   monthlyUses:0,    trend:"stable", daily:mockDaily(30, 0, 0)   },
];

const MOCK_STATS: DashboardStats = {
  totalTemplates:     6,
  publishedTemplates: 5,
  draftTemplates:     1,
  premiumTemplates:   2,
  totalUsesThisWeek:  1203,
  totalUsesThisMonth: 5250,
  mostUsed:  MOCK_ANALYTICS[0],
  leastUsed: MOCK_ANALYTICS[4],
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
      // Real API calls:
      // const [statsData, analyticsData] = await Promise.all([
      //   fetch(`${API}/analytics/dashboard`, { headers: headers() }).then(r => r.json()),
      //   fetch(`${API}/analytics/templates?days=${period}`, { headers: headers() }).then(r => r.json()),
      // ]);
      await new Promise(r => setTimeout(r, 800));
      // Filter mock data to the selected period
      const sliced = MOCK_ANALYTICS.map(a => ({
        ...a,
        daily: a.daily.slice(-period),
        weeklyUses:  period === 7 ? a.weeklyUses : a.weeklyUses,
        monthlyUses: period === 7 ? a.weeklyUses : a.monthlyUses,
      }));
      setStats(MOCK_STATS);
      setAnalytics(sliced);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, analytics, loading, error, refetch: fetch };
}
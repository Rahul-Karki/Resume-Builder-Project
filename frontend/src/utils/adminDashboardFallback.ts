import type { DashboardStats, DailyUsage, TemplateAnalytics } from "@/types/admin.types";

const buildDailySeries = (seed: number): DailyUsage[] => {
  const today = new Date();
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const count = Math.max(0, Math.round((Math.sin((index + seed) / 3) + 1.3) * (seed + 2)));

    return {
      date: date.toISOString().slice(0, 10),
      count,
      resumesCreated: Math.max(0, Math.round(count * 0.6)),
      resumesEdited: Math.max(0, Math.round(count * 0.4)),
    };
  });
};

const demoAnalytics: TemplateAnalytics[] = [
  {
    templateId: "classic",
    layoutId: "classic",
    name: "Classic",
    status: "published",
    totalUses: 126,
    weeklyUses: 18,
    monthlyUses: 126,
    daily: buildDailySeries(3),
    trend: "up",
  },
  {
    templateId: "executive",
    layoutId: "executive",
    name: "Executive",
    status: "published",
    totalUses: 88,
    weeklyUses: 11,
    monthlyUses: 88,
    daily: buildDailySeries(2),
    trend: "stable",
  },
  {
    templateId: "modern",
    layoutId: "modern",
    name: "Modern",
    status: "published",
    totalUses: 54,
    weeklyUses: 7,
    monthlyUses: 54,
    daily: buildDailySeries(1),
    trend: "down",
  },
];

export const demoDashboardStats: DashboardStats = {
  totalUsers: 248,
  totalTemplates: 12,
  publishedTemplates: 10,
  draftTemplates: 2,
  premiumTemplates: 3,
  totalUsesThisWeek: demoAnalytics.reduce((sum, item) => sum + item.weeklyUses, 0),
  totalUsesThisMonth: demoAnalytics.reduce((sum, item) => sum + item.monthlyUses, 0),
  mostUsed: demoAnalytics[0],
  leastUsed: demoAnalytics[2],
};

export const demoDashboardAnalytics = demoAnalytics;

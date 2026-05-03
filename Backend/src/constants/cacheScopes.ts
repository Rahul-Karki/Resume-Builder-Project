export const CACHE_VERSION = 1 as const;

export const CACHE_SCOPE_NAMES = {
  publicTemplates: "public-templates",
  adminTemplates: "admin-templates",
  adminDashboard: "admin-dashboard",
  adminAnalytics: "admin-analytics",
  adminTemplatesItem: "admin-templates-item",
  resumesUser: "resumes-user",
} as const;

export type CacheScopeName = typeof CACHE_SCOPE_NAMES[keyof typeof CACHE_SCOPE_NAMES];

export const buildCacheScope = (scope: string) => `v${CACHE_VERSION}:${scope}`;

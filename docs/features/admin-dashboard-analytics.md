---
# Feature: Admin Dashboard & Analytics
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides administrators with a centralized dashboard showing platform usage metrics, user growth, resume creation trends, and template performance analytics.

## User Stories
- As an admin, I want to see total users, resumes, and AI usage so that I can monitor platform growth.
- As an admin, I want to see per-template usage statistics so that I know which templates are most popular.
- As an admin, I want to apply date range filters so that I can analyze trends over specific periods.

## Scope
### In scope
- Dashboard statistics: total users, total resumes, AI requests, storage used
- Template analytics: per-template usage counts, creation trends
- Daily usage aggregation for templates
- Redis caching for dashboard data (120s) and analytics (300s)
- Admin audit logging for all analytics access
- Date range filtering via query parameter

### Out of scope
- Real-time analytics (cached, up to 5 minutes stale)
- User-level granularity in analytics
- Export to CSV (available in audit feature only)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/templateController.ts | getDashboardStats, getAnalytics |
| Backend/src/router/admin.routes.ts | Dashboard routes with adminGuard, cache, audit |
| Backend/src/middleware/redisCache.ts | Caching with admin-specific TTLs |
| Backend/src/middleware/adminAudit.ts | Logs all analytics access |
| Backend/src/models/TemplateUsage.ts | Daily per-template usage counts |
| Backend/src/models/User.ts | User count aggregation |
| Backend/src/models/Resume.ts | Resume count aggregation |
| Backend/src/models/AiUsage.ts | AI usage aggregation |
| frontend/src/pages/AdminDashboard.tsx | Dashboard page component |
| frontend/src/hooks/useAnalytics.ts | Analytics data fetching with period filtering |

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /api/admin/analytics/dashboard | Admin | Aggregated platform stats (cached 120s) |
| GET | /api/admin/analytics/templates?days=7 | Admin | Per-template usage analytics (cached 300s) |

## Edge Cases & Error Handling
- If there is no data for the selected period, the system returns zero values for all metrics (no error).
- If the days parameter is invalid, the system defaults to 7 days.
- On a cache miss, the system aggregates from the database, caches the result, and returns it.

## Tests
- Unit: __tests__/templateController.test.ts, __tests__/utils/businessMetrics.test.ts, __tests__/models/templateUsage.test.ts
- Integration: __tests__/integration/admin.test.ts

## Open Questions
- None.

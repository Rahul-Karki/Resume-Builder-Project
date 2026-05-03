import { Router } from "express";
import { adminGuard, authenticate } from "../middleware/adminAuthMiddleware";
import { env } from "../config/env";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  setTemplateStatus,
  togglePremium,
  deleteTemplate,
  reorderTemplates,
  getDashboardStats,
  getAnalytics,
  recordUsage,
} from "../controllers/templateController";
import { validateRequest } from "../middleware/validateRequest";
import {
  analyticsQuerySchema,
  createTemplateSchema,
  emptyObjectSchema,
  objectIdParamSchema,
  reorderTemplatesSchema,
  setTemplateStatusSchema,
  templateListQuerySchema,
  updateTemplateSchema,
  usageSchema,
} from "../validation/schemas";
import { createRedisCacheMiddleware } from "../middleware/redisCache";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import { adminAuditMiddleware } from "../middleware/adminAudit";

const router = Router();

const dashboardCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 120);
const analyticsCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 300);
const templateListCacheTtlSeconds = Math.min(env.REDIS_CACHE_TTL_SECONDS, 180);

const adminCache = (scope: string) => createRedisCacheMiddleware({
  scope,
  ttlSeconds: scope === "admin-dashboard"
    ? dashboardCacheTtlSeconds
    : scope === "admin-analytics"
      ? analyticsCacheTtlSeconds
      : templateListCacheTtlSeconds,
});

const adminWriteLimiter = createRedisRateLimitMiddleware({
  scope: "admin-template-usage",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(20, Math.floor(env.REDIS_RATE_LIMIT_MAX / 2)),
  keyBuilder: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: "Too many template usage requests. Please try again later.",
});

const adminTemplateMutationLimiter = createRedisRateLimitMiddleware({
  scope: "admin-template-mutations",
  windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
  max: Math.max(10, Math.floor(env.REDIS_RATE_LIMIT_MAX / 2)),
  keyBuilder: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
  message: "Too many template changes. Please try again later.",
});

// ─── All /admin routes require adminGuard ─────────────────────────────────────

router.use("/analytics", ...adminGuard, adminAuditMiddleware("analytics"));
router.use("/templates", ...adminGuard, adminAuditMiddleware("templates"));

// Dashboard analytics
router.get("/analytics/dashboard", adminCache("admin-dashboard"), getDashboardStats);
router.get("/analytics/templates", adminCache("admin-analytics"), getAnalytics);

// Template CRUD
router.get("/templates", validateRequest({ query: templateListQuerySchema }), adminCache("admin-templates"), listTemplates);
router.get("/templates/:id", validateRequest({ params: objectIdParamSchema }), adminCache("admin-templates-item"), getTemplate);
router.post("/templates", validateRequest({ body: createTemplateSchema }), adminTemplateMutationLimiter, createTemplate);
router.put("/templates/reorder", validateRequest({ body: reorderTemplatesSchema }), adminTemplateMutationLimiter, reorderTemplates);   // before :id route
router.put("/templates/:id", validateRequest({ params: objectIdParamSchema, body: updateTemplateSchema }), adminTemplateMutationLimiter, updateTemplate);
router.patch("/templates/:id/status", validateRequest({ params: objectIdParamSchema, body: setTemplateStatusSchema }), adminTemplateMutationLimiter, setTemplateStatus);
router.patch("/templates/:id/premium", validateRequest({ params: objectIdParamSchema }), adminTemplateMutationLimiter, togglePremium);
router.delete("/templates/:id", validateRequest({ params: objectIdParamSchema }), adminTemplateMutationLimiter, deleteTemplate);

// ─── Public route: record template usage (called from resume builder) ─────────
// Uses authenticate (not adminGuard) — any logged-in user can record usage

router.post("/usage", validateRequest({ body: usageSchema }), authenticate, adminWriteLimiter, recordUsage);

export default router;

/*
  Mount in your main Express app (app.ts / server.ts):

    import adminRoutes from "./routes/admin.routes";
    app.use("/api/admin", adminRoutes);
    // Public usage tracking:
    app.post("/api/resumes/usage", authenticate, recordUsage);

  Full route map:
    GET    /api/admin/analytics/dashboard
    GET    /api/admin/analytics/templates?days=7
    GET    /api/admin/templates
    GET    /api/admin/templates/:id
    POST   /api/admin/templates
    PUT    /api/admin/templates/reorder
    PUT    /api/admin/templates/:id
    PATCH  /api/admin/templates/:id/status
    PATCH  /api/admin/templates/:id/premium
    DELETE /api/admin/templates/:id
    POST   /api/resumes/usage
*/
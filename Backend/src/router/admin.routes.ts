import { Router } from "express";
import { adminGuard, authenticate } from "../middleware/adminAuthMiddleware";
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

const router = Router();

// ─── All /admin routes require adminGuard ─────────────────────────────────────

// Dashboard analytics
router.get("/analytics/dashboard", adminGuard, getDashboardStats);
router.get("/analytics/templates", adminGuard, getAnalytics);

// Template CRUD
router.get("/templates", adminGuard, listTemplates);
router.get("/templates/:id", adminGuard, getTemplate);
router.post("/templates", validateRequest({ body: createTemplateSchema }), adminGuard, createTemplate);
router.put("/templates/reorder", validateRequest({ body: reorderTemplatesSchema }), adminGuard, reorderTemplates);   // before :id route
router.put("/templates/:id", validateRequest({ body: updateTemplateSchema }), adminGuard, updateTemplate);
router.patch("/templates/:id/status", validateRequest({ body: setTemplateStatusSchema }), adminGuard, setTemplateStatus);
router.patch("/templates/:id/premium", adminGuard, togglePremium);
router.delete("/templates/:id", adminGuard, deleteTemplate);

// ─── Public route: record template usage (called from resume builder) ─────────
// Uses authenticate (not adminGuard) — any logged-in user can record usage

router.post("/usage", validateRequest({ body: usageSchema }), authenticate, recordUsage);

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
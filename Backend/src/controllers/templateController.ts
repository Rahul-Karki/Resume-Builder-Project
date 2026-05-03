import { Request, Response } from "express";
import { TemplateService, CreateTemplateDto, UpdateTemplateDto } from "../services/templateService";
import TemplateUsage from "../models/TemplateUsage";
import Template from "../models/Template";
import { logger } from "../observability";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { invalidateRedisCache, redisCacheScopes } from "../middleware/redisCache";
import { AppError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
// ─── Helper: consistent response shape ────────────────────────────────────────

const ok   = (res: Response, data: unknown, status = 200) => res.status(status).json({ ok: true,  data });
const fail = (res: Response, msg: string,   status = 400) => res.status(status).json({ ok: false, error: msg });

const invalidateTemplateCaches = async () => {
  await invalidateRedisCache([
    redisCacheScopes.publicTemplates,
    redisCacheScopes.adminTemplates,
    redisCacheScopes.adminDashboard,
    redisCacheScopes.adminAnalytics,
    redisCacheScopes.adminTemplatesItem,
  ]);
};

const invalidateTemplateAnalyticsCaches = async () => {
  await invalidateRedisCache([
    redisCacheScopes.adminDashboard,
    redisCacheScopes.adminAnalytics,
  ]);
};

// ─── GET /admin/templates ─────────────────────────────────────────────────────
// Query params: ?status=published&category=tech

export async function listTemplates(req: Request, res: Response) {
  const span = startControllerSpan("template.listTemplates", req);
  try {
    const { status, category, audience } = req.query as Record<string, string>;
    const templates = await TemplateService.getAll({ status, category, audience });
    logger.info({ status, category, audience, count: templates.length }, "Templates listed");
    markSpanSuccess(span);
    return ok(res, templates);
  } catch (err: any) {
    markSpanError(span, err as Error, "List templates failed");
    logger.error({ error: err }, "List templates failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── GET /templates (public) ─────────────────────────────────────────────────

export async function listPublicTemplates(req: Request, res: Response) {
  const span = startControllerSpan("template.listPublicTemplates", req);
  try {
    const { category, audience } = req.query as Record<string, string>;
    const templates = await TemplateService.getAll({ status: "published", category, audience });
    logger.info({ category, audience, count: templates.length }, "Public templates listed");
    markSpanSuccess(span);
    return ok(res, templates);
  } catch (err: any) {
    markSpanError(span, err as Error, "List public templates failed");
    logger.error({ error: err }, "List public templates failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── GET /admin/templates/:id ─────────────────────────────────────────────────

export async function getTemplate(req: Request, res: Response) {
  const span = startControllerSpan("template.getTemplate", req);
  try {
    const tpl = await TemplateService.getById(String(req.params.id));
    if (tpl) {
      logger.info({ templateId: String(req.params.id) }, "Template fetched");
      markSpanSuccess(span);
    }
    if (!tpl) return fail(res, "Template not found.", 404);
    return ok(res, tpl);
  } catch (err: any) {
    markSpanError(span, err as Error, "Get template failed");
    logger.error({ error: err, templateId: String(req.params.id) }, "Get template failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── POST /admin/templates ────────────────────────────────────────────────────

export async function createTemplate(req: Request, res: Response) {
  const span = startControllerSpan("template.createTemplate", req);
  try {
    const dto: CreateTemplateDto = {
      layoutId:    req.body.layoutId,
      name:        req.body.name,
      description: req.body.description ?? "",
      category:    req.body.category    ?? req.body.audience ?? "non-tech",
      audience:    req.body.audience    ?? req.body.category ?? "non-tech",
      tag:         req.body.tag         ?? "General",
      tags:        req.body.tags        ?? (req.body.tag ? [req.body.tag] : []),
      isPremium:   req.body.isPremium   ?? false,
      sortOrder:   req.body.sortOrder   ?? 0,
      cssVars:     req.body.cssVars     ?? {},
      slots:       req.body.slots       ?? {},
      thumbnailUrl: req.body.thumbnailUrl ?? "",
    };

    // Validate required fields
    if (!dto.layoutId || !dto.name) {
      return fail(res, "layoutId and name are required.", 422);
    }

    const template = await TemplateService.create(dto, req.user!.id);
    await invalidateTemplateCaches();
    logger.info({ templateId: String(template._id), userId: req.user?.id }, "Template created");
    markSpanSuccess(span);
    return ok(res, template, 201);
  } catch (err: any) {
    markSpanError(span, err as Error, "Create template failed");
    logger.error({ error: err }, "Create template failed");
    if (err.code === 11000) return sendErrorResponse(res, new AppError("A template with this layoutId already exists.", { statusCode: 409, code: "CONFLICT", expose: true }));
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── PUT /admin/templates/:id ─────────────────────────────────────────────────

export async function updateTemplate(req: Request, res: Response) {
  const span = startControllerSpan("template.updateTemplate", req);
  try {
    const dto: UpdateTemplateDto = req.body;
    const updated = await TemplateService.update(String(req.params.id), dto, req.user!.id);
    if (updated) {
      await invalidateTemplateCaches();
      logger.info({ templateId: String(req.params.id), userId: req.user?.id }, "Template updated");
      markSpanSuccess(span);
    }
    if (!updated) return fail(res, "Template not found.", 404);
    return ok(res, updated);
  } catch (err: any) {
    markSpanError(span, err as Error, "Update template failed");
    logger.error({ error: err, templateId: String(req.params.id) }, "Update template failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── PATCH /admin/templates/:id/status ───────────────────────────────────────

export async function setTemplateStatus(req: Request, res: Response) {
  const span = startControllerSpan("template.setTemplateStatus", req);
  try {
    const { status } = req.body;
    if (!["draft", "published", "archived"].includes(status)) {
      return fail(res, "status must be draft | published | archived.", 422);
    }
    const updated = await TemplateService.setStatus(String(req.params.id), status, req.user!.id);
    if (updated) {
      await invalidateTemplateCaches();
      logger.info({ templateId: String(req.params.id), status, userId: req.user?.id }, "Template status updated");
      markSpanSuccess(span);
    }
    if (!updated) return fail(res, "Template not found.", 404);
    return ok(res, updated);
  } catch (err: any) {
    markSpanError(span, err as Error, "Set template status failed");
    logger.error({ error: err, templateId: String(req.params.id) }, "Set template status failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── PATCH /admin/templates/:id/premium ──────────────────────────────────────

export async function togglePremium(req: Request, res: Response) {
  const span = startControllerSpan("template.togglePremium", req);
  try {
    const updated = await TemplateService.togglePremium(String(req.params.id), req.user!.id);
    if (updated) {
      await invalidateTemplateCaches();
      logger.info({ templateId: String(req.params.id), userId: req.user?.id }, "Template premium toggled");
      markSpanSuccess(span);
    }
    if (!updated) return fail(res, "Template not found.", 404);
    return ok(res, updated);
  } catch (err: any) {
    markSpanError(span, err as Error, "Toggle premium failed");
    logger.error({ error: err, templateId: String(req.params.id) }, "Toggle premium failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── DELETE /admin/templates/:id ─────────────────────────────────────────────

export async function deleteTemplate(req: Request, res: Response) {
  const span = startControllerSpan("template.deleteTemplate", req);
  try {
    const deleted = await TemplateService.delete(String(req.params.id));
    if (deleted) {
      await invalidateTemplateCaches();
      logger.info({ templateId: String(req.params.id), userId: req.user?.id }, "Template deleted");
      markSpanSuccess(span);
    }
    if (!deleted) return fail(res, "Template not found.", 404);
    return ok(res, { deleted: true });
  } catch (err: any) {
    markSpanError(span, err as Error, "Delete template failed");
    logger.error({ error: err, templateId: String(req.params.id) }, "Delete template failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── PUT /admin/templates/reorder ────────────────────────────────────────────

export async function reorderTemplates(req: Request, res: Response) {
  const span = startControllerSpan("template.reorderTemplates", req);
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return fail(res, "orderedIds must be an array.", 422);
    await TemplateService.reorder(orderedIds, req.user!.id);
    await invalidateTemplateCaches();
    logger.info({ userId: req.user?.id, count: orderedIds.length }, "Templates reordered");
    markSpanSuccess(span);
    return ok(res, { reordered: true });
  } catch (err: any) {
    markSpanError(span, err as Error, "Reorder templates failed");
    logger.error({ error: err, userId: req.user?.id }, "Reorder templates failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── GET /admin/analytics/dashboard ──────────────────────────────────────────

export async function getDashboardStats(req: Request, res: Response) {
  const span = startControllerSpan("template.getDashboardStats", req);
  try {
    const stats = await TemplateService.getDashboardStats();
    logger.info({ userId: req.user?.id }, "Dashboard stats fetched");
    markSpanSuccess(span);
    return ok(res, stats);
  } catch (err: any) {
    markSpanError(span, err as Error, "Get dashboard stats failed");
    logger.error({ error: err }, "Get dashboard stats failed");
    return sendErrorResponse(res, err, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

// ─── GET /admin/analytics/templates ──────────────────────────────────────────
// Query: ?days=7|30

export async function getAnalytics(req: Request, res: Response) {
  const span = startControllerSpan("template.getAnalytics", req);
  try {
    const days = Math.min(parseInt(String(req.query.days ?? "30"), 10), 90);
    const analytics = await TemplateService.getAllAnalytics(days);
    logger.info({ userId: req.user?.id, days }, "Template analytics fetched");
    markSpanSuccess(span);
    return ok(res, analytics);
  } catch (err: any) {
    markSpanError(span, err as Error, "Get template analytics failed");
    logger.error({ error: err }, "Get template analytics failed");
    return fail(res, err.message, 500);
  } finally {
    finishControllerSpan(span);
  }
}

// ─── POST /api/resumes/usage  (public — called when user creates/edits resume)

export async function recordUsage(req: Request, res: Response) {
  const span = startControllerSpan("template.recordUsage", req);
  try {
    const { templateId, layoutId, type } = req.body;
    if (!layoutId) return fail(res, "layoutId required.", 422);

    let resolvedTemplateId = templateId as string | undefined;
    if (!resolvedTemplateId) {
      const tpl = await Template.findOne({ layoutId }).select("_id").lean();
      if (!tpl?._id) return fail(res, "Template not found for layoutId.", 404);
      resolvedTemplateId = String(tpl._id);
    }

    await (TemplateUsage as any).recordUse(resolvedTemplateId, layoutId, type ?? "create");
    await invalidateTemplateAnalyticsCaches();
    logger.info({ templateId: resolvedTemplateId, layoutId, type: type ?? "create" }, "Template usage recorded");
    markSpanSuccess(span);
    return ok(res, { recorded: true });
  } catch (err: any) {
    markSpanError(span, err as Error, "Record usage failed");
    logger.error({ error: err }, "Record usage failed");
    return fail(res, err.message, 500);
  } finally {
    finishControllerSpan(span);
  }
}

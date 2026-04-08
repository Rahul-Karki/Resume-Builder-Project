import { Request, Response } from "express";
import { TemplateService, CreateTemplateDto, UpdateTemplateDto } from "../services/template.service";
import TemplateUsage from "../models/TemplateUsage";
// ─── Helper: consistent response shape ────────────────────────────────────────

const ok   = (res: Response, data: unknown, status = 200) => res.status(status).json({ ok: true,  data });
const fail = (res: Response, msg: string,   status = 400) => res.status(status).json({ ok: false, error: msg });

// ─── GET /admin/templates ─────────────────────────────────────────────────────
// Query params: ?status=published&category=technical

export async function listTemplates(req: Request, res: Response) {
  try {
    const { status, category } = req.query as Record<string, string>;
    const templates = await TemplateService.getAll({ status, category });
    return ok(res, templates);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── GET /admin/templates/:id ─────────────────────────────────────────────────

export async function getTemplate(req: Request, res: Response) {
  try {
    const tpl = await TemplateService.getById(req.params.id);
    if (!tpl) return fail(res, "Template not found.", 404);
    return ok(res, tpl);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── POST /admin/templates ────────────────────────────────────────────────────

export async function createTemplate(req: Request, res: Response) {
  try {
    const dto: CreateTemplateDto = {
      layoutId:    req.body.layoutId,
      name:        req.body.name,
      description: req.body.description ?? "",
      category:    req.body.category    ?? "professional",
      tag:         req.body.tag         ?? "General",
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
    return ok(res, template, 201);
  } catch (err: any) {
    if (err.code === 11000) return fail(res, "A template with this layoutId already exists.", 409);
    return fail(res, err.message, 500);
  }
}

// ─── PUT /admin/templates/:id ─────────────────────────────────────────────────

export async function updateTemplate(req: Request, res: Response) {
  try {
    const dto: UpdateTemplateDto = req.body;
    const updated = await TemplateService.update(req.params.id, dto, req.user!.id);
    if (!updated) return fail(res, "Template not found.", 404);
    return ok(res, updated);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── PATCH /admin/templates/:id/status ───────────────────────────────────────

export async function setTemplateStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    if (!["draft", "published", "archived"].includes(status)) {
      return fail(res, "status must be draft | published | archived.", 422);
    }
    const updated = await TemplateService.setStatus(req.params.id, status, req.user!.id);
    if (!updated) return fail(res, "Template not found.", 404);
    return ok(res, updated);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── PATCH /admin/templates/:id/premium ──────────────────────────────────────

export async function togglePremium(req: Request, res: Response) {
  try {
    const updated = await TemplateService.togglePremium(req.params.id, req.user!.id);
    if (!updated) return fail(res, "Template not found.", 404);
    return ok(res, updated);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── DELETE /admin/templates/:id ─────────────────────────────────────────────

export async function deleteTemplate(req: Request, res: Response) {
  try {
    const deleted = await TemplateService.delete(req.params.id);
    if (!deleted) return fail(res, "Template not found.", 404);
    return ok(res, { deleted: true });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── PUT /admin/templates/reorder ────────────────────────────────────────────

export async function reorderTemplates(req: Request, res: Response) {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return fail(res, "orderedIds must be an array.", 422);
    await TemplateService.reorder(orderedIds, req.user!.id);
    return ok(res, { reordered: true });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── GET /admin/analytics/dashboard ──────────────────────────────────────────

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const stats = await TemplateService.getDashboardStats();
    return ok(res, stats);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── GET /admin/analytics/templates ──────────────────────────────────────────
// Query: ?days=7|30

export async function getAnalytics(req: Request, res: Response) {
  try {
    const days = Math.min(parseInt(String(req.query.days ?? "30"), 10), 90);
    const analytics = await TemplateService.getAllAnalytics(days);
    return ok(res, analytics);
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}

// ─── POST /api/resumes/usage  (public — called when user creates/edits resume)

export async function recordUsage(req: Request, res: Response) {
  try {
    const { templateId, layoutId, type } = req.body;
    if (!templateId || !layoutId) return fail(res, "templateId and layoutId required.", 422);
    await (TemplateUsage as any).recordUse(templateId, layoutId, type ?? "create");
    return ok(res, { recorded: true });
  } catch (err: any) {
    return fail(res, err.message, 500);
  }
}
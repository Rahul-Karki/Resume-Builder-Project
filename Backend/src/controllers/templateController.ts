import { Request, Response } from "express";
import { TemplateService, CreateTemplateDto, UpdateTemplateDto } from "../services/templateService";
import TemplateUsage from "../models/TemplateUsage";
import Template from "../models/Template";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
import { invalidateRedisCache, redisCacheScopes } from "../middleware/redisCache";
import { AppError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import { sendSuccess } from "../utils/apiResponse";

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

export const listTemplates = wrapController(async (req, res) => {
  const { status, category, audience } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const result = await TemplateService.getAll({ status, category, audience }, page, limit);
  logger.info({ status, category, audience, count: result.templates.length, page, totalPages: result.totalPages, total: result.total }, "Templates listed");
  return sendSuccess(res, result.templates);
}, "template.listTemplates");

export const listPublicTemplates = wrapController(async (req, res) => {
  const { category, audience } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const result = await TemplateService.getAll({ status: "published", category, audience }, page, limit);
  logger.info({ category, audience, count: result.templates.length, page, totalPages: result.totalPages, total: result.total }, "Public templates listed");
  return sendSuccess(res, result);
}, "template.listPublicTemplates");

export const getTemplate = wrapController(async (req, res) => {
  const tpl = await TemplateService.getById(String(req.params.id));
  if (!tpl) return sendErrorResponse(res, new AppError("Template not found.", { statusCode: 404, code: "NOT_FOUND", expose: true }));
  logger.info({ templateId: String(req.params.id) }, "Template fetched");
  return sendSuccess(res, tpl);
}, "template.getTemplate");

export const createTemplate = wrapController(async (req, res) => {
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

  if (!dto.layoutId || !dto.name) {
    return sendErrorResponse(res, new AppError("layoutId and name are required.", { statusCode: 422, code: "VALIDATION_ERROR", expose: true }));
  }

  const template = await TemplateService.create(dto, req.user!.id);
  await invalidateTemplateCaches();
  logger.info({ templateId: String(template._id), userId: req.user?.id }, "Template created");
  return sendSuccess(res, template, 201);
}, "template.createTemplate");

export const updateTemplate = wrapController(async (req, res) => {
  const dto: UpdateTemplateDto = req.body;
  const updated = await TemplateService.update(String(req.params.id), dto, req.user!.id);
  if (!updated) return sendErrorResponse(res, new AppError("Template not found.", { statusCode: 404, code: "NOT_FOUND", expose: true }));
  await invalidateTemplateCaches();
  logger.info({ templateId: String(req.params.id), userId: req.user?.id }, "Template updated");
  return sendSuccess(res, updated);
}, "template.updateTemplate");

export const setTemplateStatus = wrapController(async (req, res) => {
  const { status } = req.body;
  if (!["draft", "published", "archived"].includes(status)) {
    return sendErrorResponse(res, new AppError("status must be draft | published | archived.", { statusCode: 422, code: "VALIDATION_ERROR", expose: true }));
  }
  const updated = await TemplateService.setStatus(String(req.params.id), status, req.user!.id);
  if (!updated) return sendErrorResponse(res, new AppError("Template not found.", { statusCode: 404, code: "NOT_FOUND", expose: true }));
  await invalidateTemplateCaches();
  logger.info({ templateId: String(req.params.id), status, userId: req.user?.id }, "Template status updated");
  return sendSuccess(res, updated);
}, "template.setTemplateStatus");

export const togglePremium = wrapController(async (req, res) => {
  const updated = await TemplateService.togglePremium(String(req.params.id), req.user!.id);
  if (!updated) return sendErrorResponse(res, new AppError("Template not found.", { statusCode: 404, code: "NOT_FOUND", expose: true }));
  await invalidateTemplateCaches();
  logger.info({ templateId: String(req.params.id), userId: req.user?.id }, "Template premium toggled");
  return sendSuccess(res, updated);
}, "template.togglePremium");

export const deleteTemplate = wrapController(async (req, res) => {
  const deleted = await TemplateService.delete(String(req.params.id));
  if (!deleted) return sendErrorResponse(res, new AppError("Template not found.", { statusCode: 404, code: "NOT_FOUND", expose: true }));
  await invalidateTemplateCaches();
  logger.info({ templateId: String(req.params.id), userId: req.user?.id }, "Template deleted");
  return sendSuccess(res, { deleted: true });
}, "template.deleteTemplate");

export const reorderTemplates = wrapController(async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return sendErrorResponse(res, new AppError("orderedIds must be an array.", { statusCode: 422, code: "VALIDATION_ERROR", expose: true }));
  await TemplateService.reorder(orderedIds, req.user!.id);
  await invalidateTemplateCaches();
  logger.info({ userId: req.user?.id, count: orderedIds.length }, "Templates reordered");
  return sendSuccess(res, { reordered: true });
}, "template.reorderTemplates");

export const getDashboardStats = wrapController(async (req, res) => {
  const stats = await TemplateService.getDashboardStats();
  logger.info({ userId: req.user?.id }, "Dashboard stats fetched");
  return sendSuccess(res, stats);
}, "template.getDashboardStats");

export const getAnalytics = wrapController(async (req, res) => {
  const days = Math.min(parseInt(String(req.query.days ?? "30"), 10), 90);
  const analytics = await TemplateService.getAllAnalytics(days);
  logger.info({ userId: req.user?.id, days }, "Template analytics fetched");
  return sendSuccess(res, analytics);
}, "template.getAnalytics");

export const recordUsage = wrapController(async (req, res) => {
  const { templateId, layoutId, type } = req.body;
  if (!layoutId) return sendErrorResponse(res, new AppError("layoutId required.", { statusCode: 422, code: "VALIDATION_ERROR", expose: true }));

  let resolvedTemplateId = templateId as string | undefined;
  if (!resolvedTemplateId) {
    const tpl = await Template.findOne({ layoutId }).select("_id").lean();
    if (!tpl?._id) return sendErrorResponse(res, new AppError("Template not found for layoutId.", { statusCode: 404, code: "NOT_FOUND", expose: true }));
    resolvedTemplateId = String(tpl._id);
  }

  await (TemplateUsage as any).recordUse(resolvedTemplateId, layoutId, type ?? "create");
  await invalidateTemplateAnalyticsCaches();
  logger.info({ templateId: resolvedTemplateId, layoutId, type: type ?? "create" }, "Template usage recorded");
  return sendSuccess(res, { recorded: true });
}, "template.recordUsage");

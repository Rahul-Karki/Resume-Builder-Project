import { Request, Response } from "express";
import { ObservabilityService } from "../services/observabilityService";
import { wrapController } from "../utils/controllerWrapper";
import { sendSuccess } from "../utils/apiResponse";

export const getMetricsOverview = wrapController(async (_req: Request, res: Response) => {
  const [metrics, aiMetrics, systemHealth, errorMetrics] = await Promise.all([
    ObservabilityService.getMetricsSnapshot(),
    ObservabilityService.getAIMetrics(),
    ObservabilityService.getSystemHealth(),
    ObservabilityService.getErrorMetrics(),
  ]);
  return sendSuccess(res, { metrics, aiMetrics, systemHealth, errorMetrics });
}, "observability.getMetricsOverview");

export const getSystemHealth = wrapController(async (_req: Request, res: Response) => {
  const health = await ObservabilityService.getSystemHealth();
  return sendSuccess(res, health);
}, "observability.getSystemHealth");

export const getAIMetrics = wrapController(async (_req: Request, res: Response) => {
  const aiMetrics = await ObservabilityService.getAIMetrics();
  return sendSuccess(res, aiMetrics);
}, "observability.getAIMetrics");

export const getErrorMetrics = wrapController(async (_req: Request, res: Response) => {
  const errorMetrics = await ObservabilityService.getErrorMetrics();
  return sendSuccess(res, errorMetrics);
}, "observability.getErrorMetrics");

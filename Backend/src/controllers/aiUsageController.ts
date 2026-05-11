import type { RequestHandler } from "express";
import { startControllerSpan, markSpanSuccess, markSpanError, finishControllerSpan } from "../utils/controllerObservability";
import { sendErrorResponse } from "../utils/errorResponse";
import { AuthError } from "../errors/AppError";
import { logger } from "../observability";
import AiUsage from "../models/AiUsage";

const getUserId = (req: any) => req.user?.id;

const requireAuth = (req: any, res: any) => {
  const userId = getUserId(req);
  if (!userId) {
    sendErrorResponse(res, new AuthError("Unauthorized", { code: "AUTH_REQUIRED" }));
    return null;
  }
  return userId;
};

/**
 * Get AI usage statistics for the authenticated user
 * Returns total tokens, cost, and breakdown by provider and feature
 */
export const getAiUsageStats: RequestHandler = async (req, res) => {
  const span = startControllerSpan("ai.getUsageStats", req);

  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { days = 30 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(String(days)) || 30, 1), 365);
    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    // Get all usage records for this user in the last N days
    const usageRecords = await AiUsage.find({
      userId,
      createdAt: { $gte: since },
    }).lean();

    // Calculate aggregated stats
    const stats = {
      totalRequests: usageRecords.length,
      successfulRequests: usageRecords.filter((r) => r.success).length,
      failedRequests: usageRecords.filter((r) => !r.success).length,
      fallbackRequests: usageRecords.filter((r) => r.fallback).length,
      totalInputTokens: usageRecords.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: usageRecords.reduce((sum, r) => sum + r.outputTokens, 0),
      totalTokens: usageRecords.reduce((sum, r) => sum + (r.inputTokens + r.outputTokens), 0),
      totalCostUsd: usageRecords.reduce((sum, r) => sum + r.costUsd, 0),
      byProvider: {} as Record<string, any>,
      byFeature: {} as Record<string, any>,
      dailyBreakdown: {} as Record<string, any>,
    };

    // Group by provider
    const byProvider: Record<string, any> = {};
    usageRecords.forEach((r) => {
      if (!byProvider[r.provider]) {
        byProvider[r.provider] = {
          requests: 0,
          successfulRequests: 0,
          totalTokens: 0,
          totalCostUsd: 0,
          models: {},
        };
      }
      byProvider[r.provider].requests += 1;
      if (r.success) byProvider[r.provider].successfulRequests += 1;
      byProvider[r.provider].totalTokens += r.inputTokens + r.outputTokens;
      byProvider[r.provider].totalCostUsd += r.costUsd;

      if (!byProvider[r.provider].models[r.modelName]) {
        byProvider[r.provider].models[r.modelName] = {
          requests: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
      }
      byProvider[r.provider].models[r.modelName].requests += 1;
      byProvider[r.provider].models[r.modelName].totalTokens += r.inputTokens + r.outputTokens;
      byProvider[r.provider].models[r.modelName].totalCostUsd += r.costUsd;
    });
    stats.byProvider = byProvider;

    // Group by feature
    const byFeature: Record<string, any> = {};
    usageRecords.forEach((r) => {
      if (!byFeature[r.feature]) {
        byFeature[r.feature] = {
          requests: 0,
          successfulRequests: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
      }
      byFeature[r.feature].requests += 1;
      if (r.success) byFeature[r.feature].successfulRequests += 1;
      byFeature[r.feature].totalTokens += r.inputTokens + r.outputTokens;
      byFeature[r.feature].totalCostUsd += r.costUsd;
    });
    stats.byFeature = byFeature;

    // Daily breakdown
    const byDate: Record<string, any> = {};
    usageRecords.forEach((r) => {
      const date = new Date(r.createdAt).toISOString().split("T")[0];
      if (!byDate[date]) {
        byDate[date] = {
          requests: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
      }
      byDate[date].requests += 1;
      byDate[date].totalTokens += r.inputTokens + r.outputTokens;
      byDate[date].totalCostUsd += r.costUsd;
    });
    stats.dailyBreakdown = byDate;

    logger.info(
      {
        userId,
        days: daysNum,
        totalRequests: stats.totalRequests,
        totalCostUsd: stats.totalCostUsd.toFixed(6),
      },
      "AI usage stats retrieved"
    );

    markSpanSuccess(span);
    res.status(200).json({
      message: "AI usage statistics retrieved successfully",
      data: stats,
      period: {
        days: daysNum,
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
    });
  } catch (error) {
    markSpanError(span, error as Error, "Failed to retrieve AI usage statistics");
    logger.error({ error }, "Failed to retrieve AI usage statistics");
    sendErrorResponse(res, error, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Failed to retrieve AI usage statistics",
    });
  } finally {
    finishControllerSpan(span);
  }
};

/**
 * Get recent AI requests for the authenticated user
 * Useful for debugging and tracking specific requests
 */
export const getAiRequestHistory: RequestHandler = async (req, res) => {
  const span = startControllerSpan("ai.getRequestHistory", req);

  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { limit = 50, offset = 0 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(String(limit)) || 50, 1), 500);
    const offsetNum = Math.max(parseInt(String(offset)) || 0, 0);

    const records = await AiUsage.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offsetNum)
      .limit(limitNum)
      .lean();

    const total = await AiUsage.countDocuments({ userId });

    markSpanSuccess(span);
    res.status(200).json({
      message: "AI request history retrieved successfully",
      data: records,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total,
        hasMore: offsetNum + limitNum < total,
      },
    });
  } catch (error) {
    markSpanError(span, error as Error, "Failed to retrieve AI request history");
    logger.error({ error }, "Failed to retrieve AI request history");
    sendErrorResponse(res, error, {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Failed to retrieve AI request history",
    });
  } finally {
    finishControllerSpan(span);
  }
};

import { Request, RequestHandler, Response } from "express";
import crypto from "crypto";
import { checkGrammar, enhanceBullet, improveText } from "../services/aiService";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { AuthError } from "../errors/AppError";
import type { AiTone } from "../../../shared/src/ai";
import { calculateAICost } from "../utils/tokenCounter";
import { trackAiRequest, trackValidationError } from "../observability/aiMetrics";
import { MemoryLRUCache } from "../utils/memoryCache";
import { env } from "../config/env";
import { assertAiCreditsAvailable, deductAiCredits, refreshAiCreditsIfNeeded } from "../utils/aiCredits";
import type { AiOperation } from "../utils/creditCalculator";

/**
 * In-memory AI response cache. Prevents redundant API calls for identical text inputs.
 * TTL: 5 minutes, max 100 entries. Keyed by SHA-256 of (text + section + tone).
 */
const aiResponseCache = new MemoryLRUCache(100);
const AI_CACHE_TTL_SECONDS = 300;

const createAiCacheKey = (type: string, text: string, section: string, tone: string, context?: string, variationSeed?: string): string => {
  const raw = `${type}:${text}:${section}:${tone}:${context ?? ""}:${variationSeed ?? ""}`;
  return `ai:${type}:${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16)}`;
};

const getUserId = (req: Request) => req.user?.id;

const requireAuth = (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) {
    sendErrorResponse(res, new AuthError("Unauthorized", { code: "AUTH_REQUIRED" }));
    return null;
  }

  return userId;
};

const getTone = (tone: unknown): AiTone => {
  if (tone === "concise" || tone === "technical" || tone === "leadership-focused") {
    return tone;
  }

  return "professional";
};

/**
 * Extract request ID from headers for distributed tracing.
 * Falls back to generating a unique ID if not provided.
 */
const getRequestId = (req: Request): string => {
  return String(req.headers["x-request-id"] || req.headers["x-correlation-id"] || "");
};

const getCostProvider = (provider: string | undefined): "openai" | "gemini" => {
  return provider === "openai" ? "openai" : "gemini";
};

const aiProvidersConfigured = () => {
  if (env.AI_PROVIDER === "openai") return Boolean(env.OPENAI_API_KEY);
  if (env.AI_PROVIDER === "gemini") return Boolean(env.GEMINI_API_KEY);
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY);
};

const setAiResponseHeaders = (res: Response, headers: {
  cached: boolean;
  fallback?: boolean;
  provider?: string;
  model?: string;
  creditsEstimated?: number;
  creditsDeducted?: number;
  creditsRemaining?: number;
  creditsResetAt?: Date;
  creditsPlan?: string;
}) => {
  res.setHeader("x-ai-cached", headers.cached ? "1" : "0");
  if (headers.fallback !== undefined) res.setHeader("x-ai-fallback", headers.fallback ? "1" : "0");
  if (headers.provider) res.setHeader("x-ai-provider", headers.provider);
  if (headers.model) res.setHeader("x-ai-model", headers.model);
  if (typeof headers.creditsEstimated === "number") res.setHeader("x-ai-credits-estimated", String(headers.creditsEstimated));
  if (typeof headers.creditsDeducted === "number") res.setHeader("x-ai-credits-deducted", String(headers.creditsDeducted));
  if (typeof headers.creditsRemaining === "number") res.setHeader("x-ai-credits-remaining", String(headers.creditsRemaining));
  if (headers.creditsResetAt) res.setHeader("x-ai-credits-reset-at", new Date(headers.creditsResetAt).toISOString());
  if (headers.creditsPlan) res.setHeader("x-ai-credits-plan", headers.creditsPlan);
};

const enforceCreditsIfNeeded = async (operation: AiOperation, req: Request, userId: string) => {
  if (!env.AI_CREDITS_ENFORCED) return;
  if (!aiProvidersConfigured()) return;
  const estimatedCredits = req.creditContext?.estimatedCredits ?? 0;
  await assertAiCreditsAvailable(userId, estimatedCredits);
  (req as Request & { _aiCreditsEstimated?: number; _aiOperation?: AiOperation })._aiCreditsEstimated = estimatedCredits;
  (req as Request & { _aiCreditsEstimated?: number; _aiOperation?: AiOperation })._aiOperation = operation;
};

const maybeDeductCredits = async (req: Request, userId: string, shouldDeduct: boolean) => {
  if (!env.AI_CREDITS_ENFORCED) return { deducted: 0, user: null as any };

  const estimatedCredits = (req as Request & { _aiCreditsEstimated?: number })._aiCreditsEstimated ?? req.creditContext?.estimatedCredits ?? 0;

  if (!shouldDeduct) {
    const user = await refreshAiCreditsIfNeeded(userId);
    return { deducted: 0, user };
  }

  const user = await deductAiCredits(userId, estimatedCredits);
  return { deducted: estimatedCredits, user };
};

export const improveTextHandler: RequestHandler = async (req, res) => {
  const requestId = getRequestId(req);
  const span = startControllerSpan("ai.improveText", req);
  const startTime = Date.now();
  
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const text = String(req.body?.text ?? "");
    const section = String(req.body?.section ?? "summary");
    const tone = getTone(req.body?.tone);
    const context = typeof req.body?.context === "string" ? req.body.context : undefined;
    const targetRole = typeof req.body?.targetRole === "string" ? req.body.targetRole : undefined;
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const variationSeed = typeof req.body?.variationSeed === "string" ? req.body.variationSeed : undefined;

    // Check in-memory cache first
    const cacheKey = createAiCacheKey("improve", text, section, tone, context, variationSeed);
    if (!forceRefresh) {
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        logger.debug({ requestId, userId, cacheKey }, "AI improve-text cache hit");
        markSpanSuccess(span);
        setAiResponseHeaders(res, {
          cached: true,
          creditsEstimated: req.creditContext?.estimatedCredits,
          creditsDeducted: 0,
        });
        res.status(200).json(JSON.parse(cached));
        return;
      }
    }

    await enforceCreditsIfNeeded("improve-text", req, userId);

    const result = await improveText({ text, section, tone, context, targetRole, userId, variationSeed });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      getCostProvider(result._provider),
      result._model || "unknown"
    );

    // Track metrics
    trackAiRequest(
      "improve-text",
      result._provider || "unknown",
      "success",
      latencyMs,
      result._tokens,
      result._fallback || false
    );

    logger.info(
      {
        requestId,
        userId,
        aiType: "improve-text",
        section: req.body?.section,
        provider: result._provider,
        model: result._model,
        tokens: result._tokens,
        cost: {
          input: cost.input.toFixed(6),
          output: cost.output.toFixed(6),
          total: cost.total.toFixed(6),
        },
        latencyMs,
        fallback: result._fallback || false,
      },
      "AI improve-text request completed"
    );

    markSpanSuccess(span);

    const { deducted, user } = await maybeDeductCredits(req, userId, !(result._fallback || false));
    setAiResponseHeaders(res, {
      cached: false,
      fallback: result._fallback || false,
      provider: result._provider,
      model: result._model,
      creditsEstimated: req.creditContext?.estimatedCredits,
      creditsDeducted: deducted,
      creditsRemaining: user?.aiCreditsRemaining,
      creditsResetAt: user?.aiCreditsResetAt,
      creditsPlan: user?.aiCreditsPlan,
    });

    // Remove internal tracking fields from response
    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
    // Cache the response for future identical requests
    if (!forceRefresh) {
      try { aiResponseCache.set(cacheKey, JSON.stringify(responseData), AI_CACHE_TTL_SECONDS); } catch { /* ignore cache errors */ }
    }
    res.status(200).json(responseData);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    trackAiRequest("improve-text", "unknown", "error", latencyMs);
    trackValidationError("improve_text_error");
    
    markSpanError(span, error as Error, "Failed to improve text");
    logger.error(
      {
        requestId,
        userId: (req.user as Record<string, unknown> | undefined)?.id,
        aiType: "improve-text",
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
      },
      "AI improve-text request failed"
    );
    sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

export const checkGrammarHandler: RequestHandler = async (req, res) => {
  const requestId = getRequestId(req);
  const span = startControllerSpan("ai.checkGrammar", req);
  const startTime = Date.now();
  
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const text = String(req.body?.text ?? "");
    const section = String(req.body?.section ?? "summary");
    const context = typeof req.body?.context === "string" ? req.body.context : undefined;
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const variationSeed = typeof req.body?.variationSeed === "string" ? req.body.variationSeed : undefined;

    // Check in-memory cache first
    const cacheKey = createAiCacheKey("grammar", text, section, "default", context, variationSeed);
    if (!forceRefresh) {
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        logger.debug({ requestId, userId, cacheKey }, "AI check-grammar cache hit");
        markSpanSuccess(span);
        setAiResponseHeaders(res, {
          cached: true,
          creditsEstimated: req.creditContext?.estimatedCredits,
          creditsDeducted: 0,
        });
        res.status(200).json(JSON.parse(cached));
        return;
      }
    }

    await enforceCreditsIfNeeded("check-grammar", req, userId);

    const result = await checkGrammar({ text, section, context, userId, variationSeed });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      getCostProvider(result._provider),
      result._model || "unknown"
    );

    // Track metrics
    trackAiRequest(
      "check-grammar",
      result._provider || "unknown",
      "success",
      latencyMs,
      result._tokens,
      result._fallback || false
    );

    logger.info(
      {
        requestId,
        userId,
        aiType: "check-grammar",
        section: req.body?.section,
        provider: result._provider,
        model: result._model,
        tokens: result._tokens,
        cost: {
          input: cost.input.toFixed(6),
          output: cost.output.toFixed(6),
          total: cost.total.toFixed(6),
        },
        issuesFound: (result.issues || []).length,
        latencyMs,
        fallback: result._fallback || false,
      },
      "AI check-grammar request completed"
    );

    markSpanSuccess(span);

    const { deducted, user } = await maybeDeductCredits(req, userId, !(result._fallback || false));
    setAiResponseHeaders(res, {
      cached: false,
      fallback: result._fallback || false,
      provider: result._provider,
      model: result._model,
      creditsEstimated: req.creditContext?.estimatedCredits,
      creditsDeducted: deducted,
      creditsRemaining: user?.aiCreditsRemaining,
      creditsResetAt: user?.aiCreditsResetAt,
      creditsPlan: user?.aiCreditsPlan,
    });

    // Remove internal tracking fields from response
    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
    // Cache the response for future identical requests
    if (!forceRefresh) {
      try { aiResponseCache.set(cacheKey, JSON.stringify(responseData), AI_CACHE_TTL_SECONDS); } catch { /* ignore cache errors */ }
    }
    res.status(200).json(responseData);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    trackAiRequest("check-grammar", "unknown", "error", latencyMs);
    trackValidationError("check_grammar_error");
    
    markSpanError(span, error as Error, "Failed to check grammar");
    logger.error(
      {
        requestId,
        userId: (req.user as Record<string, unknown> | undefined)?.id,
        aiType: "check-grammar",
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
      },
      "AI check-grammar request failed"
    );
    sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

export const enhanceBulletHandler: RequestHandler = async (req, res) => {
  const requestId = getRequestId(req);
  const span = startControllerSpan("ai.enhanceBullet", req);
  const startTime = Date.now();
  
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const text = String(req.body?.text ?? "");
    const section = String(req.body?.section ?? "experience");
    const tone = getTone(req.body?.tone);
    const context = typeof req.body?.context === "string" ? req.body.context : undefined;
    const targetRole = typeof req.body?.targetRole === "string" ? req.body.targetRole : undefined;
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const variationSeed = typeof req.body?.variationSeed === "string" ? req.body.variationSeed : undefined;

    // Check in-memory cache first
    const cacheKey = createAiCacheKey("bullet", text, section, tone, context, variationSeed);
    if (!forceRefresh) {
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        logger.debug({ requestId, userId, cacheKey }, "AI enhance-bullet cache hit");
        markSpanSuccess(span);
        setAiResponseHeaders(res, {
          cached: true,
          creditsEstimated: req.creditContext?.estimatedCredits,
          creditsDeducted: 0,
        });
        res.status(200).json(JSON.parse(cached));
        return;
      }
    }

    await enforceCreditsIfNeeded("enhance-bullet", req, userId);

    const result = await enhanceBullet({ text, section, tone, context, targetRole, userId, variationSeed });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      getCostProvider(result._provider),
      result._model || "unknown"
    );

    // Track metrics
    trackAiRequest(
      "enhance-bullet",
      result._provider || "unknown",
      "success",
      latencyMs,
      result._tokens,
      result._fallback || false
    );

    logger.info(
      {
        requestId,
        userId,
        aiType: "enhance-bullet",
        section: req.body?.section,
        provider: result._provider,
        model: result._model,
        tokens: result._tokens,
        cost: {
          input: cost.input.toFixed(6),
          output: cost.output.toFixed(6),
          total: cost.total.toFixed(6),
        },
        latencyMs,
        fallback: result._fallback || false,
      },
      "AI enhance-bullet request completed"
    );

    markSpanSuccess(span);

    const { deducted, user } = await maybeDeductCredits(req, userId, !(result._fallback || false));
    setAiResponseHeaders(res, {
      cached: false,
      fallback: result._fallback || false,
      provider: result._provider,
      model: result._model,
      creditsEstimated: req.creditContext?.estimatedCredits,
      creditsDeducted: deducted,
      creditsRemaining: user?.aiCreditsRemaining,
      creditsResetAt: user?.aiCreditsResetAt,
      creditsPlan: user?.aiCreditsPlan,
    });

    // Remove internal tracking fields from response
    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
    // Cache the response for future identical requests
    if (!forceRefresh) {
      try { aiResponseCache.set(cacheKey, JSON.stringify(responseData), AI_CACHE_TTL_SECONDS); } catch { /* ignore cache errors */ }
    }
    res.status(200).json(responseData);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    trackAiRequest("enhance-bullet", "unknown", "error", latencyMs);
    trackValidationError("enhance_bullet_error");
    
    markSpanError(span, error as Error, "Failed to enhance bullet");
    logger.error(
      {
        requestId,
        userId: (req.user as Record<string, unknown> | undefined)?.id,
        aiType: "enhance-bullet",
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
      },
      "AI enhance-bullet request failed"
    );
    sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

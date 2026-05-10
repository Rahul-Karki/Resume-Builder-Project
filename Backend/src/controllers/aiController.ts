import { Request, RequestHandler, Response } from "express";
import { checkGrammar, enhanceBullet, improveText } from "../services/aiService";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { AuthError } from "../errors/AppError";
import type { AiTone } from "../../../shared/src/ai";
import { calculateAICost } from "../utils/tokenCounter";
import { trackAiRequest, trackValidationError } from "../observability/aiMetrics";

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

export const improveTextHandler: RequestHandler = async (req, res) => {
  const requestId = getRequestId(req);
  const span = startControllerSpan("ai.improveText", req);
  const startTime = Date.now();
  
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const result = await improveText({
      text: String(req.body?.text ?? ""),
      section: String(req.body?.section ?? "summary"),
      tone: getTone(req.body?.tone),
      context: typeof req.body?.context === "string" ? req.body.context : undefined,
      targetRole: typeof req.body?.targetRole === "string" ? req.body.targetRole : undefined,
    });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      result._provider || "gemini",
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
    // Remove internal tracking fields from response
    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
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

    const result = await checkGrammar({
      text: String(req.body?.text ?? ""),
      section: String(req.body?.section ?? "summary"),
      context: typeof req.body?.context === "string" ? req.body.context : undefined,
    });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      result._provider || "gemini",
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
    // Remove internal tracking fields from response
    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
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

    const result = await enhanceBullet({
      text: String(req.body?.text ?? ""),
      section: String(req.body?.section ?? "experience"),
      tone: getTone(req.body?.tone),
      context: typeof req.body?.context === "string" ? req.body.context : undefined,
      targetRole: typeof req.body?.targetRole === "string" ? req.body.targetRole : undefined,
    });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      result._provider || "gemini",
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
    // Remove internal tracking fields from response
    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
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

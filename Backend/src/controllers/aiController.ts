import { Request, Response } from "express";
import crypto from "crypto";
import { checkGrammar, enhanceBullet, improveText } from "../services/aiService";
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
import { wrapController } from "../utils/controllerWrapper";

const aiResponseCache = new MemoryLRUCache(100);
const AI_CACHE_TTL_SECONDS = 300;

const createAiCacheKey = (type: string, text: string, section: string, tone: string, context?: string, variationSeed?: string): string => {
  const raw = `${type}:${text}:${section}:${tone}:${context ?? ""}:${variationSeed ?? ""}`;
  return `ai:${type}:${crypto.createHash("sha256").update(raw).digest("hex")}`;
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

type AiRequestBody = {
  text: string;
  section: string;
  tone?: unknown;
  context?: string;
  targetRole?: string;
  forceRefresh?: boolean;
  variationSeed?: string;
};

type AiHandlerFn = (params: {
  text: string;
  section: string;
  tone: AiTone;
  context?: string;
  targetRole?: string;
  userId: string;
  variationSeed?: string;
}) => Promise<any>;

const createAiHandler = (aiType: string, cacheKeyPrefix: string, handlerFn: AiHandlerFn) =>
  wrapController(async (req, res) => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    const userId = requireAuth(req, res);
    if (!userId) return;

    const { text, section, tone: rawTone, context, targetRole, forceRefresh, variationSeed } = req.body as AiRequestBody;
    const tone = getTone(rawTone);

    const cacheKey = createAiCacheKey(cacheKeyPrefix, text, section, tone, context, variationSeed);
    if (!forceRefresh) {
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        logger.debug({ requestId, userId, cacheKey }, `AI ${aiType} cache hit`);
        setAiResponseHeaders(res, {
          cached: true,
          creditsEstimated: req.creditContext?.estimatedCredits,
          creditsDeducted: 0,
        });
        res.status(200).json(JSON.parse(cached));
        return;
      }
    }

    await enforceCreditsIfNeeded(aiType as AiOperation, req, userId);

    const result = await handlerFn({ text, section, tone, context, targetRole, userId, variationSeed });

    const latencyMs = Date.now() - startTime;
    const cost = calculateAICost(
      { input: result._tokens?.input || 0, output: result._tokens?.output || 0 },
      getCostProvider(result._provider),
      result._model || "unknown"
    );

    trackAiRequest(aiType, result._provider || "unknown", "success", latencyMs, result._tokens, result._fallback || false);

    logger.info({
      requestId, userId, aiType, section, provider: result._provider,
      model: result._model, tokens: result._tokens,
      cost: { input: cost.input.toFixed(6), output: cost.output.toFixed(6), total: cost.total.toFixed(6) },
      latencyMs, fallback: result._fallback || false,
    }, `AI ${aiType} request completed`);

    const { deducted, user } = await maybeDeductCredits(req, userId, !(result._fallback || false));
    setAiResponseHeaders(res, {
      cached: false, fallback: result._fallback || false, provider: result._provider,
      model: result._model, creditsEstimated: req.creditContext?.estimatedCredits,
      creditsDeducted: deducted, creditsRemaining: user?.aiCreditsRemaining,
      creditsResetAt: user?.aiCreditsResetAt, creditsPlan: user?.aiCreditsPlan,
    });

    const { _tokens, _provider, _model, _fallback, ...responseData } = result;
    if (!forceRefresh) {
      try { aiResponseCache.set(cacheKey, JSON.stringify(responseData), AI_CACHE_TTL_SECONDS); } catch { /* ignore cache errors */ }
    }
    res.status(200).json(responseData);
  }, {
    spanName: `ai.${aiType}`,
    onError: (error, req) => {
      trackAiRequest(aiType, "unknown", "error", Date.now());
      trackValidationError(`${aiType.replace("-", "_")}_error`);
    },
  });

export const improveTextHandler = createAiHandler("improve-text", "improve", improveText);
export const checkGrammarHandler = createAiHandler("check-grammar", "grammar", checkGrammar);
export const enhanceBulletHandler = createAiHandler("enhance-bullet", "bullet", enhanceBullet);

export { enforceCreditsIfNeeded, maybeDeductCredits, setAiResponseHeaders };

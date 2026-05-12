import { api } from "./api";
import type { AiGrammarResult, AiRewriteResult, AiTone } from "@/types/resume-types";

/**
 * AI client service for making structured AI requests from the frontend.
 * Handles request preparation, response parsing, and error handling.
 */

export interface AiRequestOptions {
  timeoutMs?: number;
  requestId?: string;
  abortSignal?: AbortSignal;
}

export interface AiRequestContext {
  text: string;
  section: "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";
  tone?: AiTone;
  context?: string;
  targetRole?: string;
}

/**
 * Improve resume text with AI suggestions.
 */
export const improveResumeTextClient = async (
  textContext: AiRequestContext,
  options: AiRequestOptions = {}
): Promise<AiRewriteResult> => {
  const response = await api.post("/ai/improve-text", textContext, {
    timeout: options.timeoutMs || 8000,
    signal: options.abortSignal,
    headers: options.requestId
      ? {
          "X-Request-ID": options.requestId,
        }
      : undefined,
  });

  return response.data as AiRewriteResult;
};

/**
 * Check grammar in resume text with AI.
 */
export const checkResumeGrammarClient = async (
  textContext: AiRequestContext,
  options: AiRequestOptions = {}
): Promise<AiGrammarResult> => {
  const response = await api.post("/ai/check-grammar", textContext, {
    timeout: options.timeoutMs || 8000,
    signal: options.abortSignal,
    headers: options.requestId
      ? {
          "X-Request-ID": options.requestId,
        }
      : undefined,
  });

  return response.data as AiGrammarResult;
};

/**
 * Enhance a resume bullet point with AI.
 */
export const enhanceResumeBulletClient = async (
  textContext: AiRequestContext,
  options: AiRequestOptions = {}
): Promise<AiRewriteResult> => {
  const response = await api.post("/ai/enhance-bullet", textContext, {
    timeout: options.timeoutMs || 8000,
    signal: options.abortSignal,
    headers: options.requestId
      ? {
          "X-Request-ID": options.requestId,
        }
      : undefined,
  });

  return response.data as AiRewriteResult;
};

/**
 * Validate AI response structure before using it.
 * Returns true if response is valid, false otherwise.
 */
export const validateAiResponse = (
  response: unknown
): response is AiRewriteResult | AiGrammarResult => {
  if (!response || typeof response !== "object") {
    return false;
  }

  const obj = response as Record<string, unknown>;

  // Check for AiRewriteResult shape
  if ("suggestions" in obj && "variations" in obj) {
    const suggestions = obj.suggestions;
    return (
      Array.isArray(suggestions) &&
      suggestions.length > 0 &&
      (suggestions[0] as Record<string, unknown>)?.suggestionText !== undefined
    );
  }

  // Check for AiGrammarResult shape
  if ("issues" in obj && "correctedText" in obj) {
    return (
      Array.isArray(obj.issues) &&
      typeof obj.correctedText === "string"
    );
  }

  return false;
};

/**
 * Categorize AI errors for better error handling and logging.
 */
export type AiErrorType =
  | "timeout"
  | "network"
  | "rate_limit"
  | "auth"
  | "validation"
  | "provider"
  | "cancelled"
  | "unknown";

export const categorizeAiError = (error: unknown): AiErrorType => {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "cancelled";
    if (error.message.includes("timeout")) return "timeout";
    if (error.message.includes("429")) return "rate_limit";
    if (error.message.includes("401") || error.message.includes("403")) return "auth";
    if (error.message.includes("400")) return "validation";
  }

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object"
  ) {
    const response = error.response as Record<string, unknown>;
    const status = response.status as number | undefined;
    if (status === 429) return "rate_limit";
    if (status === 401 || status === 403) return "auth";
    if (status === 400) return "validation";
    if (status && status >= 500) return "provider";
    if (status === 0) return "network";
  }

  return "unknown";
};

/**
 * Extract human-readable error message from AI error.
 */
export const getAiErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object"
  ) {
    const response = error.response as Record<string, unknown>;
    if ("data" in response && response.data && typeof response.data === "object") {
      const data = response.data as Record<string, unknown>;
      if (typeof data.message === "string") {
        return data.message;
      }
    }
  }

  return "Failed to get AI suggestions";
};

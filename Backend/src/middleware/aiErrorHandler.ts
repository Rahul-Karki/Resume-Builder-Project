import { Request, Response, NextFunction } from "express";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import type { AppError } from "../errors/AppError";

/**
 * Categorizes AI-related errors for better handling and monitoring.
 */
export type AiErrorCategory =
  | "PROVIDER_ERROR" // External AI provider error (OpenAI, Gemini)
  | "TIMEOUT_ERROR" // Request exceeded timeout
  | "RATE_LIMIT_ERROR" // User or provider rate limit hit
  | "VALIDATION_ERROR" // Invalid input parameters
  | "MALFORMED_RESPONSE" // AI returned invalid JSON
  | "AUTH_ERROR" // Authentication/authorization issue
  | "UNKNOWN"; // Unknown error

export interface AiErrorContext {
  category: AiErrorCategory;
  retryable: boolean;
  statusCode: number;
  message: string;
}

/**
 * Categorize errors from AI operations for proper handling and alerting.
 */
export const categorizeAiError = (error: unknown): AiErrorContext => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("abort")) {
      return {
        category: "TIMEOUT_ERROR",
        retryable: true,
        statusCode: 504,
        message: "AI request timed out. Please try again.",
      };
    }

    if (message.includes("429") || message.includes("rate limit")) {
      return {
        category: "RATE_LIMIT_ERROR",
        retryable: true,
        statusCode: 429,
        message: "Too many AI requests. Please wait and try again.",
      };
    }

    if (message.includes("401") || message.includes("403")) {
      return {
        category: "AUTH_ERROR",
        retryable: false,
        statusCode: 401,
        message: "Authentication failed for AI service.",
      };
    }

    if (
      message.includes("json") ||
      message.includes("parse") ||
      message.includes("unexpected token")
    ) {
      return {
        category: "MALFORMED_RESPONSE",
        retryable: true,
        statusCode: 502,
        message: "AI returned an invalid response. Please try again.",
      };
    }

    if (message.includes("openai") || message.includes("gemini")) {
      return {
        category: "PROVIDER_ERROR",
        retryable: true,
        statusCode: 503,
        message: "AI service is temporarily unavailable. Please try again.",
      };
    }
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

    if (status === 429) {
      return {
        category: "RATE_LIMIT_ERROR",
        retryable: true,
        statusCode: 429,
        message: "Too many AI requests. Please wait and try again.",
      };
    }

    if (status === 401 || status === 403) {
      return {
        category: "AUTH_ERROR",
        retryable: false,
        statusCode: 401,
        message: "Authentication failed for AI service.",
      };
    }

    if (status && status >= 500) {
      return {
        category: "PROVIDER_ERROR",
        retryable: true,
        statusCode: 503,
        message: "AI service is temporarily unavailable. Please try again.",
      };
    }

    if (status === 400) {
      return {
        category: "VALIDATION_ERROR",
        retryable: false,
        statusCode: 400,
        message: "Invalid request parameters.",
      };
    }
  }

  return {
    category: "UNKNOWN",
    retryable: true,
    statusCode: 500,
    message: "An unexpected error occurred. Please try again.",
  };
};

/**
 * Validation error handler for AI requests.
 * Provides consistent error responses and logging.
 */
export const handleAiError = (
  error: unknown,
  req: Request,
  res: Response,
  _next?: NextFunction
): void => {
  const context = categorizeAiError(error);
  const requestId = String(req.headers["x-request-id"] || "");
  const userId = (req.user as Record<string, unknown> | undefined)?.id || "unknown";

  logger.error(
    {
      requestId,
      userId,
      errorCategory: context.category,
      errorMessage: error instanceof Error ? error.message : String(error),
      retryable: context.retryable,
      path: req.path,
      method: req.method,
    },
    "AI request error"
  );

  const errorData = {
    code: context.category,
    message: context.message,
    retryable: context.retryable,
  };

  if (process.env.NODE_ENV === "development") {
    (errorData as Record<string, unknown>).debug = error instanceof Error ? error.message : String(error);
  }

  res.status(context.statusCode).json({
    success: false,
    error: errorData,
  });
};

/**
 * Error handling middleware for AI routes.
 */
export const aiErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response already started, pass to express error handler
  if (res.headersSent) {
    return next(err);
  }

  handleAiError(err, req, res, next);
};

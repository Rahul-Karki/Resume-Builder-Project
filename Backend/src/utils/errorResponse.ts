import type { Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError, AuthError, NotFoundError, ValidationError } from "../errors/AppError";
import { captureBackendException } from "../config/sentry";

type ErrorFallback = {
  statusCode?: number;
  code?: string;
  message?: string;
  traceId?: string;
};

export type ApiErrorResponse = {
  message: string;
  code: string;
  traceId: string;
  errors?: unknown;
};

const getTraceId = (res?: Response, fallbackTraceId?: string) => {
  const request = res?.req as { traceId?: string; correlationId?: string } | undefined;
  return request?.traceId ?? request?.correlationId ?? fallbackTraceId ?? "unknown-trace-id";
};

const isDuplicateKeyError = (error: unknown): error is { code: number; keyValue?: Record<string, unknown> } => {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
};

export const toAppError = (error: unknown, fallback: ErrorFallback = {}): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new ValidationError("Invalid request payload", error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })));
  }

  if (error instanceof mongoose.Error.CastError) {
    return new ValidationError("Invalid request payload", {
      path: error.path,
      value: error.value,
      message: `Invalid ${error.path}`,
    });
  }

  if (isDuplicateKeyError(error)) {
    return new AppError("Resource already exists", {
      statusCode: 409,
      code: "CONFLICT",
      details: error.keyValue,
      expose: true,
    });
  }

  return new AppError(fallback.message ?? "Server error", {
    statusCode: fallback.statusCode ?? 500,
    code: fallback.code ?? "SERVER_ERROR",
    expose: (fallback.statusCode ?? 500) < 500 ? true : false,
    cause: error,
  });
};

export const buildErrorResponse = (error: unknown, fallback: ErrorFallback = {}): { statusCode: number; body: ApiErrorResponse } => {
  const appError = toAppError(error, fallback);
  const traceId = fallback.traceId ?? "unknown-trace-id";

  return {
    statusCode: appError.statusCode,
    body: {
      message: appError.expose ? appError.message : (fallback.message ?? "Server error"),
      code: appError.code,
      traceId,
      ...(appError.code === "VALIDATION_ERROR" && appError.details !== undefined
        ? { errors: appError.details }
        : {}),
    },
  };
};

export const sendErrorResponse = (res: Response, error: unknown, fallback: ErrorFallback = {}) => {
  const { statusCode, body } = buildErrorResponse(error, {
    ...fallback,
    traceId: getTraceId(res, fallback.traceId),
  });

  if (statusCode >= 500) {
    captureBackendException(error, res.req as never);
  }

  return res.status(statusCode).json(body);
};

export { AuthError, NotFoundError, ValidationError };

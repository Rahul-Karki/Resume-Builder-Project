import type { Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError, AuthError, NotFoundError, ValidationError } from "../errors/AppError";

type ErrorFallback = {
  statusCode?: number;
  code?: string;
  message?: string;
};

export type ApiErrorResponse = {
  message: string;
  errorCode: string;
  details?: unknown;
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

  return {
    statusCode: appError.statusCode,
    body: {
      message: appError.expose ? appError.message : (fallback.message ?? "Server error"),
      errorCode: appError.code,
      ...(appError.code === "VALIDATION_ERROR" && appError.details !== undefined
        ? { errors: appError.details }
        : appError.details !== undefined
          ? { details: appError.details }
          : {}),
    },
  };
};

export const sendErrorResponse = (res: Response, error: unknown, fallback: ErrorFallback = {}) => {
  const { statusCode, body } = buildErrorResponse(error, fallback);
  return res.status(statusCode).json(body);
};

export { AuthError, NotFoundError, ValidationError };

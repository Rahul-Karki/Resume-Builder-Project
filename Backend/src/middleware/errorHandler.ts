import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability";
import { buildErrorResponse, toAppError } from "../utils/errorResponse";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(toAppError(new Error(`Route not found: ${req.method} ${req.originalUrl}`), {
    statusCode: 404,
    code: "NOT_FOUND",
    message: "Route not found",
  }));
};

export const errorHandler = (error: unknown, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { statusCode, body } = buildErrorResponse(error, { message: "Server error" });
  const appError = toAppError(error, { message: "Server error" });

  const logPayload = {
    correlationId: req.correlationId,
    method: req.method,
    path: req.originalUrl,
    error: {
      name: appError.name,
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details,
      stack: error instanceof Error ? error.stack : undefined,
    },
  };

  if (statusCode >= 500) {
    logger.error(logPayload, "Unhandled request error");
  } else {
    logger.warn(logPayload, "Request failed");
  }

  res.status(statusCode).json(body);
};

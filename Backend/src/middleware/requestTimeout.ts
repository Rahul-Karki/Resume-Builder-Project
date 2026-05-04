import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const PDF_REQUEST_TIMEOUT_MS = 120_000;
const PDF_TIMEOUT_PATH_MATCHERS = ["/export-pdf"];

export const resolveRequestTimeoutMs = (req: Request) => {
  const path = `${req.baseUrl ?? ""}${req.path ?? req.originalUrl ?? ""}`;
  return PDF_TIMEOUT_PATH_MATCHERS.some((matcher) => path.includes(matcher))
    ? PDF_REQUEST_TIMEOUT_MS
    : DEFAULT_REQUEST_TIMEOUT_MS;
};

export const requestTimeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timeoutMs = resolveRequestTimeoutMs(req);
  const timeoutId = setTimeout(() => {
    if (res.headersSent) {
      return;
    }

    logger.warn({ path: req.originalUrl, timeoutMs }, "Request timed out");
    sendErrorResponse(res, new Error("Request timed out"), {
      statusCode: 503,
      code: "REQUEST_TIMEOUT",
      message: "Request timed out",
    });
  }, timeoutMs);

  res.once("finish", () => clearTimeout(timeoutId));
  res.once("close", () => clearTimeout(timeoutId));

  next();
};

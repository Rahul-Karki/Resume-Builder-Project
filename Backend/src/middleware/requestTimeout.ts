import type { NextFunction, Request, Response } from "express";
import { logger } from "../observability";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const PDF_REQUEST_TIMEOUT_MS = 120_000;
const PDF_TIMEOUT_PATH_MATCHERS = ["/export-pdf", "/export-pdf-safe"];

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
    res.status(503).json({
      message: "Request timed out",
      errorCode: "REQUEST_TIMEOUT",
    });
  }, timeoutMs);

  res.once("finish", () => clearTimeout(timeoutId));
  res.once("close", () => clearTimeout(timeoutId));

  next();
};

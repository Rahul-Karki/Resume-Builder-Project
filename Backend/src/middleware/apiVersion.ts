import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

// Simple API versioning middleware.
// - Reads `accept-version` or `x-api-version` headers (optional)
// - Exposes `res.locals.apiVersion` and sets `X-Service-Version` header
export const apiVersionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const headerVersion = (req.header("x-api-version") || req.header("accept-version") || "").trim();
  const apiVersion = headerVersion || env.SERVICE_VERSION;
  res.locals.apiVersion = apiVersion;
  res.setHeader("X-Service-Version", env.SERVICE_VERSION);
  next();
};

export default apiVersionMiddleware;

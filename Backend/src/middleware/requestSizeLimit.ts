import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const parseSize = (size: string): number => {
  const match = size.match(/^(\d+)(kb|mb|gb|b)?$/i);
  if (!match) return 102400; // 100kb default

  const value = parseInt(match[1], 10);
  const unit = (match[2] || "b").toLowerCase();

  switch (unit) {
    case "gb": return value * 1024 * 1024 * 1024;
    case "mb": return value * 1024 * 1024;
    case "kb": return value * 1024;
    default: return value;
  }
};

const MAX_BODY_SIZE = parseSize(env.REQUEST_BODY_LIMIT);

export const requestSizeLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);

  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({
      ok: false,
      error: `Request body too large. Maximum size is ${MAX_BODY_SIZE} bytes (${env.REQUEST_BODY_LIMIT}).`,
    });
  }

  next();
};

export default requestSizeLimitMiddleware;

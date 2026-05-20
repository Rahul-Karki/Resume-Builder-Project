import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

const MAX_BODY_SIZE = parseInt(env.REQUEST_BODY_LIMIT, 10) || 102400;

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

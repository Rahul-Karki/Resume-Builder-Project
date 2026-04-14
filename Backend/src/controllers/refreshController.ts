import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utils/generateToken";
import { parseCookies } from "../utils/cookieParser";
import { setAccessTokenCookie, setCsrfCookie } from "../utils/authCookies";
import { env } from "../config/env";
import { logger } from "../observability";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";

const refreshAccessToken = (req: Request, res: Response) => {
  const span = startControllerSpan("refresh.refreshAccessToken", req);
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.refreshToken;

  if (!token) {
    logger.warn({ route: req.originalUrl }, "Refresh token missing");
    markSpanError(span, new Error("Refresh token missing"), "Refresh token missing");
    finishControllerSpan(span);
    return res.sendStatus(401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;

    const newAccessToken = generateAccessToken(decoded.userId);
    setAccessTokenCookie(req, res, newAccessToken);
    const csrfToken = setCsrfCookie(req, res);
    logger.info({ userId: decoded.userId }, "Access token refreshed");
    markSpanSuccess(span);
    return res.json({ message: "Token refreshed", csrfToken });
  } catch (error) {
    markSpanError(span, error as Error, "Refresh token verification failed");
    logger.error({ error }, "Failed to refresh access token");
    return res.sendStatus(403);
  } finally {
    finishControllerSpan(span);
  }
};

export { refreshAccessToken };
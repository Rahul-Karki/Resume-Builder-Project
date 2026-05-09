import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utils/generateToken";
import { parseCookies } from "../utils/cookieParser";
import { setAccessTokenCookie, setCsrfCookie } from "../utils/authCookies";
import { env } from "../config/env";
import { logger } from "../observability";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { sendErrorResponse } from "../utils/errorResponse";
import { sendSuccess, sendUnauthorized, sendServerError } from "../utils/apiResponse";

const refreshAccessToken = (req: Request, res: Response) => {
  const span = startControllerSpan("refresh.refreshAccessToken", req);
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.refreshToken;

  if (!token) {
    logger.warn({ route: req.originalUrl }, "Refresh token missing");
    markSpanError(span, new Error("Refresh token missing"), "Refresh token missing");
    finishControllerSpan(span);
    return sendErrorResponse(res, new Error("Authentication required"), { statusCode: 401, code: "AUTH_REQUIRED" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;

    const newAccessToken = generateAccessToken(decoded.userId);
    setAccessTokenCookie(req, res, newAccessToken);
    const csrfToken = setCsrfCookie(req, res);
    logger.info({ userId: decoded.userId }, "Access token refreshed");
    markSpanSuccess(span);
    // Return legacy shape expected by clients/tests: `{ message, csrfToken }`
    return res.status(200).json({ message: "Token refreshed", csrfToken });
  } catch (error) {
    markSpanError(span, error as Error, "Refresh token verification failed");
    logger.error({ error }, "Failed to refresh access token");
    return sendErrorResponse(res, new Error("Invalid refresh token"), { statusCode: 403, code: "AUTH_REQUIRED" });
  } finally {
    finishControllerSpan(span);
  }
};

const issueCsrfToken = (req: Request, res: Response) => {
  const span = startControllerSpan("refresh.issueCsrfToken", req);

  try {
    const csrfToken = setCsrfCookie(req, res);
    markSpanSuccess(span);
    return res.status(200).json({ message: "CSRF token issued", csrfToken });
  } catch (error) {
    markSpanError(span, error as Error, "Failed to issue CSRF token");
    logger.error({ error }, "Failed to issue CSRF token");
    return sendServerError(res, "Failed to issue CSRF token", "SERVER_ERROR");
  } finally {
    finishControllerSpan(span);
  }
};

export { issueCsrfToken, refreshAccessToken };
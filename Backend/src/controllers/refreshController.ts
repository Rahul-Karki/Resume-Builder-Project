import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import { parseCookies } from "../utils/cookieParser";
import { setAuthCookies, setCsrfCookie } from "../utils/authCookies";
import { env } from "../config/env";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
import { sendErrorResponse } from "../utils/errorResponse";
import { blacklistRefreshToken, isTokenBlacklisted } from "../utils/tokenBlacklist";

const refreshAccessToken = wrapController(async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.refreshToken;

  if (!token) {
    logger.warn({ route: req.originalUrl }, "Refresh token missing");
    return sendErrorResponse(res, new Error("Authentication required"), { statusCode: 401, code: "AUTH_REQUIRED" });
  }

  const blacklisted = await isTokenBlacklisted(token, "refresh");
  if (blacklisted) {
    logger.warn({ route: req.originalUrl }, "Refresh token blacklisted");
    return sendErrorResponse(res, new Error("Refresh token has been revoked"), { statusCode: 403, code: "AUTH_REQUIRED" });
  }

  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };

  await blacklistRefreshToken(token);

  const newAccessToken = generateAccessToken(decoded.userId);
  const newRefreshToken = generateRefreshToken(decoded.userId);
  setAuthCookies(req, res, newAccessToken, newRefreshToken);
  logger.info({ userId: decoded.userId }, "Access token refreshed (rotation applied)");
  return res.status(200).json({ message: "Token refreshed" });
}, "refresh.refreshAccessToken");

const issueCsrfToken = wrapController(async (req, res) => {
  setCsrfCookie(req, res);
  return res.status(200).json({ message: "CSRF token issued" });
}, "refresh.issueCsrfToken");

export { issueCsrfToken, refreshAccessToken };

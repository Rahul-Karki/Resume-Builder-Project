import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken, getRefreshKeyPair } from "../utils/generateToken";
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

  // Verify refresh token using HMAC when a secret is configured (supports
  // optional rotation via JWT_REFRESH_SECRET_NEW). Otherwise fall back to RSA.
  let decoded: { userId: string } | null = null;
  const hasHmac = typeof env.JWT_REFRESH_SECRET === "string" && env.JWT_REFRESH_SECRET.trim().length > 0;
  const hasRsa = typeof env.JWT_REFRESH_PUBLIC_KEY === "string" && env.JWT_REFRESH_PUBLIC_KEY.trim().length > 0;

  if (hasHmac) {
    try {
      decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as { userId: string };
    } catch {
      const newSecret = process.env.JWT_REFRESH_SECRET_NEW?.trim();
      if (newSecret && newSecret !== env.JWT_REFRESH_SECRET) {
        try {
          decoded = jwt.verify(token, newSecret, { algorithms: ["HS256"] }) as { userId: string };
        } catch {
          return sendErrorResponse(res, new Error("Invalid refresh token"), { statusCode: 403, code: "AUTH_REQUIRED" });
        }
      } else {
        return sendErrorResponse(res, new Error("Invalid refresh token"), { statusCode: 403, code: "AUTH_REQUIRED" });
      }
    }
  } else if (hasRsa) {
    const keys = getRefreshKeyPair();
    try {
      decoded = jwt.verify(token, keys.publicKey, { algorithms: ["RS256"] }) as { userId: string };
    } catch {
      const oldKey = env.JWT_REFRESH_PUBLIC_KEY_OLD?.trim();
      if (oldKey) {
        try {
          decoded = jwt.verify(token, oldKey, { algorithms: ["RS256"] }) as { userId: string };
        } catch {
          return sendErrorResponse(res, new Error("Invalid refresh token"), { statusCode: 403, code: "AUTH_REQUIRED" });
        }
      } else {
        return sendErrorResponse(res, new Error("Invalid refresh token"), { statusCode: 403, code: "AUTH_REQUIRED" });
      }
    }
  } else {
    return sendErrorResponse(res, new Error("No refresh verification key configured"), { statusCode: 500 });
  }

  await blacklistRefreshToken(token);

  const newAccessToken = generateAccessToken(decoded.userId);
  const newRefreshToken = generateRefreshToken(decoded.userId);
  const csrfToken = setAuthCookies(req, res, newAccessToken, newRefreshToken);
  logger.info({ userId: decoded.userId }, "Access token refreshed (rotation applied)");
  return res.status(200).json({ message: "Token refreshed", csrfToken });
}, "refresh.refreshAccessToken");

const issueCsrfToken = wrapController(async (req, res) => {
  const csrfToken = setCsrfCookie(req, res);
  return res.status(200).json({ message: "CSRF token issued", csrfToken });
}, "refresh.issueCsrfToken");

export { issueCsrfToken, refreshAccessToken };

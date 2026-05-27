import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { parseCookies } from "../utils/cookieParser";
import { env } from "../config/env";
import { logAuthFailure } from "../utils/securityLogger";
import { AuthError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import { getAuditContext } from "../models/plugins/auditTrail";
import { isTokenBlacklisted } from "../utils/tokenBlacklist";
import { memoryCache } from "../utils/memoryCache";
import { getOrGenerateAccessKeys } from "../utils/generateToken";

const AUTH_QUERY_TIMEOUT_MS = 5000;
const AUTH_USER_CACHE_TTL_S = 60;

export async function authenticateUser(
  req: Request,
  res: Response
): Promise<{ id: string; role: string; name: string; email?: string } | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.accessToken;

  if (!token) return null;

  const { publicKey } = getOrGenerateAccessKeys();
  const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as { userId: string };
  const revoked = await isTokenBlacklisted(token, "access");
  if (revoked) return null;

  const cacheKey = `auth-user:${decoded.userId}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    const cachedUser = JSON.parse(cached) as { id: string; role: string; name: string; email?: string };
    const auditCtx = getAuditContext();
    if (auditCtx) {
      auditCtx.userId = cachedUser.id;
      auditCtx.userEmail = cachedUser.email;
    }
    return cachedUser;
  }

  const query = User.findById(decoded.userId)
    .select("name role email")
    .lean();

  const queryPromise = typeof (query as { exec?: () => Promise<unknown> }).exec === "function"
    ? (query as { exec: () => Promise<unknown> }).exec()
    : Promise.resolve(query);

  const user = await Promise.race([
    queryPromise as Promise<unknown>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Auth query timeout")), AUTH_QUERY_TIMEOUT_MS)
    ),
  ]);

  if (!user) return null;

  const u = user as { _id: unknown; role: unknown; name: unknown; email?: unknown };
  const authedUser = {
    id: String(u._id),
    role: String(u.role),
    name: String(u.name),
    email: u.email ? String(u.email) : undefined,
  };

  memoryCache.set(cacheKey, JSON.stringify(authedUser), AUTH_USER_CACHE_TTL_S);

  const auditCtx = getAuditContext();
  if (auditCtx) {
    auditCtx.userId = authedUser.id;
    auditCtx.userEmail = authedUser.email;
  }

  return authedUser;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authenticateUser(req, res);
    if (!user) {
      logAuthFailure(req, "No token provided");
      sendErrorResponse(res, new AuthError("Unauthorized: No token provided", { code: "AUTH_REQUIRED" }));
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof Error && error.message === "Auth query timeout") {
      logAuthFailure(req, "Auth query timeout");
      sendErrorResponse(res, new AuthError("Service temporarily unavailable", { statusCode: 503, code: "AUTH_QUERY_TIMEOUT" }));
      return;
    }
    logAuthFailure(req, "Invalid token");
    sendErrorResponse(res, new AuthError("Unauthorized: Invalid token", { code: "AUTH_REQUIRED" }));
    return;
  }
};
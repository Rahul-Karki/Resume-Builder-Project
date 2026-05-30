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
import { verifyTokenWithRotation } from "../utils/secretsRotation";

const AUTH_QUERY_TIMEOUT_MS = 5000;
const AUTH_USER_CACHE_TTL_S = 60;

export async function authenticateUser(
  req: Request,
  res: Response
): Promise<{ id: string; role: string; name: string; email?: string } | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.accessToken;

  if (!token) return null;

  // Delegate to verification+fetch flow in middleware for sync handling.
  // Here we keep a minimal path that attempts verification using the same
  // strategy as the middleware and then fetches user details.

  let decodedPayload: any = null;
  const hasHmac = typeof env.JWT_ACCESS_SECRET === "string" && env.JWT_ACCESS_SECRET.trim().length > 0;
  const hasRsa = typeof env.JWT_ACCESS_PUBLIC_KEY === "string" && env.JWT_ACCESS_PUBLIC_KEY.trim().length > 0;

  if (hasHmac) {
    decodedPayload = verifyTokenWithRotation(token) as { userId: string } | null;
    if (!decodedPayload) return null;
  } else if (hasRsa) {
    try {
      decodedPayload = jwt.verify(token, env.JWT_ACCESS_PUBLIC_KEY, { algorithms: ["RS256"] }) as { userId: string };
    } catch {
      const oldKey = env.JWT_ACCESS_PUBLIC_KEY_OLD?.trim();
      if (oldKey) {
        try {
          decodedPayload = jwt.verify(token, oldKey, { algorithms: ["RS256"] }) as { userId: string };
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }
  } else {
    return null;
  }

  return await fetchUserById(String(decodedPayload.userId), token);
}

async function fetchUserById(userId: string, token: string | undefined) {
  const revoked = await isTokenBlacklisted(token || "", "access");
  if (revoked) return null;

  const cacheKey = `auth-user:${userId}`;
  const useCache = process.env.NODE_ENV !== "test";
  const cached = useCache ? memoryCache.get(cacheKey) : null;
  if (cached) {
    const cachedUser = JSON.parse(cached) as { id: string; role: string; name: string; email?: string };
    const auditCtx = getAuditContext();
    if (auditCtx) {
      auditCtx.userId = cachedUser.id;
      auditCtx.userEmail = cachedUser.email;
    }
    return cachedUser;
  }

  const query = User.findById(userId)
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
  // Synchronous checks first so tests that call middleware without awaiting
  // still observe immediate 401/403 responses for missing or invalid tokens.
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.accessToken;

  if (!token) {
    logAuthFailure(req, "No token provided");
    sendErrorResponse(res, new AuthError("Unauthorized: No token provided", { code: "AUTH_REQUIRED" }));
    return;
  }

  // Attempt synchronous verification to catch invalid-token errors immediately.
  let decodedPayload: any = null;
  const hasHmac2 = typeof env.JWT_ACCESS_SECRET === "string" && env.JWT_ACCESS_SECRET.trim().length > 0;
  const hasRsa2 = typeof env.JWT_ACCESS_PUBLIC_KEY === "string" && env.JWT_ACCESS_PUBLIC_KEY.trim().length > 0;

  if (hasHmac2) {
    try {
      decodedPayload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as { userId: string };
    } catch {
      const newSecret = process.env.JWT_ACCESS_SECRET_NEW?.trim();
      if (newSecret && newSecret !== env.JWT_ACCESS_SECRET) {
        try {
          decodedPayload = jwt.verify(token, newSecret, { algorithms: ["HS256"] }) as { userId: string };
        } catch {
          logAuthFailure(req, "Invalid token");
          sendErrorResponse(res, new AuthError("Unauthorized: Invalid token", { code: "AUTH_REQUIRED" }));
          return;
        }
      } else {
        logAuthFailure(req, "Invalid token");
        sendErrorResponse(res, new AuthError("Unauthorized: Invalid token", { code: "AUTH_REQUIRED" }));
        return;
      }
    }
  } else if (hasRsa2) {
    try {
      decodedPayload = jwt.verify(token, env.JWT_ACCESS_PUBLIC_KEY, { algorithms: ["RS256"] }) as { userId: string };
    } catch {
      const oldKey = env.JWT_ACCESS_PUBLIC_KEY_OLD?.trim();
      if (oldKey) {
        try {
          decodedPayload = jwt.verify(token, oldKey, { algorithms: ["RS256"] }) as { userId: string };
        } catch {
          logAuthFailure(req, "Invalid token");
          sendErrorResponse(res, new AuthError("Unauthorized: Invalid token", { code: "AUTH_REQUIRED" }));
          return;
        }
      } else {
        logAuthFailure(req, "Invalid token");
        sendErrorResponse(res, new AuthError("Unauthorized: Invalid token", { code: "AUTH_REQUIRED" }));
        return;
      }
    }
  } else {
    logAuthFailure(req, "Invalid token");
    sendErrorResponse(res, new AuthError("Unauthorized: Invalid token", { code: "AUTH_REQUIRED" }));
    return;
  }

  // At this point token is syntactically valid — fetch user details (async)
  try {
    const user = await fetchUserById(String(decodedPayload.userId), token);
    if (!user) {
      logAuthFailure(req, "User not found");
      sendErrorResponse(res, new AuthError("Unauthorized: User not found", { code: "AUTH_REQUIRED" }));
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
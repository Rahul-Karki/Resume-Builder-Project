import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { parseCookies } from "../utils/cookieParser";
import { env } from "../config/env";
import { logAuthFailure } from "../utils/securityLogger";
import { AuthError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import { getAuditContext } from "../models/plugins/auditTrail";

const JWT_SECRET = env.JWT_ACCESS_SECRET;
const AUTH_QUERY_TIMEOUT_MS = 5000; // 5 second timeout for auth queries

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.accessToken;

    // Check if token exists
    if (!token) {
      logAuthFailure(req, "No token provided");
      sendErrorResponse(res, new AuthError("Unauthorized: No token provided", { code: "AUTH_REQUIRED" }));
      return;
    }

    // Verify token and attach current user
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Query with timeout to prevent hanging requests; cancel the query on timeout
    const query = User.findById(decoded.userId)
      .select("name role email")
      .lean();

    const queryPromise = typeof (query as { exec?: () => Promise<unknown>; cancel?: () => void }).exec === "function"
      ? (query as { exec: () => Promise<unknown>; cancel?: () => void }).exec()
      : Promise.resolve(query);

    const timeoutId = setTimeout(() => {
      const cancelable = query as { cancel?: () => void };
      if (typeof cancelable.cancel === "function") {
        cancelable.cancel();
      }
    }, AUTH_QUERY_TIMEOUT_MS);

    const user = await Promise.race([
      queryPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth query timeout")), AUTH_QUERY_TIMEOUT_MS)
      ),
    ]).finally(() => clearTimeout(timeoutId));

    if (!user) {
      logAuthFailure(req, "User not found");
      sendErrorResponse(res, new AuthError("Unauthorized: User not found", { code: "AUTH_REQUIRED" }));
      return;
    }

    const authenticatedUser = user as { _id: unknown; role: unknown; name: unknown; email?: unknown };

    req.user = {
      id: String(authenticatedUser._id),
      role: String(authenticatedUser.role),
      name: String(authenticatedUser.name),
      email: authenticatedUser.email ? String(authenticatedUser.email) : undefined,
    };

    const auditContext = getAuditContext();
    if (auditContext) {
      auditContext.userId = req.user.id;
      auditContext.userEmail = req.user.email;
    }

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
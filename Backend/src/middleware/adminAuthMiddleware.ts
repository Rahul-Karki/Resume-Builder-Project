import { Request, Response, NextFunction } from "express";
import { AuthError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import { authenticateUser } from "./authMiddleware";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id:   string;
        role: string;
        name: string;
        email?: string;
      };
    }
  }
}

// ─── Middleware: authenticate any logged-in user (uses shared cache-enabled auth) ─

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authenticateUser(req, res);
    if (!user) {
      return sendErrorResponse(res, new AuthError("Authentication required.", { code: "AUTH_REQUIRED" }));
    }
    req.user = user;
    next();
  } catch (err) {
    return sendErrorResponse(res, new AuthError("Invalid or expired token.", { code: "AUTH_REQUIRED" }));
  }
}

// ─── Middleware: require admin or superadmin ──────────────────────────────────

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendErrorResponse(res, new AuthError("Authentication required.", { code: "AUTH_REQUIRED" }));
  }
  if (!["admin", "superadmin"].includes(req.user.role)) {
    return sendErrorResponse(res, new AuthError("Admin access required.", {
      statusCode: 403,
      code: "FORBIDDEN",
      details: { hint: "Your account does not have admin privileges." },
    }));
  }
  next();
}

// ─── Middleware: require superadmin only (e.g. delete templates) ──────────────

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "superadmin") {
    return sendErrorResponse(res, new AuthError("Superadmin access required.", { statusCode: 403, code: "FORBIDDEN" }));
  }
  next();
}

// ─── Composed guard: authenticate + requireAdmin ──────────────────────────────
// Usage: router.get('/templates', adminGuard, controller)

export const adminGuard = [authenticate, requireAdmin];
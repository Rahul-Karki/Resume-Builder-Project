import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";   // your existing User model
import { parseCookies } from "../utils/cookieParser";
import { env } from "../config/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId?: string;
  id?: string;
  role?: "user" | "admin" | "superadmin";
  iat:  number;
  exp:  number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id:   string;
        role: string;
        name: string;
      };
    }
  }
}

// ─── Extract token helper ─────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  return cookies.accessToken ?? null;
}

// ─── Middleware: authenticate any logged-in user ──────────────────────────────

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const userId = payload.userId ?? payload.id;

    if (!userId) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    const user = await User.findById(userId).select("name role").lean();

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = { id: String(user._id), role: user.role, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// ─── Middleware: require admin or superadmin ──────────────────────────────────

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (!["admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      error: "Admin access required.",
      hint:  "Your account does not have admin privileges.",
    });
  }
  next();
}

// ─── Middleware: require superadmin only (e.g. delete templates) ──────────────

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Superadmin access required." });
  }
  next();
}

// ─── Composed guard: authenticate + requireAdmin ──────────────────────────────
// Usage: router.get('/templates', adminGuard, controller)

export const adminGuard = [authenticate, requireAdmin];
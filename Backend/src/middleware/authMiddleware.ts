import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { parseCookies } from "../utils/cookieParser";
import { env } from "../config/env";
import { logAuthFailure } from "../utils/securityLogger";

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
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    // Verify token and attach current user
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Query with timeout to prevent hanging requests
    const user = await Promise.race([
      User.findById(decoded.userId)
        .select("name role")
        .lean()
        .exec(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Auth query timeout")), AUTH_QUERY_TIMEOUT_MS)
      ),
    ]);

    if (!user) {
      logAuthFailure(req, "User not found");
      res.status(401).json({ message: "Unauthorized: User not found" });
      return;
    }

    req.user = {
      id: String(user._id),
      role: String(user.role),
      name: String(user.name),
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.message === "Auth query timeout") {
      logAuthFailure(req, "Auth query timeout");
      res.status(503).json({ message: "Service temporarily unavailable" });
      return;
    }
    logAuthFailure(req, "Invalid token");
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
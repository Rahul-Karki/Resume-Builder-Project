import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { parseCookies } from "../utils/cookieParser";
import { env } from "../config/env";

const JWT_SECRET = env.JWT_ACCESS_SECRET;

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.accessToken;

    // Check if token exists
    if (!token) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    // Verify token and attach current user
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    User.findById(decoded.userId)
      .select("name role")
      .lean()
      .then((user) => {
        if (!user) {
          res.status(401).json({ message: "Unauthorized: User not found" });
          return;
        }

        req.user = {
          id: String(user._id),
          role: String(user.role),
          name: String(user.name),
        };

        next();
      })
      .catch(() => {
        res.status(500).json({ message: "Server error" });
      });
  } catch (error) {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
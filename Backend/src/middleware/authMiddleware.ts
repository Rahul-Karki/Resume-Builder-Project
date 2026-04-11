import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!JWT_SECRET) {
      res.status(500).json({ message: "Server misconfigured" });
      return;
    }

    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    // Extract token
    const token = authHeader.split(" ")[1];

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
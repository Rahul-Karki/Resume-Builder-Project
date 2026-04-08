import { RequestHandler } from "express";
import { AuthRequest, authMiddleware } from "./authMiddleware";
import { UserRole } from "../enums/userRole";

export const adminAuthMiddleware: RequestHandler = async (req, res, next) => {
  await authMiddleware(req, res, async () => {
    const authReq = req as AuthRequest;

    if (authReq.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    next();
  });
};

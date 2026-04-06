import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { userId: string };
}

const authMiddleware: RequestHandler = (
  req,
  res: Response,
  next: NextFunction,
) : void => {
  try {
    const authReq = req as AuthRequest;
    const authHeader = authReq.headers.authorization;

    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

    if (!token) {
      res.status(401).json({
        message: "Access token missing",
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string,
    ) as { userId: string };

    authReq.user = decoded;

    next();
  } catch (error) {
    res.status(403).json({
      message: "Invalid access token",
    });
    return;
  }
};

export { authMiddleware };

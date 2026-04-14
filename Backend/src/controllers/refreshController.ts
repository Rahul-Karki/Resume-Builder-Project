import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utils/generateToken";
import { parseCookies } from "../utils/cookieParser";
import { setAccessTokenCookie, setCsrfCookie } from "../utils/authCookies";
import { env } from "../config/env";

const refreshAccessToken = (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.refreshToken;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;

    const newAccessToken = generateAccessToken(decoded.userId);
    setAccessTokenCookie(req, res, newAccessToken);
    setCsrfCookie(req, res);
    return res.json({ message: "Token refreshed" });
  } catch {
    return res.sendStatus(403);
  }
};

export { refreshAccessToken };
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { generateAccessToken } from "../utils/generateToken";
import { parseCookies } from "../utils/cookieParser";

const isProduction = process.env.NODE_ENV === "production";
const cookieSameSite = isProduction ? "none" : "lax";

const cookieBaseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite as "lax" | "none",
  path: "/",
};

const refreshAccessToken = (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.refreshToken;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;

    const newAccessToken = generateAccessToken(decoded.userId);

    res.cookie("accessToken", newAccessToken, {
      ...cookieBaseOptions,
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ message: "Token refreshed", accessToken: newAccessToken });
  } catch {
    return res.sendStatus(403);
  }
};

export { refreshAccessToken };
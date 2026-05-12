import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../config/env";

const isProduction = env.NODE_ENV === "production";

const isHttpsRequest = (req: Request) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isForwardedHttps = typeof forwardedProto === "string"
    ? forwardedProto.split(",")[0]?.trim() === "https"
    : Array.isArray(forwardedProto)
      ? forwardedProto[0] === "https"
      : false;

  return req.secure || isForwardedHttps;
};

const getBaseCookieOptions = (req: Request) => {
  const secure = isProduction && isHttpsRequest(req);
  return {
    secure,
    sameSite: (secure ? "none" : "lax") as "lax" | "none",
    path: "/",
  };
};

const getAuthCookieOptions = (req: Request) => ({
  ...getBaseCookieOptions(req),
  httpOnly: true,
});

const getCsrfCookieOptions = (req: Request) => ({
  ...getBaseCookieOptions(req),
  httpOnly: true, // HttpOnly to prevent XSS from reading the token
});

const createCsrfToken = () => crypto.randomBytes(32).toString("hex");

const setCsrfCookie = (req: Request, res: Response) => {
  const csrfToken = createCsrfToken();
  res.cookie("csrfToken", csrfToken, {
    ...getCsrfCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
};

const setAccessTokenCookie = (req: Request, res: Response, accessToken: string) => {
  res.cookie("accessToken", accessToken, {
    ...getAuthCookieOptions(req),
    maxAge: 15 * 60 * 1000,
  });
};

const setAuthCookies = (req: Request, res: Response, accessToken: string, refreshToken: string) => {
  setAccessTokenCookie(req, res, accessToken);

  res.cookie("refreshToken", refreshToken, {
    ...getAuthCookieOptions(req),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return setCsrfCookie(req, res);
};

const clearAuthCookies = (req: Request, res: Response) => {
  const authCookieOptions = getAuthCookieOptions(req);
  const csrfCookieOptions = getCsrfCookieOptions(req);

  res.clearCookie("accessToken", authCookieOptions);
  res.clearCookie("refreshToken", authCookieOptions);
  res.clearCookie("csrfToken", csrfCookieOptions);
};

export { clearAuthCookies, setAccessTokenCookie, setAuthCookies, setCsrfCookie };
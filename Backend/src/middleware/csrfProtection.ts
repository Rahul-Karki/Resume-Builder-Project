import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { parseCookies } from "../utils/cookieParser";
import { logCsrfFailure } from "../utils/securityLogger";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set([
  "/api/refresh",
  "/api/csrf",
  "/api/auth/signup",
  "/api/auth/login",
  "/api/auth/google-login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend",
  "/api/auth/logout",
]);

const secureCompare = (a: string, b: string) => {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) return false;
  return crypto.timingSafeEqual(first, second);
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const csrfCookie = cookies.csrfToken;
  const csrfHeader = req.header("x-csrf-token");

  if (!csrfCookie || !csrfHeader || !secureCompare(csrfCookie, csrfHeader)) {
    logCsrfFailure(req);
    return res.status(403).json({
      message: "CSRF validation failed",
      errorCode: "CSRF_VALIDATION_FAILED",
    });
  }

  return next();
};
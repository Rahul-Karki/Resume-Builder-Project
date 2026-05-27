import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import hashToken from "../utils/hashToken";
import ResetToken from "../models/ResetToken";
import { sendEmail } from "../utils/sendEmail";
import { verifyGoogleToken } from "../utils/google";
import crypto from "crypto";
import { UserRole } from "../enums/userRole";
import { clearAuthCookies, setAuthCookies } from "../utils/authCookies";
import { env } from "../config/env";
import { logger } from "../observability";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { logLoginAttempt, logLogout, logSuspiciousActivity } from "../utils/securityLogger";
import { AppError, AuthError, NotFoundError, ValidationError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import {
  recordUserSignup,
  recordLogin,
  recordLoginFailure,
  recordSuspiciousActivity,
} from "../utils/businessMetrics";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { blacklistRefreshToken, blacklistAccessToken } from "../utils/tokenBlacklist";
import { parseCookies } from "../utils/cookieParser";

const BCRYPT_SALT_ROUNDS = 10;
const COOLDOWN_AFTER_RESET = 5 * 60 * 1000; // 5 min
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 sec
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 min
const MAX_RESET_RESEND_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min
const frontendBaseUrl = env.FRONTEND_URL;

const getAuthProviders = (user: { authProvider?: string[] }) => Array.isArray(user.authProvider) ? user.authProvider : [];

const hasLinkedProvider = (user: { authProvider?: string[] }, provider: "local" | "google") => getAuthProviders(user).includes(provider);

const logout = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.logout", req);
  try {
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken = cookies.refreshToken;
    const accessToken = cookies.accessToken;

    if (refreshToken) {
      await blacklistRefreshToken(refreshToken);
    }
    if (accessToken) {
      await blacklistAccessToken(accessToken);
    }

    clearAuthCookies(req, res);
    logLogout(req);
    logger.info({ route: req.originalUrl, hadRefresh: !!refreshToken }, "User logged out with token blacklist");
    markSpanSuccess(span);
    return sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    markSpanError(span, error as Error, "Logout failed");
    logger.error({ error }, "Logout failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Logout failed" });
  } finally {
    finishControllerSpan(span);
  }
};

const registerUser = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.registerUser", req);
  try {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      logger.warn({ route: req.originalUrl }, "Register validation failed");
      return sendErrorResponse(res, new ValidationError("All mandatory fields are required"));
    }

    const check = await User.findOne({ email });

    if (check) {
      logger.warn({ email }, "Register rejected because user exists");
      return sendErrorResponse(res, new AuthError("An account with this email already exists", { statusCode: 409, code: "CONFLICT" }));
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: UserRole.USER,
      authProvider: ["local"],
    });

    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

    recordUserSignup({ email: user.email, provider: "local" });

    logger.info({ userId: user._id.toString(), email: user.email }, "User registered");
    markSpanSuccess(span);
    
    return sendCreated(res, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    }, csrfToken);

  } catch (error) {
    markSpanError(span, error as Error, "User registration failed");
    logger.error({ error }, "User registration failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Registration failed" });
  } finally {
    finishControllerSpan(span);
  }
};
const login = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.login", req);
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      logger.warn({ route: req.originalUrl }, "Login validation failed");
      recordSuspiciousActivity("login_missing_credentials");
      logSuspiciousActivity(req, "Login without email or password");
      return sendErrorResponse(res, new ValidationError("Email and password are required"));
    }

    // 2. Find user
    const user = await User.findOne({ email }).select("+password +loginAttempts +lockUntil");

    if (!user) {
      logger.warn({ email }, "Login failed: unknown user");
      recordLoginFailure("user_not_found");
      logLoginAttempt(req, email, false, "User not found");
      return sendErrorResponse(res, new AuthError("Invalid email or password", { code: "INVALID_CREDENTIALS" }));
    }

    // 3. Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      logger.warn({ email, remainingMin }, "Login blocked: account locked");
      recordLoginFailure("account_locked");
      logLoginAttempt(req, email, false, "Account locked");
      return sendErrorResponse(res, new Error(`Account locked. Try again in ${remainingMin} minute(s).`), {
        statusCode: 429,
        code: "ACCOUNT_LOCKED",
        message: `Account locked. Try again in ${remainingMin} minute(s).`,
      });
    }

    if (!user.password) {
      logger.warn({ email }, "Login failed: password not set for account");
      recordLoginFailure("no_password");
      logLoginAttempt(req, email, false, "No password set");
      return sendErrorResponse(res, new AuthError("This account does not have a password. Please login using Google.", { statusCode: 400, code: "AUTH_REQUIRED" }));
    }

    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password!);

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS);
        user.loginAttempts = 0;
        logger.warn({ email, lockoutDurationMin: LOGIN_LOCKOUT_DURATION_MS / 60000 }, "Account locked due to too many failed attempts");
      }
      await user.save();
      logger.warn({ email, attempts: user.loginAttempts }, "Login failed: invalid password");
      recordLoginFailure("invalid_password");
      logLoginAttempt(req, email, false, "Invalid password");
      return sendErrorResponse(res, new AuthError("Invalid email or password", { code: "INVALID_CREDENTIALS" }));
    }

    // 5. Ensure local is in authProvider
    if (!Array.isArray(user.authProvider)) {
      user.authProvider = [];
    }
    if (!user.authProvider.includes("local")) {
      user.authProvider.push("local");
    }

    // 6. Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // 7. Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

    recordLogin({ email: user.email });
    logLoginAttempt(req, email, true);
    logger.info({ userId: user._id.toString(), email: user.email }, "User login successful");
    markSpanSuccess(span);

    // 8. Send response
    return sendSuccess(res, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }, 200, csrfToken);

  } catch (error) {
    markSpanError(span, error as Error, "Login failed");
    logger.error({ error }, "Login failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Login failed" });
  } finally {
    finishControllerSpan(span);
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.forgotPassword", req);

  try {
    const rawEmail = String(req.body?.email ?? "").trim().toLowerCase();
    const email = rawEmail;

    if (!email) {
      logger.warn({ route: req.originalUrl }, "Forgot password missing email");
      return sendErrorResponse(res, new ValidationError("Please provide an email"));
    }

    const user = await User.findOne({ email });

    // Always return the same message regardless of whether the user exists
    // to prevent email enumeration attacks
    if (!user) {
      logger.warn({ email }, "Forgot password user not found");
      return sendSuccess(res, {
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const isGoogleOnlyUser =
      Array.isArray(user.authProvider) &&
      user.authProvider.includes("google") &&
      !user.authProvider.includes("local");

    if (isGoogleOnlyUser && !user.password) {
      logger.warn({ email }, "Forgot password blocked for google-only account");
      return sendErrorResponse(res, new AuthError("This account uses Google login. Please continue with Google.", { statusCode: 400, code: "AUTH_REQUIRED" }));
    }


    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() < COOLDOWN_AFTER_RESET
    ) {
      return sendErrorResponse(res, new AppError("Password was recently updated. Try again later.", { statusCode: 429, code: "RATE_LIMITED" }));
    }

    const existingToken = await ResetToken.findOne({ userId: user._id });

    if (
      existingToken &&
      Date.now() - existingToken.lastSeenAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return sendErrorResponse(res, new AppError("Please wait before requesting another reset email", {
        statusCode: 429,
        code: "RATE_LIMITED",
        details: { retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existingToken.lastSeenAt.getTime())) / 1000) },
      }));
    }

    if (existingToken && existingToken.resendCount >= MAX_RESET_RESEND_ATTEMPTS) {
      return sendErrorResponse(res, new AppError("Maximum resend attempts reached, please try again later", { statusCode: 429, code: "RATE_LIMITED" }));
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken);

    if (existingToken) {
      existingToken.token = hashed;
      existingToken.expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      existingToken.resendCount += 1;
      existingToken.lastSeenAt = new Date();
      await existingToken.save();
    } else {
      await ResetToken.create({
        userId: user._id,
        token: hashed,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        resendCount: 0,
        lastSeenAt: new Date(),
      });
    }

    const link = `${frontendBaseUrl}/reset-password?token=${rawToken}`;

    await sendEmail(user.email, link);

    sendSuccess(res, {
      message: "Password reset link sent to email",
    });
    logger.info({ userId: user._id.toString(), email: user.email }, "Password reset link sent");
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Forgot password failed");
    logger.error({ error }, "Forgot password failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
}

const resetPassword = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.resetPassword", req);
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      logger.warn({ route: req.originalUrl }, "Reset password validation failed");
      return sendErrorResponse(res, new ValidationError("Please provide all required fields"));
    }

    if (password !== confirmPassword) {
      logger.warn({ route: req.originalUrl }, "Reset password mismatch");
      return sendErrorResponse(res, new ValidationError("Passwords do not match"));
    }


    const hashed = hashToken(token);

    const record = await ResetToken.findOne({
      token: hashed,
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      logger.warn({ route: req.originalUrl }, "Reset password token invalid or expired");
      return sendErrorResponse(res, new ValidationError("Invalid or expired token"));
    }

    const user = await User.findById(record.userId);

    if (!user) {
      logger.warn({ route: req.originalUrl }, "Reset password user not found");
      return sendErrorResponse(res, new ValidationError("Invalid or expired reset token"));
    }

    user.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    user.passwordResetAt = new Date();
    await user.save();

    await ResetToken.deleteMany({ userId: user._id }); // remove all tokens for user

    sendSuccess(res, {
      message: "Password reset successful",
    });
    logger.info({ userId: user._id.toString() }, "Password reset successful");
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Reset password failed");
    logger.error({ error }, "Reset password failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

const resendResetLink = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.resendResetLink", req);
  try {
    const rawEmail = String(req.body?.email ?? "").trim().toLowerCase();
    const email = rawEmail;

    if (!email) {
      logger.warn({ route: req.originalUrl }, "Resend reset link missing email");
      return sendErrorResponse(res, new ValidationError("Please provide an email"));
    }

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn({ email }, "Resend reset link user not found");
      return sendSuccess(res, {
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const isGoogleOnlyUser =
      Array.isArray(user.authProvider) &&
      user.authProvider.includes("google") &&
      !user.authProvider.includes("local");

    if (isGoogleOnlyUser && !user.password) {
      logger.warn({ email }, "Resend reset blocked for google-only account");
      return sendErrorResponse(res, new AuthError("This account uses Google login. Please continue with Google.", { statusCode: 400, code: "AUTH_REQUIRED" }));
    }

    const existingToken = await ResetToken.findOne({
      userId: user._id,
      expiresAt: { $gt: new Date() },
    });

    if (!existingToken) {
      return sendErrorResponse(res, new ValidationError("No reset request found, please initiate forgot password again"));
    }

    if (existingToken.resendCount >= MAX_RESET_RESEND_ATTEMPTS) {
      return sendErrorResponse(res, new AppError("Maximum resend attempts reached, please try again later", { statusCode: 429, code: "RATE_LIMITED" }));
    }

    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() < COOLDOWN_AFTER_RESET
    ) {
      return sendErrorResponse(res, new AppError("Password was recently updated. Try again later.", { statusCode: 429, code: "RATE_LIMITED" }));
    }

    if (Date.now() - existingToken.lastSeenAt.getTime() < RESEND_COOLDOWN_MS) {
      return sendErrorResponse(res, new AppError("Please wait before requesting another reset email", {
        statusCode: 429,
        code: "RATE_LIMITED",
        details: { retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existingToken.lastSeenAt.getTime())) / 1000) },
      }));
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = hashToken(rawToken);

    existingToken.token = hashed;
    existingToken.expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    existingToken.resendCount += 1;
    existingToken.lastSeenAt = new Date(Date.now());

    await existingToken.save();

    const link = `${frontendBaseUrl}/reset-password?token=${rawToken}`;
    await sendEmail(user.email, link);

    sendSuccess(res, {
      message: "Password reset link resent to email",
    });
    logger.info({ userId: user._id.toString(), email: user.email }, "Password reset link resent");
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Resend reset link failed");
    logger.error({ error }, "Resend reset link failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

const googleLogin = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.googleLogin", req);
  try {
    const { token } = req.body;

    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email) {
      logger.warn({ route: req.originalUrl }, "Google login token invalid");
      return sendErrorResponse(res, new ValidationError("Invalid Google token"));
    }

    // 🔍 Find or create user
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
        googleId: payload.sub,
        authProvider: ["google"],
      });
    } else if (user.googleId && user.googleId !== payload.sub) {
      logger.warn({ email: payload.email, userId: user._id.toString() }, "Google login blocked due to mismatched linked account");
      return sendErrorResponse(res, new AuthError("This Google account is already linked to a different profile.", {
        statusCode: 409,
        code: "OAUTH_LINK_CONFIRMATION_REQUIRED",
      }));
    } else if (!hasLinkedProvider(user, "google")) {
      logger.warn({ email: payload.email, userId: user._id.toString() }, "Google login requires explicit link confirmation");
      return sendErrorResponse(res, new AuthError("This account already uses a password. Link Google after confirming your password.", {
        statusCode: 409,
        code: "OAUTH_LINK_CONFIRMATION_REQUIRED",
      }));
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    // 🔑 Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

    logger.info({ userId: user._id.toString(), email: user.email }, "Google login successful");
    markSpanSuccess(span);
    return sendSuccess(res, {
      csrfToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Google login successful",
    });
  } catch (error) {
    markSpanError(span, error as Error, "Google login failed");
    logger.error({ error }, "Google login failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

const linkGoogleAccount = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.linkGoogleAccount", req);

  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendErrorResponse(res, new AuthError("Authentication required", { code: "AUTH_REQUIRED" }));
    }

    const { token, password } = req.body;
    const payload = await verifyGoogleToken(token);

    if (!payload?.email || !payload.sub) {
      return sendErrorResponse(res, new AuthError("Invalid Google token", { statusCode: 400, code: "VALIDATION_ERROR" }));
    }

    const user = await User.findById(userId).select("+password name email authProvider googleId role avatar");
    if (!user) {
      return sendErrorResponse(res, new NotFoundError("User not found"));
    }

    if (String(user.email).toLowerCase() !== String(payload.email).toLowerCase()) {
      return sendErrorResponse(res, new AuthError("Google account email must match the signed-in account.", {
        statusCode: 400,
        code: "OAUTH_LINK_CONFIRMATION_REQUIRED",
      }));
    }

    if (!user.password) {
      return sendErrorResponse(res, new AuthError("Password confirmation is required to link Google.", {
        statusCode: 403,
        code: "AUTH_REQUIRED",
      }));
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return sendErrorResponse(res, new AuthError("Invalid password confirmation.", {
        statusCode: 401,
        code: "AUTH_REQUIRED",
      }));
    }

    user.googleId = payload.sub;
    user.authProvider = Array.from(new Set([...(Array.isArray(user.authProvider) ? user.authProvider : []), "google"]));
    await user.save();

    logger.info({ userId: user._id.toString(), email: user.email }, "Google provider linked");
    markSpanSuccess(span);
    return sendSuccess(res, {
      message: "Google account linked successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    markSpanError(span, error as Error, "Link Google account failed");
    logger.error({ error }, "Link Google account failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

const unlinkOAuthProvider = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.unlinkOAuthProvider", req);

  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendErrorResponse(res, new AuthError("Authentication required", { code: "AUTH_REQUIRED" }));
    }

    const { provider, password } = req.body;
    const user = await User.findById(userId).select("+password name email authProvider googleId role avatar");

    if (!user) {
      return sendErrorResponse(res, new NotFoundError("User not found"));
    }

    if (!user.password) {
      return sendErrorResponse(res, new AuthError("Password confirmation is required to unlink providers.", {
        statusCode: 403,
        code: "AUTH_REQUIRED",
      }));
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return sendErrorResponse(res, new AuthError("Invalid password confirmation.", {
        statusCode: 401,
        code: "AUTH_REQUIRED",
      }));
    }

    const nextProviders = getAuthProviders(user).filter((entry) => entry !== provider);

    if (nextProviders.length === 0) {
      return sendErrorResponse(res, new AuthError("At least one sign-in provider must remain linked.", {
        statusCode: 409,
        code: "OAUTH_LINK_CONFIRMATION_REQUIRED",
      }));
    }

    user.authProvider = nextProviders;
    if (provider === "google") {
      user.googleId = undefined;
    }

    await user.save();
    logger.info({ userId: user._id.toString(), provider }, "OAuth provider unlinked");
    markSpanSuccess(span);
    return sendSuccess(res, {
      message: "OAuth provider unlinked successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    markSpanError(span, error as Error, "Unlink OAuth provider failed");
    logger.error({ error }, "Unlink OAuth provider failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};

const getCurrentUser = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.getCurrentUser", req);
  try {
    const userId = req.user?.id;

    if (!userId) {
      logger.warn({ route: req.originalUrl }, "Get current user unauthorized");
      return sendErrorResponse(res, new AuthError("Authentication required"));
    }

    const user = await User.findById(userId).select("name email avatar role authProvider aiCreditsRemaining aiCreditsResetAt aiCreditsPlan");

    if (!user) {
      logger.warn({ userId }, "Get current user not found");
      return sendErrorResponse(res, new NotFoundError("User not found"));
    }

    logger.info({ userId }, "Current user fetched");
    markSpanSuccess(span);
    return sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.name?.trim()?.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "ME",
        role: user.role,
        aiCredits: {
          remaining: user.aiCreditsRemaining ?? 0,
          resetAt: user.aiCreditsResetAt,
          plan: user.aiCreditsPlan ?? "free",
        },
      },
    });
  } catch (error) {
    markSpanError(span, error as Error, "Get current user failed");
    logger.error({ error }, "Get current user failed");
    return sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};
  

export { registerUser, login, forgotPassword, resetPassword, resendResetLink , googleLogin, linkGoogleAccount, unlinkOAuthProvider, getCurrentUser, logout };

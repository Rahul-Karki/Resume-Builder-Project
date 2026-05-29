import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import hashToken from "../utils/hashToken";
import ResetToken from "../models/ResetToken";
import { sendEmail } from "../utils/sendEmail";
import { sendVerificationEmail } from "../utils/sendEmail";
import { verifyGoogleToken } from "../utils/google";
import crypto from "crypto";
import { UserRole } from "../enums/userRole";
import { clearAuthCookies, setAuthCookies } from "../utils/authCookies";
import { env } from "../config/env";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
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
const COOLDOWN_AFTER_RESET = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_RESET_RESEND_ATTEMPTS = 3;
const MAX_RESET_PER_DAY = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
const frontendBaseUrl = env.FRONTEND_URL;

const getAuthProviders = (user: { authProvider?: string[] }) =>
  Array.isArray(user.authProvider) ? user.authProvider : [];

const hasLinkedProvider = (user: { authProvider?: string[] }, provider: "local" | "google") =>
  getAuthProviders(user).includes(provider);

const validatePasswordStrength = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must contain uppercase, lowercase, and a number";
  }
  return null;
};

const logout = wrapController(async (req, res) => {
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
  return sendSuccess(res, { message: "Logged out successfully" });
}, "auth.logout");

const registerUser = wrapController(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !password || !email) {
    logger.warn({ route: req.originalUrl }, "Register validation failed");
    return sendErrorResponse(res, new ValidationError("All mandatory fields are required"));
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return sendErrorResponse(res, new ValidationError(passwordError));
  }

  const check = await User.findOne({ email });

  if (check) {
    logger.warn({ email }, "Register rejected because user exists");
    return sendErrorResponse(res, new AuthError("An account with this email already exists", { statusCode: 409, code: "CONFLICT" }));
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = new User({
    name,
    email,
    password: hashedPassword,
    role: UserRole.USER,
    authProvider: ["local"],
    emailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await user.save();

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (err) {
    logger.warn({ email: user.email, error: err }, "Failed to send verification email");
  }

  recordUserSignup({ email: user.email, provider: "local" });

  logger.info({ userId: user._id.toString(), email: user.email }, "User registered - verification required");

  return sendCreated(res, {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: false,
    }
  });
}, "auth.registerUser");

const verifyEmail = wrapController(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return sendErrorResponse(res, new ValidationError("Verification token is required"));
  }

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    return sendErrorResponse(res, new ValidationError("Invalid or expired verification token"));
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpires = undefined;
  await user.save({ validateModifiedOnly: true });

  logger.info({ userId: user._id.toString(), email: user.email }, "Email verified");

  sendSuccess(res, {
    message: "Email verified successfully",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: true,
    },
  });
}, "auth.verifyEmail");

const resendVerificationEmail = wrapController(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendErrorResponse(res, new ValidationError("Email is required"));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return sendErrorResponse(res, new NotFoundError("User not found"));
  }

  if (user.emailVerified) {
    return sendSuccess(res, { message: "Email is already verified" });
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = verificationToken;
  user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save({ validateModifiedOnly: true });

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (err) {
    logger.warn({ email: user.email, error: err }, "Failed to resend verification email");
    return sendErrorResponse(res, new AppError("Failed to send verification email", { statusCode: 500, code: "EMAIL_FAILED" }));
  }

  logger.info({ userId: user._id.toString(), email: user.email }, "Verification email resent");

  sendSuccess(res, { message: "Verification email sent" });
}, "auth.resendVerificationEmail");

const login = wrapController(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    logger.warn({ route: req.originalUrl }, "Login validation failed");
    recordSuspiciousActivity("login_missing_credentials");
    logSuspiciousActivity(req, "Login without email or password");
    return sendErrorResponse(res, new ValidationError("Email and password are required"));
  }

  // Atomic: find user and increment loginAttempts, check lockout
  const user = await User.findOne({ email }).select("+password +loginAttempts +lockUntil");

  if (!user) {
    logger.warn({ email }, "Login failed: unknown user");
    recordLoginFailure("user_not_found");
    logLoginAttempt(req, email, false, "User not found");
    return sendErrorResponse(res, new AuthError("Invalid email or password", { code: "INVALID_CREDENTIALS" }));
  }

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

  const isMatch = await bcrypt.compare(password, user.password!);

  if (!isMatch) {
    // Atomic increment to prevent race conditions
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, lockUntil: { $lte: new Date() }, loginAttempts: { $lt: MAX_LOGIN_ATTEMPTS - 1 } },
      { $inc: { loginAttempts: 1 } },
      { new: true, select: "loginAttempts lockUntil" }
    );

    // If no document matched, loginAttempts crossed threshold — lock the account
    if (!updatedUser) {
      await User.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            lockUntil: new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS),
            loginAttempts: 0,
          },
        }
      );
      logger.warn({ email, lockoutDurationMin: LOGIN_LOCKOUT_DURATION_MS / 60000 }, "Account locked due to too many failed attempts");
    }

    logger.warn({ email }, "Login failed: invalid password");
    recordLoginFailure("invalid_password");
    logLoginAttempt(req, email, false, "Invalid password");
    return sendErrorResponse(res, new AuthError("Invalid email or password", { code: "INVALID_CREDENTIALS" }));
  }

  if (!Array.isArray(user.authProvider)) {
    user.authProvider = [];
  }
  if (!user.authProvider.includes("local")) {
    user.authProvider.push("local");
  }

  user.loginAttempts = 0;
  user.lockUntil = null;
  await user.save({ validateModifiedOnly: true });

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

  recordLogin({ email: user.email });
  logLoginAttempt(req, email, true);
  logger.info({ userId: user._id.toString(), email: user.email }, "User login successful");

  return sendSuccess(res, {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified ?? false,
    },
  }, 200, csrfToken);
}, "auth.login");

const forgotPassword = wrapController(async (req, res) => {
  const rawEmail = String(req.body?.email ?? "").trim().toLowerCase();
  const email = rawEmail;

  if (!email) {
    logger.warn({ route: req.originalUrl }, "Forgot password missing email");
    return sendErrorResponse(res, new ValidationError("Please provide an email"));
  }

  const user = await User.findOne({ email });

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

  const recentResets = await ResetToken.countDocuments({
    userId: user._id,
    lastSeenAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  if (recentResets >= MAX_RESET_PER_DAY) {
    return sendErrorResponse(res, new AppError("Too many password reset requests for this account. Try again tomorrow.", { statusCode: 429, code: "RATE_LIMITED" }));
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

  try {
    await sendEmail(user.email, link);
  } catch (err) {
    logger.warn({ email: user.email, error: err }, "Failed to send password reset email");
  }

  sendSuccess(res, {
    message: "Password reset link sent to email",
  });
  logger.info({ userId: user._id.toString(), email: user.email }, "Password reset link sent");
}, "auth.forgotPassword");

const resetPassword = wrapController(async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    logger.warn({ route: req.originalUrl }, "Reset password validation failed");
    return sendErrorResponse(res, new ValidationError("Please provide all required fields"));
  }

  if (password !== confirmPassword) {
    logger.warn({ route: req.originalUrl }, "Reset password mismatch");
    return sendErrorResponse(res, new ValidationError("Passwords do not match"));
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return sendErrorResponse(res, new ValidationError(passwordError));
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
  await user.save({ validateModifiedOnly: true });

  await ResetToken.deleteMany({ userId: user._id });

  sendSuccess(res, {
    message: "Password reset successful",
  });
  logger.info({ userId: user._id.toString() }, "Password reset successful");
}, "auth.resetPassword");

const resendResetLink = wrapController(async (req, res) => {
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
  try {
    await sendEmail(user.email, link);
  } catch (err) {
    logger.warn({ email: user.email, error: err }, "Failed to resend password reset email");
  }

  sendSuccess(res, {
    message: "Password reset link resent to email",
  });
  logger.info({ userId: user._id.toString(), email: user.email }, "Password reset link resent");
}, "auth.resendResetLink");

const googleLogin = wrapController(async (req, res) => {
  const { token } = req.body;

  const payload = await verifyGoogleToken(token);

  if (!payload || !payload.email) {
    logger.warn({ route: req.originalUrl }, "Google login token invalid");
    return sendErrorResponse(res, new ValidationError("Invalid Google token"));
  }

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
    await user.save({ validateModifiedOnly: true });
  }

  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

  logger.info({ userId: user._id.toString(), email: user.email }, "Google login successful");
  return sendSuccess(res, {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    message: "Google login successful",
  }, 200, csrfToken);
}, "auth.googleLogin");

const linkGoogleAccount = wrapController(async (req, res) => {
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
  await user.save({ validateModifiedOnly: true });

  logger.info({ userId: user._id.toString(), email: user.email }, "Google provider linked");
  return sendSuccess(res, {
    message: "Google account linked successfully",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}, "auth.linkGoogleAccount");

const unlinkOAuthProvider = wrapController(async (req, res) => {
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

  await user.save({ validateModifiedOnly: true });
  logger.info({ userId: user._id.toString(), provider }, "OAuth provider unlinked");
  return sendSuccess(res, {
    message: "OAuth provider unlinked successfully",
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}, "auth.unlinkOAuthProvider");

const getCurrentUser = wrapController(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    logger.warn({ route: req.originalUrl }, "Get current user unauthorized");
    return sendErrorResponse(res, new AuthError("Authentication required"));
  }

  const user = await User.findById(userId).select("name email avatar role authProvider aiCreditsRemaining aiCreditsResetAt aiCreditsPlan emailVerified");

  if (!user) {
    logger.warn({ userId }, "Get current user not found");
    return sendErrorResponse(res, new NotFoundError("User not found"));
  }

  logger.info({ userId }, "Current user fetched");
  return sendSuccess(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || user.name?.trim()?.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "ME",
      role: user.role,
      emailVerified: user.emailVerified ?? false,
      aiCredits: {
        remaining: user.aiCreditsRemaining ?? 0,
        resetAt: user.aiCreditsResetAt,
        plan: user.aiCreditsPlan ?? "free",
      },
    },
  });
}, "auth.getCurrentUser");

export { registerUser, verifyEmail, resendVerificationEmail, login, forgotPassword, resetPassword, resendResetLink, googleLogin, linkGoogleAccount, unlinkOAuthProvider, getCurrentUser, logout };

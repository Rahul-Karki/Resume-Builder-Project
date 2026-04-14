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

const COOLDOWN_AFTER_RESET = 5 * 60 * 1000; // 5 min
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 sec
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 min
const MAX_RESET_RESEND_ATTEMPTS = 3;
const frontendBaseUrl = env.FRONTEND_URL;

const logout = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.logout", req);
  try {
    clearAuthCookies(req, res);
    logger.info({ route: req.originalUrl }, "User logged out");
    markSpanSuccess(span);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    markSpanError(span, error as Error, "Logout failed");
    logger.error({ error }, "Logout failed");
    return res.status(500).json({ message: "Server error" });
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
      return res.status(400).json({
        message: "Enter all mandatory fields",
      });
    }

    const check = await User.findOne({ email });

    if (check) {
      logger.warn({ email }, "Register rejected because user exists");
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

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

    res.status(201).json({
      csrfToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
    // response is send to frontend
    logger.info({ userId: user._id.toString(), email: user.email }, "User registered");
    markSpanSuccess(span);

  } catch (error) {
    markSpanError(span, error as Error, "User registration failed");
    logger.error({ error }, "User registration failed");
    res.status(500).json({
      message: "server error",
    });
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
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Find user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn({ email }, "Login failed: unknown user");
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if(!user.password) {
      logger.warn({ email }, "Login failed: password not set for account");
      return res.status(400).json({
        message: "This account does not have a password. Please login using Google.",
      });
    }


    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password!);

    if (!isMatch) {
      logger.warn({ email }, "Login failed: invalid password");
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 5. Ensure local is in authProvider
    if (!Array.isArray(user.authProvider)) {
      user.authProvider = [];
    }
    if (!user.authProvider.includes("local")) {
      user.authProvider.push("local");
      await user.save();
    }

    // 6. Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

    // 7. Send response
    res.status(200).json({
      csrfToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
    logger.info({ userId: user._id.toString(), email: user.email }, "User login successful");
    markSpanSuccess(span);

  } catch (error) {
    markSpanError(span, error as Error, "Login failed");
    logger.error({ error }, "Login failed");
    res.status(500).json({
      message: "Server error",
    });
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
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn({ email }, "Forgot password user not found");
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isGoogleOnlyUser =
      Array.isArray(user.authProvider) &&
      user.authProvider.includes("google") &&
      !user.authProvider.includes("local");

    if (isGoogleOnlyUser && !user.password) {
      logger.warn({ email }, "Forgot password blocked for google-only account");
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }


    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() < COOLDOWN_AFTER_RESET
    ) {
      return res.status(429).json({
        message: "Password was recently updated. Try again later.",
      });
    }

    const existingToken = await ResetToken.findOne({ userId: user._id });

    if (
      existingToken &&
      Date.now() - existingToken.lastSeenAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({
        message: "Please wait before requesting another reset email",
        retryAfterSeconds: Math.ceil(
          (RESEND_COOLDOWN_MS - (Date.now() - existingToken.lastSeenAt.getTime())) / 1000,
        ),
      });
    }

    if (existingToken && existingToken.resendCount >= MAX_RESET_RESEND_ATTEMPTS) {
      return res.status(429).json({
        message: "Maximum resend attempts reached, please try again later",
      });
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

    res.status(200).json({
      message: "Password reset link sent to email",
    });
    logger.info({ userId: user._id.toString(), email: user.email }, "Password reset link sent");
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Forgot password failed");
    logger.error({ error }, "Forgot password failed");
    return res.status(500).json({
      message: "Server error",
    });
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
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    if (password !== confirmPassword) {
      logger.warn({ route: req.originalUrl }, "Reset password mismatch");
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }


    const hashed = hashToken(token);

    const record = await ResetToken.findOne({
      token: hashed,
      expiresAt: { $gt: Date.now() },
    });

    if (!record) {
      logger.warn({ route: req.originalUrl }, "Reset password token invalid or expired");
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(record.userId);

    if (!user) {
      logger.warn({ route: req.originalUrl }, "Reset password user not found");
      return res.status(404).json({
        message: "User not found",
      });
    }

    const saltRounds = 10;

    user.password = await bcrypt.hash(password, saltRounds);
    user.passwordResetAt = new Date();
    await user.save();

    await ResetToken.deleteMany({ userId: user._id }); // remove all tokens for user

    res.status(200).json({
      message: "Password reset successful",
    });
    logger.info({ userId: user._id.toString() }, "Password reset successful");
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Reset password failed");
    logger.error({ error }, "Reset password failed");
    return res.status(500).json({
      message: "Server error",
    });
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
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn({ email }, "Resend reset link user not found");
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isGoogleOnlyUser =
      Array.isArray(user.authProvider) &&
      user.authProvider.includes("google") &&
      !user.authProvider.includes("local");

    if (isGoogleOnlyUser && !user.password) {
      logger.warn({ email }, "Resend reset blocked for google-only account");
      return res.status(400).json({
        message: "This account uses Google login. Please continue with Google.",
      });
    }

    const existingToken = await ResetToken.findOne({
      userId: user._id,
      expiresAt: { $gt: new Date() },
    });

    if (!existingToken) {
      return res.status(400).json({
        message: "No reset request found, please initiate forgot password again",
      });
    }

    if (existingToken.resendCount >= MAX_RESET_RESEND_ATTEMPTS) {
      return res.status(429).json({
        message: "Maximum resend attempts reached, please try again later",
      });
    }

    if (
      user.passwordResetAt &&
      Date.now() - new Date(user.passwordResetAt).getTime() < COOLDOWN_AFTER_RESET
    ) {
      return res.status(429).json({
        message: "Password was recently updated. Try again later.",
      });
    }

    if (Date.now() - existingToken.lastSeenAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: "Please wait before requesting another reset email",
        retryAfterSeconds: Math.ceil(
          (RESEND_COOLDOWN_MS - (Date.now() - existingToken.lastSeenAt.getTime())) / 1000,
        ),
      });
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

    res.status(200).json({
      message: "Password reset link resent to email",
    });
    logger.info({ userId: user._id.toString(), email: user.email }, "Password reset link resent");
    markSpanSuccess(span);
  } catch (error) {
    markSpanError(span, error as Error, "Resend reset link failed");
    logger.error({ error }, "Resend reset link failed");
    return res.status(500).json({
      message: "Server error",
    });
  } finally {
    finishControllerSpan(span);
  }
}

const googleLogin = async (req: Request, res: Response) => {
  const span = startControllerSpan("auth.googleLogin", req);
  try {
    const { token } = req.body;

    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email) {
      logger.warn({ route: req.originalUrl }, "Google login token invalid");
      return res.status(400).json({ message: "Invalid Google token" });
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
    } else {
      // User exists - add google to authProvider if not already there
      if (!Array.isArray(user.authProvider)) {
        user.authProvider = [];
      }
      if (!user.authProvider.includes("google")) {
        user.authProvider.push("google");
        user.googleId = payload.sub;
        await user.save();
      }
    }

    // 🔑 Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const csrfToken = setAuthCookies(req, res, accessToken, refreshToken);

    logger.info({ userId: user._id.toString(), email: user.email }, "Google login successful");
    markSpanSuccess(span);
    return res.json({
      csrfToken,
      user,
      message: "Google login successful",
    });
  } catch (error) {
    markSpanError(span, error as Error, "Google login failed");
    logger.error({ error }, "Google login failed");
    return res.status(500).json({ message: "Server error" });
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("name email avatar role authProvider");

    if (!user) {
      logger.warn({ userId }, "Get current user not found");
      return res.status(404).json({ message: "User not found" });
    }

    logger.info({ userId }, "Current user fetched");
    markSpanSuccess(span);
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || user.name?.trim()?.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "ME",
        role: user.role,
      },
    });
  } catch (error) {
    markSpanError(span, error as Error, "Get current user failed");
    logger.error({ error }, "Get current user failed");
    return res.status(500).json({ message: "Server error" });
  } finally {
    finishControllerSpan(span);
  }
};
  

export { registerUser, login, forgotPassword, resetPassword, resendResetLink , googleLogin, getCurrentUser, logout };

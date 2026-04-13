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

const COOLDOWN_AFTER_RESET = 5 * 60 * 1000; // 5 min
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 sec
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 min
const MAX_RESET_RESEND_ATTEMPTS = 3;
const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";
const cookieSameSite = isProduction ? "none" : "lax";

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: cookieSameSite as "lax" | "none",
  path: "/",
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", authCookieOptions);
  res.clearCookie("refreshToken", authCookieOptions);
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("accessToken", accessToken, {
    ...authCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...authCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const logout = async (_req: Request, res: Response) => {
  try {
    clearAuthCookies(res);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !password || !email) {
      return res.status(400).json({
        message: "Enter all mandatory fields",
      });
    }

    const check = await User.findOne({ email });

    if (check) {
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
    });

    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
    // response is send to frontend

  } catch (error) {
    res.status(500).json({
      message: "server error",
    });
  }
};
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Find user
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if(!user.password) {
      return res.status(400).json({
        message: "This account does not have a password. Please login using Google.",
      });
    }


    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password!);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 5. Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    setAuthCookies(res, accessToken, refreshToken);

    // 7. Send response
    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error); // 👈 always log errors
    res.status(500).json({
      message: "Server error",
    });
  }
};

const forgotPassword = async (req: Request, res: Response) => {

  try {
    const rawEmail = String(req.body?.email ?? "").trim().toLowerCase();
    const email = rawEmail;

    if (!email) {
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isGoogleOnlyUser =
      Array.isArray(user.authProvider) &&
      user.authProvider.includes("google") &&
      !user.authProvider.includes("local");

    if (isGoogleOnlyUser && !user.password) {
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
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
}

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    if (password !== confirmPassword) {
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
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(record.userId);

    if (!user) {
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
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
};

const resendResetLink = async (req: Request, res: Response) => {
  try {
    const rawEmail = String(req.body?.email ?? "").trim().toLowerCase();
    const email = rawEmail;

    if (!email) {
      return res.status(400).json({
        message: "Please provide an email",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isGoogleOnlyUser =
      Array.isArray(user.authProvider) &&
      user.authProvider.includes("google") &&
      !user.authProvider.includes("local");

    if (isGoogleOnlyUser && !user.password) {
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
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
    });
  }
}

const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const payload = await verifyGoogleToken(token);

    if (!payload || !payload.email) {
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
    }

    // 🔑 Generate tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      user,
      message: "Google login successful",
      accessToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("name email avatar role authProvider");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
    console.error("Can't get current user", error);
    return res.status(500).json({ message: "Server error" });
  }
};
  

export { registerUser, login, forgotPassword, resetPassword, resendResetLink , googleLogin, getCurrentUser, logout };

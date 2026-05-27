import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AppError } from "../errors/AppError";

import crypto from "crypto";
import { generateSecret, verify as verifyTotp, generateURI as otplGenerateUri } from "otplib";

function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(4).toString("hex");
    const code = hex.toUpperCase().match(/.{1,4}/g)!.join("-");
    plain.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { plain, hashed };
}

export const setupMfa = wrapController(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, "Authentication required", 401);

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found", 404);
  if (user.mfaEnabled) return sendError(res, "MFA already enabled", 409);

  const secret = generateSecret();
  const { plain: backupCodes, hashed: hashedBackupCodes } = generateBackupCodes();

  user.mfaSecret = secret;
  user.mfaBackupCodes = hashedBackupCodes;
  await user.save();

  logger.info({ userId: user._id }, "MFA setup initiated");

  return sendSuccess(res, {
    secret,
    backupCodes,
    uri: otplGenerateUri({ strategy: "totp", label: user.email, issuer: "ResumeBuilder", secret }),
  });
}, "mfa.setupMfa");

export const verifyMfa = wrapController(async (req, res) => {
  const userId = req.user?.id;
  const { token } = req.body;
  if (!userId) return sendError(res, "Authentication required", 401);
  if (!token) return sendError(res, "Token is required", 422);

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found", 404);
  if (!user.mfaSecret) return sendError(res, "MFA not setup", 400);

  const isValid = verifyTotp({ token: String(token), secret: user.mfaSecret });

  if (!isValid) {
    logger.warn({ userId: user._id }, "Invalid MFA token");
    return sendError(res, "Invalid MFA token", 401);
  }

  user.mfaEnabled = true;
  user.mfaVerifiedAt = new Date();
  await user.save();

  logger.info({ userId: user._id }, "MFA enabled successfully");

  return sendSuccess(res, { enabled: true, message: "MFA has been enabled" });
}, "mfa.verifyMfa");

export const disableMfa = wrapController(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, "Authentication required", 401);

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found", 404);
  if (!user.mfaEnabled) return sendError(res, "MFA not enabled", 400);

  user.mfaEnabled = false;
  user.mfaMethod = "none";
  user.mfaSecret = null;
  user.mfaBackupCodes = [];
  user.mfaVerifiedAt = null;
  await user.save();

  logger.info({ userId: user._id }, "MFA disabled");

  return sendSuccess(res, { enabled: false, message: "MFA has been disabled" });
}, "mfa.disableMfa");

export const getMfaStatus = wrapController(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, "Authentication required", 401);

  const user = await User.findById(userId).select("mfaEnabled mfaMethod mfaVerifiedAt");
  if (!user) return sendError(res, "User not found", 404);

  return sendSuccess(res, {
    enabled: user.mfaEnabled,
    method: user.mfaMethod,
    verifiedAt: user.mfaVerifiedAt,
  });
}, "mfa.getMfaStatus");

import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AppError } from "../errors/AppError";

import crypto from "crypto";

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = crypto.randomBytes(4).toString("hex");
    codes.push(hex.toUpperCase().match(/.{1,4}/g)!.join("-"));
  }
  return codes;
}

function generateTotpSecret(): string {
  return crypto.randomBytes(20).toString("base64");
}

function verifyTotp(token: string, secret: string): boolean {
  if (!secret || !token) return false;
  const [key, time] = [secret, Math.floor(Date.now() / 30000)];
  const hmac = crypto.createHmac("sha1", Buffer.from(key, "base64"));
  hmac.update(Buffer.from(new Uint8Array([(time >> 24) & 0xff, (time >> 16) & 0xff, (time >> 8) & 0xff, time & 0xff])));
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const otp = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  const ourToken = String(otp % 1000000).padStart(6, "0");
  return ourToken === token;
}

export const setupMfa = wrapController(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return sendError(res, "Authentication required", 401);

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found", 404);
  if (user.mfaEnabled) return sendError(res, "MFA already enabled", 409);

  const secret = generateTotpSecret();
  const backupCodes = generateBackupCodes();

  user.mfaSecret = secret;
  user.mfaBackupCodes = backupCodes;
  await user.save();

  logger.info({ userId: user._id }, "MFA setup initiated");

  return sendSuccess(res, {
    secret,
    backupCodes,
    uri: `otpauth://totp/ResumeBuilder:${user.email}?secret=${secret}&issuer=ResumeBuilder`,
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

  const isValid = verifyTotp(String(token), user.mfaSecret);

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

import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../observability";

const ROTATION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type RotationResult = {
  primarySecret: string;
  secondarySecret: string | null;
  rotationActive: boolean;
  graceExpiresAt: Date | null;
};

let currentRotation: RotationResult | null = null;

const getRotationState = (): RotationResult => {
  const newSecret = process.env["JWT_ACCESS_SECRET_NEW"]?.trim();
  const rotationActive = !!newSecret && newSecret !== env.JWT_ACCESS_SECRET;

  return {
    primarySecret: env.JWT_ACCESS_SECRET,
    secondarySecret: rotationActive ? newSecret! : null,
    rotationActive,
    graceExpiresAt: rotationActive
      ? new Date(Date.now() + ROTATION_GRACE_PERIOD_MS)
      : null,
  };
};

export const initSecretRotation = () => {
  currentRotation = getRotationState();
  if (currentRotation.rotationActive) {
    logger.info({
      gracePeriodHours: ROTATION_GRACE_PERIOD_MS / 3600000,
      graceExpiresAt: currentRotation.graceExpiresAt,
    }, "Secret rotation active — both old and new secrets accepted during grace period");
  }
};

export const verifyTokenWithRotation = <T extends object>(
  token: string,
): T | null => {
  const rotation = currentRotation || getRotationState();

  try {
    return jwt.verify(token, rotation.primarySecret, { algorithms: ["HS256"] }) as T;
  } catch {
    if (rotation.secondarySecret) {
      try {
        return jwt.verify(token, rotation.secondarySecret, { algorithms: ["HS256"] }) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
};

export const signWithRotation = (
  payload: object,
  options?: jwt.SignOptions,
): string => {
  const rotation = currentRotation || getRotationState();
  return jwt.sign(payload, rotation.primarySecret, options);
};

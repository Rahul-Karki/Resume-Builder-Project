import User from "../models/User";
import { AppError } from "../errors/AppError";

const MONTHLY_CREDITS = 200;

const getNextCreditsResetAt = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

export const refreshAiCreditsIfNeeded = async (userId: string) => {
  const user = await User.findById(userId).select("aiCreditsRemaining aiCreditsResetAt");
  if (!user) return null;

  const resetAt = user.aiCreditsResetAt ? new Date(user.aiCreditsResetAt) : null;
  const now = new Date();

  if (!resetAt || resetAt.getTime() <= now.getTime()) {
    user.aiCreditsRemaining = MONTHLY_CREDITS;
    user.aiCreditsResetAt = getNextCreditsResetAt();
    await user.save();
  }

  return user;
};

export const assertAiCreditsAvailable = async (userId: string, requiredCredits: number) => {
  if (!Number.isFinite(requiredCredits) || requiredCredits <= 0) {
    return refreshAiCreditsIfNeeded(userId);
  }

  const user = await refreshAiCreditsIfNeeded(userId);
  if (!user) return null;

  if ((user.aiCreditsRemaining ?? 0) < requiredCredits) {
    throw new AppError("Insufficient AI credits", {
      statusCode: 402,
      code: "AI_CREDITS_REQUIRED",
      details: {
        required: requiredCredits,
        remaining: user.aiCreditsRemaining ?? 0,
        resetAt: user.aiCreditsResetAt,
      },
      expose: true,
    });
  }

  return user;
};

export const deductAiCredits = async (userId: string, creditsToDeduct: number) => {
  if (!Number.isFinite(creditsToDeduct) || creditsToDeduct <= 0) {
    return refreshAiCreditsIfNeeded(userId);
  }

  const user = await refreshAiCreditsIfNeeded(userId);
  if (!user) return null;

  const remaining = Math.max(0, Number(user.aiCreditsRemaining ?? 0) - creditsToDeduct);
  user.aiCreditsRemaining = remaining;
  await user.save();

  return user;
};

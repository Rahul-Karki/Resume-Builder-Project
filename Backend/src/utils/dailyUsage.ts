import User from "../models/User";
import { AppError } from "../errors/AppError";

const DAILY_LIMITS = {
  "ai-assistant": 6,
  "ats-score": 2,
} as const;

export type DailyFeature = keyof typeof DAILY_LIMITS;

const getToday = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
};

const getField = (feature: DailyFeature) => `dailyUsage.${feature}`;

/**
 * Atomically reserves a daily usage slot BEFORE the operation.
 * Returns true if the slot was reserved (within limit).
 * Throws 429 AppError if limit exceeded — strict enforcement.
 *
 * Uses findOneAndUpdate with aggregation pipeline for atomic
 * conditional reset (new day) or increment (same day).
 */
export const reserveDailyUsage = async (userId: string, feature: DailyFeature): Promise<void> => {
  const today = getToday();
  const limit = DAILY_LIMITS[feature];
  const field = getField(feature);

  const result = await User.findOneAndUpdate(
    {
      _id: userId,
      $or: [
        { "dailyUsage.date": { $ne: today } },
        { [field]: { $lt: limit } },
      ],
    },
    [
      {
        $set: {
          "dailyUsage.date": {
            $cond: [
              { $ne: ["$dailyUsage.date", today] },
              today,
              "$dailyUsage.date",
            ],
          },
          [field]: {
            $cond: [
              { $ne: ["$dailyUsage.date", today] },
              1,
              { $add: [{ $ifNull: [`$${field}`, 0] }, 1] },
            ],
          },
        },
      },
    ],
    { new: true, projection: { dailyUsage: 1 } },
  );

  if (!result) {
    throw new AppError("Daily usage limit reached. Please try again tomorrow.", {
      statusCode: 429,
      code: "DAILY_LIMIT_REACHED",
      details: {
        feature,
        limit,
        today,
      },
      expose: true,
    });
  }
};

/**
 * Returns the user's current daily usage counts (informational, not enforced).
 */
export const getDailyUsage = async (userId: string) => {
  const user = await User.findById(userId).select("dailyUsage").lean();
  if (!user) return { aiAssistant: 0, atsScore: 0 };
  const today = getToday();
  const usage = user.dailyUsage ?? { date: "", aiAssistant: 0, atsScore: 0 };
  return {
    aiAssistant: usage.date === today ? usage.aiAssistant : 0,
    atsScore: usage.date === today ? usage.atsScore : 0,
  };
};

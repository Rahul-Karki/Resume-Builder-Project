import { logger } from "../observability";
import { withRedis } from "./redis";

const BLACKLIST_PREFIX = "token:blacklist:";
const ACCESS_BLACKLIST_TTL = 60 * 15; // 15 min (matches access token expiry)
const REFRESH_BLACKLIST_TTL = 60 * 60 * 24 * 8; // 8 days (slightly > 7d refresh token)

const blacklistKey = (tokenHash: string, type: "access" | "refresh") =>
  `${BLACKLIST_PREFIX}${type}:${tokenHash}`;

import crypto from "crypto";
const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const blacklistAccessToken = async (token: string): Promise<void> => {
  const hashed = hashToken(token);
  const key = blacklistKey(hashed, "access");
  await withRedis(async (client) => {
    await client.set(key, "1", { EX: ACCESS_BLACKLIST_TTL });
  });
};

export const blacklistRefreshToken = async (token: string): Promise<void> => {
  const hashed = hashToken(token);
  const key = blacklistKey(hashed, "refresh");
  await withRedis(async (client) => {
    await client.set(key, "1", { EX: REFRESH_BLACKLIST_TTL });
  });
  logger.info({ key }, "Refresh token blacklisted");
};

export const isTokenBlacklisted = async (token: string, type: "access" | "refresh"): Promise<boolean> => {
  const hashed = hashToken(token);
  const key = blacklistKey(hashed, type);
  try {
    const result = await withRedis(async (client) => client.get(key));
    return result === "1";
  } catch {
    logger.warn({ key }, "Token blacklist check failed — Redis unavailable. Allowing token to proceed to avoid mass logout.");
    return false;
  }
};

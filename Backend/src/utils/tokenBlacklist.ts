import crypto from "crypto";
import { logger } from "../observability";
import { withRedis } from "./redis";

const BLACKLIST_PREFIX = "token:blacklist:";
const ACCESS_BLACKLIST_TTL = 60 * 15; // 15 min (matches access token expiry)
const REFRESH_BLACKLIST_TTL = 60 * 60 * 24 * 8; // 8 days (slightly > 7d refresh token)

const blacklistKey = (tokenHash: string, type: "access" | "refresh") =>
  `${BLACKLIST_PREFIX}${type}:${tokenHash}`;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

// In-memory blacklist fallback used when Redis is unavailable.
// WARNING: This cache is per-process and does not replicate across instances.
// In a multi-replica deployment, a blacklisted token may still be accepted by
// another process until its Redis-backed expiry takes effect or the token
// naturally expires. Use a shared store (Redis) for production multi-instance setups.
// TTLs match Redis counterparts so entries don't persist in memory forever.
const memoryBlacklist = new Map<string, number>();
const MEMORY_BLACKLIST_TTL_ACCESS = ACCESS_BLACKLIST_TTL * 1000;
const MEMORY_BLACKLIST_TTL_REFRESH = REFRESH_BLACKLIST_TTL * 1000;

export const blacklistAccessToken = async (token: string): Promise<void> => {
  const hashed = hashToken(token);
  const key = blacklistKey(hashed, "access");
  memoryBlacklist.set(key, Date.now() + MEMORY_BLACKLIST_TTL_ACCESS);
  await withRedis(async (client) => {
    await client.set(key, "1", { EX: ACCESS_BLACKLIST_TTL });
  });
};

export const blacklistRefreshToken = async (token: string): Promise<void> => {
  const hashed = hashToken(token);
  const key = blacklistKey(hashed, "refresh");
  memoryBlacklist.set(key, Date.now() + MEMORY_BLACKLIST_TTL_REFRESH);
  await withRedis(async (client) => {
    await client.set(key, "1", { EX: REFRESH_BLACKLIST_TTL });
  });
  logger.info({ keyPrefix: BLACKLIST_PREFIX }, "Refresh token blacklisted");
};

const isInMemoryBlacklisted = (key: string): boolean => {
  const expiry = memoryBlacklist.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    memoryBlacklist.delete(key);
    return false;
  }
  return true;
};

export const isTokenBlacklisted = async (token: string, type: "access" | "refresh"): Promise<boolean> => {
  const hashed = hashToken(token);
  const key = blacklistKey(hashed, type);

  // Check in-memory blacklist first (covers Redis outage gap)
  if (isInMemoryBlacklisted(key)) return true;

  try {
    const result = await withRedis(async (client) => client.get(key));
    const blacklisted = result === "1";
    if (blacklisted) {
      const ttl = type === "access" ? MEMORY_BLACKLIST_TTL_ACCESS : MEMORY_BLACKLIST_TTL_REFRESH;
      memoryBlacklist.set(key, Date.now() + ttl);
    }
    return blacklisted;
  } catch {
    logger.warn({ key }, "Redis unavailable — falling back to in-memory blacklist");
    return isInMemoryBlacklisted(key);
  }
};

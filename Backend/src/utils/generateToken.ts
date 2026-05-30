import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logger } from "../observability";

let accessKeyPair: { publicKey: string; privateKey: string; cachedAt: number } | null = null;
let refreshKeyPair: { publicKey: string; privateKey: string; cachedAt: number } | null = null;
const KEY_CACHE_TTL_MS = 300_000; // 5 minutes

const isKeyCacheValid = (entry: { cachedAt: number } | null): boolean => {
  return entry !== null && (Date.now() - entry.cachedAt) < KEY_CACHE_TTL_MS;
};

const getAccessKeyPair = () => {
  if (isKeyCacheValid(accessKeyPair)) {
    return { publicKey: accessKeyPair!.publicKey, privateKey: accessKeyPair!.privateKey };
  }
  accessKeyPair = { publicKey: env.JWT_ACCESS_PUBLIC_KEY, privateKey: env.JWT_ACCESS_PRIVATE_KEY, cachedAt: Date.now() };
  return accessKeyPair;
};

const getRefreshKeyPair = () => {
  if (isKeyCacheValid(refreshKeyPair)) {
    return { publicKey: refreshKeyPair!.publicKey, privateKey: refreshKeyPair!.privateKey };
  }
  refreshKeyPair = { publicKey: env.JWT_REFRESH_PUBLIC_KEY, privateKey: env.JWT_REFRESH_PRIVATE_KEY, cachedAt: Date.now() };
  return refreshKeyPair;
};

// Prefer HMAC (HS256) when an explicit secret is provided. Fall back to RSA (RS256)
// only when the secret is absent and RSA keypair is available.
const generateAccessToken = (userId: string) => {
  const hasHmac = typeof env.JWT_ACCESS_SECRET === "string" && env.JWT_ACCESS_SECRET.trim().length > 0;
  const hasRsa = typeof env.JWT_ACCESS_PRIVATE_KEY === "string" && env.JWT_ACCESS_PRIVATE_KEY.trim().length > 0 &&
    typeof env.JWT_ACCESS_PUBLIC_KEY === "string" && env.JWT_ACCESS_PUBLIC_KEY.trim().length > 0;

  if (hasHmac) {
    return jwt.sign({ userId }, env.JWT_ACCESS_SECRET, { algorithm: "HS256", expiresIn: "15m" });
  }

  if (hasRsa) {
    const { privateKey } = getAccessKeyPair();
    logger.info("Using RSA keys to sign access token");
    return jwt.sign({ userId }, privateKey, { algorithm: "RS256", expiresIn: "15m" });
  }

  // No key material available — throw to make failures explicit.
  throw new Error("No JWT access signing key configured");
};

const generateRefreshToken = (userId: string) => {
  const hasHmac = typeof env.JWT_REFRESH_SECRET === "string" && env.JWT_REFRESH_SECRET.trim().length > 0;
  const hasRsa = typeof env.JWT_REFRESH_PRIVATE_KEY === "string" && env.JWT_REFRESH_PRIVATE_KEY.trim().length > 0 &&
    typeof env.JWT_REFRESH_PUBLIC_KEY === "string" && env.JWT_REFRESH_PUBLIC_KEY.trim().length > 0;

  if (hasHmac) {
    return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { algorithm: "HS256", expiresIn: "7d" });
  }

  if (hasRsa) {
    const { privateKey } = getRefreshKeyPair();
    logger.info("Using RSA keys to sign refresh token");
    return jwt.sign({ userId }, privateKey, { algorithm: "RS256", expiresIn: "7d" });
  }

  throw new Error("No JWT refresh signing key configured");
};

export { generateAccessToken, generateRefreshToken, getAccessKeyPair, getRefreshKeyPair };

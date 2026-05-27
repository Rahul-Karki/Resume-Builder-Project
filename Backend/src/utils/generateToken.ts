import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { logger } from "../observability";

let accessKeyPair: { publicKey: string; privateKey: string } | null = null;
let refreshKeyPair: { publicKey: string; privateKey: string } | null = null;

const KEY_BITS = 4096;

const getOrGenerateAccessKeys = () => {
  if (accessKeyPair) return accessKeyPair;
  if (env.JWT_ACCESS_PUBLIC_KEY && env.JWT_ACCESS_PRIVATE_KEY) {
    accessKeyPair = { publicKey: env.JWT_ACCESS_PUBLIC_KEY, privateKey: env.JWT_ACCESS_PRIVATE_KEY };
    return accessKeyPair;
  }
  logger.info("Generating ephemeral RSA key pair for access tokens (set JWT_ACCESS_PUBLIC_KEY + JWT_ACCESS_PRIVATE_KEY in production)");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: KEY_BITS, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
  accessKeyPair = { publicKey, privateKey };
  return accessKeyPair;
};

const getOrGenerateRefreshKeys = () => {
  if (refreshKeyPair) return refreshKeyPair;
  if (env.JWT_REFRESH_PUBLIC_KEY && env.JWT_REFRESH_PRIVATE_KEY) {
    refreshKeyPair = { publicKey: env.JWT_REFRESH_PUBLIC_KEY, privateKey: env.JWT_REFRESH_PRIVATE_KEY };
    return refreshKeyPair;
  }
  logger.info("Generating ephemeral RSA key pair for refresh tokens (set JWT_REFRESH_PUBLIC_KEY + JWT_REFRESH_PRIVATE_KEY in production)");
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: KEY_BITS, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
  refreshKeyPair = { publicKey, privateKey };
  return refreshKeyPair;
};

const generateAccessToken = (userId: string) => {
  const { privateKey } = getOrGenerateAccessKeys();
  return jwt.sign({ userId }, privateKey, { algorithm: "RS256", expiresIn: "15m" });
};

const generateRefreshToken = (userId: string) => {
  const { privateKey } = getOrGenerateRefreshKeys();
  return jwt.sign({ userId }, privateKey, { algorithm: "RS256", expiresIn: "7d" });
};

export { generateAccessToken, generateRefreshToken, getOrGenerateAccessKeys, getOrGenerateRefreshKeys };

// ─── redactSensitive.ts ────────────────────────────────────────────────────
// Utility to redact sensitive data from logs to prevent leaking tokens, 
// passwords, and other PII in error logs.

/**
 * Sensitive keys that should be redacted from logs
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apikey",
  "apiSecret",
  "authorization",
  "authToken",
  "csrfToken",
  "sessionId",
  "jwt",
  "bearer",
  "x-api-key",
  "x-csrf-token",
  "credit_card",
  "creditcard",
  "ssn",
  "cvv",
  "pin",
]);

/**
 * Check if a key name indicates sensitive data
 */
const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("secret") || lowerKey.includes("pass");
};

/**
 * Redact sensitive values in an object
 */
export const redactSensitive = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Check if string looks like a token (long alphanumeric)
    if (obj.length > 20 && /^[a-zA-Z0-9._-]+$/.test(obj)) {
      return "[REDACTED]";
    }
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = redactSensitive(value);
    }
  }

  return redacted;
};

/**
 * Redact entire request params and query objects
 */
export const redactRequestData = (params?: unknown, query?: unknown): { params?: unknown; query?: unknown } => {
  return {
    params: redactSensitive(params),
    query: redactSensitive(query),
  };
};

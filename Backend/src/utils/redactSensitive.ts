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

const TOKEN_PATTERNS = [
  /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,    // JWT
  /^gh[ps]_[a-zA-Z0-9]{36,}$/,                                 // GitHub tokens
  /^sk-[a-zA-Z0-9]{20,}$/i,                                    // OpenAI keys
  /^xox[bpras]-\d+-[a-f0-9]{8,}-[a-f0-9]{8,}/i,              // Slack tokens
  /^[a-f0-9]{64,}$/i,                                          // 32+ byte hex tokens
  /^[A-Za-z0-9+/]{40,}={0,2}$/,                                // Base64 30+ chars
];

const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes("secret") || lowerKey.includes("pass");
};

const isLikelySecret = (str: string): boolean =>
  str.length >= 20 && TOKEN_PATTERNS.some((p) => p.test(str));

export const redactSensitive = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    if (isLikelySecret(obj)) {
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

export const redactRequestData = (params?: unknown, query?: unknown): { params?: unknown; query?: unknown } => {
  return {
    params: redactSensitive(params),
    query: redactSensitive(query),
  };
};

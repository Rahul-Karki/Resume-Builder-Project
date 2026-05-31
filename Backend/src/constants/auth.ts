export const BCRYPT_SALT_ROUNDS = 10;
export const COOLDOWN_AFTER_RESET = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 2 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
export const MAX_RESET_RESEND_ATTEMPTS = 3;
export const MAX_RESET_PER_DAY = 10;
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export const MAX_OTP_ATTEMPTS = 3;
export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_RESEND_BASE_COOLDOWN_MS = 30 * 1000;
export const OTP_RESEND_MAX_COOLDOWN_MS = 5 * 60 * 1000;
export const OTP_RESEND_MAX_ATTEMPTS = 5;

export const AUTH_USER_CACHE_TTL_S = 60;
export const AUTH_QUERY_TIMEOUT_MS = 5000;

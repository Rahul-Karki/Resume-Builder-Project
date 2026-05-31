import express from "express"
import { z } from "zod";
import { registerUser, verifyEmail, resendVerificationEmail, login, forgotPassword, resetPassword, resendResetLink, googleLogin, linkGoogleAccount, unlinkOAuthProvider, getCurrentUser, logout } from "../controllers/authController"
import { authMiddleware } from "../middleware/authMiddleware"
import { validateRequest } from "../middleware/validateRequest";
import { env } from "../config/env";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import {
	authEmailSchema,
	authLoginSchema,
	authResetPasswordSchema,
	authSignupSchema,
	googleLoginSchema,
	oauthLinkSchema,
	oauthUnlinkSchema,
} from "../validation/schemas";

const signupLimiter = createRedisRateLimitMiddleware({
	scope: "auth-signup",
	windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
	max: Math.max(3, Math.floor(env.REDIS_RATE_LIMIT_MAX / 5)),
	message: "Too many signup attempts. Please try again later.",
});

const passwordRecoveryLimiter = createRedisRateLimitMiddleware({
	scope: "auth-password-recovery",
	windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
	max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 4)),
	keyBuilder: (req) => {
		const rawEmail = typeof req.body?.email === "string" ? req.body.email : "";
		const email = rawEmail.trim().toLowerCase();
		return email ? `email:${email}:ip:${req.ip}` : `ip:${req.ip}`;
	},
	message: "Too many password recovery requests. Please try again later.",
});

const oauthLimiter = createRedisRateLimitMiddleware({
	scope: "auth-oauth",
	windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
	max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 3)),
	message: "Too many authentication requests. Please try again later.",
});

const loginLimiter = createRedisRateLimitMiddleware({
	scope: "auth-login",
	windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
	max: Math.max(5, Math.min(env.REDIS_RATE_LIMIT_MAX, 20)),
	message: "Too many login attempts. Please try again later.",
});

const verifyEmailLimiter = createRedisRateLimitMiddleware({
	scope: "auth-verify-email",
	windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
	max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 4)),
	message: "Too many verification attempts. Please try again later.",
});

const mfaLimiter = createRedisRateLimitMiddleware({
	scope: "auth-mfa",
	windowMs: env.REDIS_RATE_LIMIT_WINDOW_MS,
	max: Math.max(5, Math.floor(env.REDIS_RATE_LIMIT_MAX / 4)),
	keyBuilder: (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`),
	message: "Too many MFA attempts. Please try again later.",
});

const router = express.Router();

// routes
router.post("/signup", signupLimiter, validateRequest({ body: authSignupSchema }), registerUser);
router.post("/login", loginLimiter, validateRequest({ body: authLoginSchema }), login);
router.post("/verify-email", verifyEmailLimiter, validateRequest({ body: z.object({ email: z.string().email(), otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits") }).strict() }), verifyEmail);
router.post("/resend-verification", passwordRecoveryLimiter, validateRequest({ body: authEmailSchema }), resendVerificationEmail);

router.post("/forgot-password", passwordRecoveryLimiter, validateRequest({ body: authEmailSchema }), forgotPassword);
router.post("/reset-password", passwordRecoveryLimiter, validateRequest({ body: authResetPasswordSchema }), resetPassword);
router.post("/resend", passwordRecoveryLimiter, validateRequest({ body: authEmailSchema }), resendResetLink)


router.post("/google-login", oauthLimiter, validateRequest({ body: googleLoginSchema }), googleLogin);
router.post("/link-google", authMiddleware, validateRequest({ body: oauthLinkSchema }), linkGoogleAccount);
router.post("/unlink-oauth", authMiddleware, validateRequest({ body: oauthUnlinkSchema }), unlinkOAuthProvider);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getCurrentUser);

// ─── MFA Routes ─────────────────────────────────────────────────────────────────
import { setupMfa, verifyMfa, disableMfa, getMfaStatus } from "../controllers/mfaController";
import { mfaSetupSchema, mfaVerifySchema, mfaDisableSchema } from "../validation/schemas";

router.post("/mfa/setup", mfaLimiter, authMiddleware, validateRequest({ body: mfaSetupSchema }), setupMfa);
router.post("/mfa/verify", mfaLimiter, authMiddleware, validateRequest({ body: mfaVerifySchema }), verifyMfa);
router.post("/mfa/disable", mfaLimiter, authMiddleware, validateRequest({ body: mfaDisableSchema }), disableMfa);
router.get("/mfa/status", mfaLimiter, authMiddleware, getMfaStatus);

export default router;

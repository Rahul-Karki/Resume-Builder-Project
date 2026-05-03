import express from "express"
import { registerUser , login, forgotPassword, resetPassword, resendResetLink, googleLogin, linkGoogleAccount, unlinkOAuthProvider, getCurrentUser, logout } from "../controllers/authController"
import { authMiddleware } from "../middleware/authMiddleware"
import { validateRequest } from "../middleware/validateRequest";
import { env } from "../config/env";
import { createRedisRateLimitMiddleware } from "../middleware/redisRateLimit";
import {
	authEmailSchema,
	authLoginSchema,
	authResetPasswordSchema,
	authSignupSchema,
	emptyObjectSchema,
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

const router = express.Router();

// routes
router.post("/signup", signupLimiter, validateRequest({ body: authSignupSchema }), registerUser);
router.post("/login", loginLimiter, validateRequest({ body: authLoginSchema }), login);

router.post("/forgot-password", passwordRecoveryLimiter, validateRequest({ body: authEmailSchema }), forgotPassword);
router.post("/reset-password", passwordRecoveryLimiter, validateRequest({ body: authResetPasswordSchema }), resetPassword);
router.post("/resend", passwordRecoveryLimiter, validateRequest({ body: authEmailSchema }), resendResetLink)


router.post("/google-login", oauthLimiter, validateRequest({ body: googleLoginSchema }), googleLogin);
router.post("/link-google", authMiddleware, validateRequest({ body: oauthLinkSchema }), linkGoogleAccount);
router.post("/unlink-oauth", authMiddleware, validateRequest({ body: oauthUnlinkSchema }), unlinkOAuthProvider);
router.post("/logout", validateRequest({ body: emptyObjectSchema }), authMiddleware, logout);
router.get("/me", authMiddleware, getCurrentUser);

export default router;

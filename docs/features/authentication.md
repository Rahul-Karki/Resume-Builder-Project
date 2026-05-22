---
# Feature: Authentication
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Allows users to create accounts, sign in securely, and maintain sessions across page reloads using JWT access/refresh token pairs with double-submit CSRF protection.

## User Stories
- As a job seeker, I want to sign up with my email and password so that I can create and save resumes.
- As a returning user, I want to log in and stay logged in across browser sessions so that I don't have to re-enter credentials.
- As a user, I want to log in with Google so that I don't need to remember another password.

## Scope
### In scope
- Email/password signup and login with bcrypt password hashing
- Google OAuth login via @react-oauth/google + google-auth-library
- JWT access token (15 min) + refresh token (30 day) cookie pair
- CSRF token issuance on every response (double-submit cookie pattern)
- Session bootstrap on page load via GET /api/refresh
- Automatic token refresh on 401 via POST /api/refresh
- Account linking/unlinking for Google OAuth
- Login attempt tracking with account lockout
- In-memory CSRF token storage (cross-origin frontend/backend)

### Out of scope
- OAuth providers other than Google
- Session invalidation on all devices (single logout only)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/router/auth.routes.ts | Auth route definitions with rate limiters and validation |
| Backend/src/router/refresh.route.ts | CSRF token issuance and access token refresh |
| Backend/src/controllers/authController.ts | Signup, login, logout, Google OAuth, profile handlers |
| Backend/src/controllers/refreshController.ts | CSRF + refresh token handlers |
| Backend/src/controllers/mfaController.ts | MFA setup, verify, disable (co-located with auth) |
| Backend/src/middleware/authMiddleware.ts | JWT access token verification from cookie |
| Backend/src/middleware/csrfProtection.ts | Double-submit CSRF validation for mutating requests |
| Backend/src/middleware/correlationId.ts | Request tracing headers |
| Backend/src/utils/authCookies.ts | Cookie set/clear for access, refresh, CSRF tokens |
| Backend/src/utils/generateToken.ts | JWT signing for access and refresh tokens |
| Backend/src/utils/tokenBlacklist.ts | Redis-backed token blacklist for logout |
| Backend/src/utils/hashToken.ts | SHA-256 token hashing for blacklist storage |
| Backend/src/utils/google.ts | Google OAuth ID token verification |
| Backend/src/models/User.ts | User schema with email, password, role, OAuth fields |
| frontend/src/services/api.ts | Axios client with CSRF management and auto-refresh |

### Data model
`	ypescript
// User model (key auth fields)
interface IUser {
  name: string;
  email: string;          // unique
  password?: string;      // bcrypt hashed, select: false
  role: "user" | "admin" | "superadmin";
  googleId?: string;      // unique sparse
  authProvider: ("local" | "google")[];
  loginAttempts: number;
  lockUntil: Date | null;
  passwordResetAt?: Date;
}
`

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| POST | /api/auth/signup | No | Create account (rate-limited) |
| POST | /api/auth/login | No | Log in with email/password (rate-limited) |
| POST | /api/auth/google-login | No | Log in with Google credential (rate-limited) |
| POST | /api/auth/link-google | Yes | Link Google account to existing user |
| POST | /api/auth/unlink-oauth | Yes | Unlink OAuth provider |
| POST | /api/auth/logout | Yes | Clear auth cookies and blacklist refresh token |
| GET | /api/auth/me | Yes | Return authenticated user profile |
| GET | /api/refresh/csrf | No | Issue CSRF token |
| POST | /api/refresh | No | Refresh access token using refresh token cookie |

## Edge Cases & Error Handling
- Duplicate email during signup: returns 409 Conflict with description.
- Wrong password during login: increments loginAttempts, returns 401. After 5+ failed attempts, locks account for a configurable duration.
- Expired access token: frontend auto-refreshes via POST /api/refresh; CSRF middleware exempts the refresh route.
- Missing CSRF token: returns 403 with CSRF_VALIDATION_FAILED code; frontend retries with fresh token.
- Invalid/revoked refresh token: returns 401, frontend redirects to login.
- Google token verification failure: returns 401; frontend shows Google login error.

## Tests
- Unit: __tests__/authController.test.ts, __tests__/authMiddleware.test.ts, __tests__/csrfProtection.test.ts, __tests__/refreshController.test.ts, __tests__/utils/authCookies.test.ts, __tests__/utils/generateToken.test.ts, __tests__/utils/tokenBlacklist.test.ts, __tests__/utils/google.test.ts, __tests__/utils/hashToken.test.ts
- Integration: __tests__/integration/auth.test.ts
- E2E: e2e/auth.spec.ts (frontend)

## Open Questions
- Should refresh token rotation be implemented? (owner: TBD)
- Should the account lockout duration be configurable per deployment? (owner: TBD)

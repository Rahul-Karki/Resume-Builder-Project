---
# Feature: Password Reset
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Allows users who have forgotten their password to securely reset it via a time-limited email link.

## User Stories
- As a user who forgot my password, I want to request a reset link so that I can regain access to my account.
- As a user, I want the reset process to be secure so that my account can't be hijacked by someone else.

## Scope
### In scope
- Forgot-password flow: email input, token generation, email dispatch via Resend
- Reset-password flow: token verification, password update, token invalidation
- Resend reset link with rate limiting
- Token expiry (configurable TTL)
- IP- and email-based rate limiting to prevent abuse

### Out of scope
- Rate-limit bypass for trusted IPs
- Password strength meter on the backend

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/authController.ts | forgotPassword, resetPassword, resendResetLink |
| Backend/src/router/auth.routes.ts | Routes with passwordRecoveryLimiter |
| Backend/src/utils/sendEmail.ts | Resend API integration for transactional emails |
| Backend/src/models/ResetToken.ts | Token schema with userId, token hash, expiresAt, resendCount |

### Data model
`	ypescript
// ResetToken model
interface IResetToken {
  userId: ObjectId;       // ref User
  token: string;          // SHA-256 hash of the raw token
  expiresAt: Date;        // TTL index auto-deletes expired tokens
  resendCount: number;    // tracks how many times the link was re-sent
  lastSeenAt?: Date;
}
`

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| POST | /api/auth/forgot-password | No | Send reset email (rate-limited per email+IP) |
| POST | /api/auth/reset-password | No | Verify token and update password |
| POST | /api/auth/resend | No | Resend reset link (rate-limited) |

## Edge Cases & Error Handling
- Email does not exist: returns 200 to prevent user enumeration (no indication of whether the email exists).
- Token expired: returns 400 with EXPIRED_TOKEN code.
- Token already used: returns 400 with TOKEN_USED code.
- Rate limit exceeded: returns 429 with Retry-After header.
- Resend API failure: logs error, returns 500. User can retry.

## Tests
- Unit: __tests__/authController.test.ts, __tests__/utils/sendEmail.test.ts
- Integration: part of __tests__/integration/auth.test.ts

## Open Questions
- None.

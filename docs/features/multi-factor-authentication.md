---
# Feature: Multi-Factor Authentication (MFA)
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Adds an optional second factor (TOTP via authenticator app) to user accounts, protecting against credential theft.

## User Stories
- As a security-conscious user, I want to enable TOTP-based MFA so that my account is protected even if my password is compromised.
- As an admin, I want to see which users have MFA enabled so that I can enforce security policies.

## Scope
### In scope
- TOTP setup with QR code generation
- Token verification before enabling MFA
- MFA disable with password confirmation
- MFA status query
- Backup codes for account recovery
### Out of scope
- SMS or email-based MFA
- Hardware key (WebAuthn/FIDO2)
- Admin-enforced MFA requirement

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/mfaController.ts | setupMfa, verifyMfa, disableMfa, getMfaStatus |
| Backend/src/router/auth.routes.ts | MFA routes mounted at /api/auth/mfa/* |
| Backend/src/models/User.ts | MFA fields: mfaEnabled, mfaMethod, mfaSecret, mfaBackupCodes, mfaVerifiedAt |

### Data model
`	ypescript
// User model MFA fields
interface IUser {
  mfaEnabled: boolean;
  mfaMethod: "totp" | "none";
  mfaSecret?: string;       // TOTP shared secret
  mfaBackupCodes?: string[]; // One-time recovery codes
  mfaVerifiedAt?: Date;
}
`

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| POST | /api/auth/mfa/setup | Yes | Generate TOTP secret and return QR code URI |
| POST | /api/auth/mfa/verify | Yes | Verify TOTP code and enable MFA |
| POST | /api/auth/mfa/disable | Yes | Disable MFA (requires password confirmation) |
| GET | /api/auth/mfa/status | Yes | Return whether MFA is enabled and which method |

## Edge Cases & Error Handling
- Setup called when MFA is already enabled: returns 409 Conflict.
- Verify with expired or invalid TOTP code: returns 400 with description.
- Disable with wrong password: returns 400.
- Backup codes exhausted: user must disable and re-enable MFA.

## Tests
- Unit: __tests__/mfaController.test.ts, __tests__/models/user.test.ts
- Integration: part of __tests__/integration/auth.test.ts

## Open Questions
- Should backup codes be hashed before storage? Currently stored in plaintext. (owner: TBD)

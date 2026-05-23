---
# Feature: AI Credits
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Manages per-user AI usage budgets to prevent runaway costs, with soft enforcement (warn) or hard enforcement (block) depending on configuration.

## User Stories
- As a platform operator, I want to limit AI usage per user so that my API costs stay predictable.
- As a user, I want to see my remaining AI credits so that I know when I'm close to the limit.

## Scope
### In scope
- Per-user credit budget tracking (remaining, reset time, plan type)
- Credit cost estimation per AI operation type
- Credit deduction on successful AI calls
- Auto-refresh credits when the reset time passes
- Soft enforcement mode (warn via header, always allow)
- Hard enforcement mode (block with 402 when exhausted)
- Low-credit and exhausted alerts on the frontend
- Usage spike detection on the frontend

### Out of scope
- Purchase/recharge flow (manual plan assignment only)
- Per-operation pricing tiers

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/utils/aiCredits.ts | assertAiCreditsAvailable, deductAiCredits, refreshAiCreditsIfNeeded |
| Backend/src/utils/creditCalculator.ts | Operation cost estimation by text length |
| Backend/src/middleware/creditDeduction.ts | Express middleware that calculates and attaches estimated cost |
| Backend/src/models/AiUsage.ts | Usage log with provider, tokens, cost, success, fallback |
| Backend/src/models/User.ts | aiCreditsRemaining, aiCreditsResetAt, aiCreditsPlan fields |
| Backend/src/controllers/aiUsageController.ts | Usage stats and history endpoints |
| frontend/src/utils/aiCredits.ts | AICreditsManager singleton with alerts and plan sync |
| frontend/src/services/api.ts | Credit header parsing from AI responses |

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /api/ai/usage-stats | Yes | Get aggregated credit usage stats |
| GET | /api/ai/request-history | Yes | Get paginated request history with credit cost |

## Edge Cases & Error Handling
- If the credit count reaches 0 with enforcement off, the request proceeds and the response includes an x-ai-credits-remaining: 0 header.
- If the credit count reaches 0 with enforcement on, the system returns 402 with a CREDITS_EXHAUSTED error and the reset time.
- If two requests attempt concurrent credit deduction, the system uses an atomic MongoDB update to prevent overspend.
- If the reset time passes during a request, the credits refresh on the next assertion.

## Tests
- Unit: __tests__/utils/aiCredits.test.ts, __tests__/utils/creditCalculator.test.ts, __tests__/creditDeduction.test.ts, __tests__/models/aiUsage.test.ts
- Frontend: __tests__/aiCredits.test.ts

## Open Questions
- None.

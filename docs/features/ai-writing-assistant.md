---
# Feature: AI Writing Assistant
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides AI-powered writing improvements, grammar corrections, and bullet-point enhancement to help users write professional resume content.

## User Stories
- As a user, I want to improve the wording of my resume sections so that they sound more professional.
- As a user, I want to check my resume for grammar errors before submitting it to employers.
- As a user, I want to enhance weak bullet points into strong accomplishment statements.

## Scope
### In scope
- Text improvement: rewrites or improves existing resume text while preserving facts
- Grammar checking: detects and corrects grammatical errors
- Bullet enhancement: converts weak descriptions into strong, quantified accomplishment statements
- Request deduplication: identical requests within 5-10 minutes return cached results
- Credit deduction middleware: estimates and deducts AI credits
- AI provider fallback: OpenAI primary, Gemini secondary
- Hallucination detection: validates AI response consistency with input
- Referential integrity validation on usage records
- Rate limiting per user

### Out of scope
- Full resume rewrite (section-by-section only)
- AI-generated resume from scratch

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/aiController.ts | improveTextHandler, checkGrammarHandler, enhanceBulletHandler |
| Backend/src/router/ai.routes.ts | AI route definitions with rate limiting, dedup, credit deduction |
| Backend/src/services/aiProviders.ts | Provider abstraction — OpenAI and Gemini calls |
| Backend/src/middleware/aiValidation.ts | Input sanitization, length checks, hallucination detection |
| Backend/src/middleware/aiErrorHandler.ts | Error categorization and structured responses |
| Backend/src/middleware/creditDeduction.ts | AI credit cost estimation |
| Backend/src/middleware/requestDeduplication.ts | Content-hash dedup for identical requests |
| Backend/src/middleware/referentialIntegrity.ts | Validates aiusages reference exists |
| Backend/src/controllers/aiUsageController.ts | Usage stats and request history |
| frontend/src/hooks/useAISuggestions.ts | Debounced AI suggestions with dedup and cancellation |
| frontend/src/components/builder/AIAssistantPanel.tsx | AI writing assistant UI panel |

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| POST | /api/ai/improve-text | Yes | Rewrite or improve resume section text |
| POST | /api/ai/check-grammar | Yes | Check text for grammar errors |
| POST | /api/ai/enhance-bullet | Yes | Enhance a bullet point |
| GET | /api/ai/usage-stats | Yes | Get AI usage statistics (tokens, cost) |
| GET | /api/ai/request-history | Yes | Get paginated AI request history |

## Edge Cases & Error Handling
- If the input is empty, the system returns 400 with a validation error.
- If the input exceeds the max length, the system returns 400 with TOO_LONG code.
- If the AI provider times out (12s default), the system falls through to the secondary provider.
- If hallucination is detected, the system returns 422 with HALLUCINATION_DETECTED code and error details.
- If credits are exhausted and enforcement is on, the system returns 402 with CREDITS_EXHAUSTED code.
- If a request is a duplicate, the system returns the cached result (no credit charged).

## Tests
- Unit: __tests__/aiController.test.ts, __tests__/aiValidation.test.ts, __tests__/aiErrorHandler.test.ts, __tests__/aiProviders.test.ts, __tests__/creditDeduction.test.ts, __tests__/requestDeduplication.test.ts, __tests__/aiUsageController.test.ts
- Integration: __tests__/integration/ai.test.ts

## Open Questions
- None.

# Architecture

Last updated: 2026-05-22

## Overview

This project is a SaaS resume builder platform that lets users create, edit, and download ATS-optimized resumes using a drag-free structured editor with AI-powered writing assistance, grammar checking, and ATS scoring. The frontend is a single-page React application hosted on Vercel, and the backend is an Express REST API hosted on Render with a MongoDB database, BullMQ job queues (currently shimmed to run synchronously), and Puppeteer for server-side PDF generation.

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend framework | React | 19.x | UI rendering |
| Build tool | Vite | 8.x | Dev server and production bundling |
| Routing | react-router-dom | 7.x | Client-side routing with lazy-loaded pages |
| State management | Zustand | 5.x | Resume builder editor state |
| Styling | Tailwind CSS | 4.x | Utility-first CSS with shadcn/ui components |
| Animation | Framer Motion | 12.x | UI transitions and micro-interactions |
| PDF (client) | html2canvas + jsPDF | 1.x / 4.x | Client-side PDF rendering fallback |
| Backend framework | Express | 5.x | REST API server |
| Language | TypeScript | 5.9 | Type safety across both tiers |
| Database | MongoDB / Mongoose | 9.x | Document storage with schema validation |
| Cache / rate-limit | Redis (Upstash REST or local) | — | Optional distributed caching and rate limiting |
| Job queues | BullMQ | 5.x | Queue infrastructure (currently shimmed, runs inline) |
| PDF (server) | Puppeteer | 24.x | Server-side resume PDF generation |
| AI providers | OpenAI (GPT-4.1 Mini) / Gemini (2.0 Flash) | — | ATS analysis, text improvement, grammar checking |
| Email | Resend | — | Transactional emails (password reset, account notifications) |
| Auth | JWT + Google OAuth | — | Access/refresh token pair with CSRF protection |
| Observability | OpenTelemetry + Prometheus + Pino | — | Traces, custom metrics, structured logging |
| Compliance | Mongoose plugins | — | Audit trail, soft delete, cascade delete on all models |
| Deployment | Docker / Render (backend), Vercel (frontend) | — | Containerized backend, static frontend hosting |

## Project Structure

```
/
├── Backend/                    # Express REST API (TypeScript, compiled to JS)
│   ├── src/
│   │   ├── app.ts             # Express app factory — middleware stack, route mounting, CORS
│   │   ├── server.ts          # Entry point — DB connect, queue init, browser pool, graceful shutdown
│   │   ├── instrumentation.ts # OpenTelemetry SDK initialization
│   │   ├── config/            # env.ts (Zod schema), db.ts, indexes.ts, openapi.ts
│   │   ├── controllers/       # 11 controllers — auth, resume, AI, admin, templates, observability, etc.
│   │   ├── middleware/        # 17 middleware — auth, CSRF, validation, caching, rate-limit, etc.
│   │   ├── models/            # 15 Mongoose models + 3 global plugins (audit, soft-delete, cascade)
│   │   ├── router/            # 8 route modules — auth, resume, AI, admin, templates, health, etc.
│   │   ├── services/          # Business logic — AI service, observability, template, resume version
│   │   ├── queue/             # BullMQ queue shims (resume download, ATS analysis — run inline)
│   │   ├── processors/        # Job processors — ATS analysis, JD match, grammar, resume
│   │   ├── utils/             # 29 utility modules — tokens, cookies, email, caching, validation
│   │   ├── observability/     # Prometheus metrics (AI, compliance), alerting, logging config
│   │   ├── bootstrap/         # Default template seed on first startup
│   │   ├── errors/            # Custom error classes
│   │   ├── events/            # Event definitions
│   │   ├── types/             # Backend-specific TypeScript types
│   │   ├── validation/        # Zod schemas for request validation
│   │   ├── migrations/        # Database migration scripts
│   │   ├── lib/               # Browser pool, worker shim
│   │   ├── constants/         # Auth constants, cache scopes
│   │   ├── enums/             # Enum definitions
│   │   └── __tests__/         # Vitest unit + integration tests
│   ├── automated-tests/       # Node native test runner tests
│   ├── prompts/               # ATS analysis AI prompt templates (Python files loaded at runtime)
│   ├── manual-tests/          # Ad-hoc console.log-based HTTP verification scripts
│   └── deploy/                # Production deployment config (Dockerfile, render.yaml)
│
├── frontend/                  # React SPA (TypeScript, Vite)
│   ├── src/
│   │   ├── main.tsx           # Entry point — Google OAuth provider, error tracking init
│   │   ├── App.tsx            # Router configuration with lazy-loaded pages
│   │   ├── pages/             # 14 page components (Home, Login, ResumeBuilder, Admin*, etc.)
│   │   ├── components/        # 50+ components organized by domain (admin/, builder/, landing/, etc.)
│   │   ├── hooks/             # 9 custom hooks (useAISuggestions, useMyResume, useObservability, etc.)
│   │   ├── store/             # Zustand store (useResumeBuilderStore with slices)
│   │   ├── services/          # Axios-based API client with CSRF token management
│   │   ├── types/             # TypeScript type definitions (resume-types.ts, admin.types.ts)
│   │   ├── utils/             # 12 utility modules (logger, pdfGenerator, resumePagination, etc.)
│   │   ├── data/              # Static data (templateMeta[], sampleData, component mapping)
│   │   ├── lib/               # Query client, error tracking, general utilities
│   │   └── templates/         # ResumeRenderer — routes to the correct template component by ID
│   ├── e2e/                   # 4 Playwright E2E spec files
│   └── playwright.config.ts
│
├── shared/                    # Shared types and utilities (TypeScript, not published)
│   └── src/
│       ├── ai.ts              # AI-related shared types
│       └── jobs.ts            # BullMQ job data types, connection config, helpers
│
├── docs/                      # Project documentation
│   ├── ARCHITECTURE.md        # This file
│   ├── DEPLOYMENT.md          # Production deployment instructions
│   ├── TESTING_STANDARDS.md   # Testing conventions
│   └── features/              # Feature docs (auth, AI, ATS, etc.)
│
├── docker-compose.yml         # Local development environment
├── DOCKER_LOCAL_SETUP.md      # Docker setup guide
├── README.md                  # Project overview and setup guide
└── TESTING_AND_DOCS_STANDARDS.md
```

## Data Flow

1. **User loads the app.** The browser fetches the Vite-bundled SPA from Vercel. `main.tsx` calls `bootstrapAuthSession()` in `api.ts`, which sends a GET `/api/refresh` request to check for an existing refresh-token cookie and obtain an access token plus a CSRF token.

2. **Session bootstrap response.** If a valid refresh-token cookie exists, the backend issues a new access-token cookie and returns a CSRF token in the JSON body. The frontend stores the CSRF token in an in-memory variable (cannot use `document.cookie` cross-origin). If no cookie exists, the user remains anonymous.

3. **Page navigation.** `react-router-dom` lazy-loads page components. Public routes (`/`, `/login`, `/templates`) are accessible without authentication. Route guards (`RequireRole`) protect admin routes.

4. **API requests.** Every mutating request includes the in-memory CSRF token in the `X-CSRF-Token` header. The API client (`api.ts`) transparently handles 401 responses by attempting a token refresh, and retries transient failures up to 3 times with exponential backoff.

5. **Backend request lifecycle.** Each request passes through the middleware stack in order: `correlationId` → `auditContext` → `requestSizeLimit` → `requestLogger` → `apiVersion` → `helmet` → `cors` → `requestTimeout` → `csrfProtection` → `referentialIntegrity` → `metricsMiddleware` → route handler → `errorHandler`.

6. **Resume CRUD.** The editor (Zustand store) holds the full resume document in memory. On save, the frontend sends a POST or PUT to `/api/resumes`. The backend validates with Zod, checks referential integrity, and persists to MongoDB. Mongoose plugins automatically create an audit log entry, apply soft-delete logic, and cascade-delete related documents.

7. **AI features.** The frontend sends the resume section text to `/api/ai/improve-text` (or `/check-grammar`, `/enhance-bullet`, `/analyze-ats`). The backend routes the request to the configured AI provider (OpenAI or Gemini), validates the response, deducts AI credits, logs usage to `AiUsage`, and returns the result along with credit headers.

8. **PDF generation.** The user clicks "Download" on a resume. For the standard path, the backend enqueues a synchronous job (via the BullMQ shim) that uses Puppeteer to render the resume HTML to PDF. The job status is polled or streamed via SSE. On completion, the PDF is served from the download endpoint.

9. **Admin operations.** Admin users access `/admin` routes. The backend applies `adminGuard` (authenticate + requireAdmin). Template CRUD, analytics dashboard, and compliance audit queries are served with Redis caching where applicable.

## Module Responsibilities

### Backend

| Module | Responsibility |
|--------|---------------|
| `controllers/authController.ts` | User registration, login (email + Google OAuth), password reset, MFA setup and verification, session management |
| `controllers/resumeController.ts` | Resume CRUD — list, get, create, update, delete |
| `controllers/resumeDownloadController.ts` | PDF download job lifecycle — enqueue, poll status, SSE stream, serve completed PDF |
| `controllers/resumeEnhancementController.ts` | ATS analysis, suggestions, resume versioning, role-tailored variants, export presets |
| `controllers/aiController.ts` | AI text improvement, grammar checking, bullet-point enhancement |
| `controllers/aiUsageController.ts` | AI usage statistics and request history |
| `controllers/mfaController.ts` | Multi-factor TOTP setup, verification, disable, and status |
| `controllers/templateController.ts` | Template CRUD (admin), public template listing, dashboard analytics, usage recording |
| `controllers/refreshController.ts` | Access token refresh and CSRF token issuance |
| `middleware/authMiddleware.ts` | JWT access token verification from cookie, user lookup and attachment to request |
| `middleware/adminAuthMiddleware.ts` | Role-based authorization guard (admin/super-admin) |
| `middleware/csrfProtection.ts` | Double-submit cookie pattern — validates `X-CSRF-Token` header against cookie for mutating requests |
| `middleware/correlationId.ts` | W3C traceparent parsing and correlation ID propagation across response headers |
| `middleware/validateRequest.ts` | Zod schema validation for request body, params, and query |
| `middleware/redisCache.ts` | GET response caching in Redis (by configurable scope) with cache-key prefix versioning |
| `middleware/redisRateLimit.ts` | Sliding-window rate limiting per scope/user/IP using Redis |
| `middleware/referentialIntegrity.ts` | Validates MongoDB foreign key references before allowing create/update |
| `middleware/requestDeduplication.ts` | Content-hash deduplication for identical AI requests |
| `middleware/aiErrorHandler.ts` | AI provider error categorization (timeout, rate-limit, auth, malformed) |
| `middleware/aiValidation.ts` | AI input sanitization, length checks, hallucination detection |
| `middleware/creditDeduction.ts` | AI credit cost estimation attached to request |
| `middleware/adminAudit.ts` | Logs admin CRUD actions to AuditLog collection on response finish |
| `middleware/apiVersion.ts` | Reads `x-api-version` header and sets `X-Service-Version` response header |
| `middleware/errorHandler.ts` | Global Express error handler — Sentry capture, PII redaction, compliance metrics |
| `middleware/requestSizeLimit.ts` | Rejects requests exceeding configured body size limit |
| `middleware/requestTimeout.ts` | Configurable timeout (30s default, 120s for PDF routes) with `ETIMEDOUT` rejection |
| `middleware/validate.ts` | Zod schema validation for request body, params, and query (generic middleware factory) |
| `models/User.ts` | User schema with email/password, Google OAuth, MFA, role, AI credits |
| `models/Resume.ts` | Resume document schema — personal info, sections, style, ATS scores |
| `models/Template.ts` | Template schema with layout ID, CSS variables, slots, audience targeting |
| `models/AuditLog.ts` | Compliance audit log — collection, document, user, action, changes, TTL 1 year |
| `models/AiUsage.ts` | AI provider usage tracking — tokens, cost, provider, feature, success/failure |
| `models/AtsAnalysis.ts` | Full ATS analysis results — scores, keyword analysis, grammar issues, action plan |
| `models/Jobs.ts` | Recruiter job listings — title, company, description, required skills |
| `models/ResetToken.ts` | Password reset tokens — hashed token, expiration TTL, resend tracking |
| `models/ResumeDownloadJob.ts` | PDF download job — status, file data, retry counts, timestamps |
| `models/ResumeVersion.ts` | Snapshot-based resume versioning for history diff and restore |
| `models/TemplateUsage.ts` | Daily-bucketed template usage analytics with `recordUse()` helper |
| `models/WorkerHeartbeat.ts` | Worker process health tracking (legacy, currently orphaned) |
| `queue/resumeQueue.ts` | BullMQ resume-download queue shim — jobs run synchronously |
| `queue/atsQueue.ts` | BullMQ ATS-analysis queue shim — jobs run synchronously |
| `queue/resumeQueueEvents.ts` | BullMQ QueueEvents listener — bridges queue events to in-process EventEmitter for SSE |
| `queue/sharedConnection.ts` | Singleton BullMQ Redis connection shared across all queue shims |
| `events/jobEvents.ts` | Centralized in-process EventEmitter for job status SSE streaming |
| `router/auth.routes.ts` | Auth routes — signup, login, logout, Google OAuth, MFA, password reset |
| `router/resume.routes.ts` | Resume routes — CRUD, ATS analysis, download jobs, version history |
| `router/admin.routes.ts` | Admin routes — template CRUD, analytics, dashboard stats (guarded by `adminGuard`) |
| `router/ai.routes.ts` | AI routes — improve-text, check-grammar, enhance-bullet; rate-limited, credit-deducted |
| `router/compliance.routes.ts` | Compliance routes — audit log queries, integrity checks, alert management, CSV export |
| `router/health.routes.ts` | Health routes — readiness, Prometheus metrics, uptime, memory dumps |
| `router/refresh.route.ts` | Refresh routes — POST /refresh (token rotation), GET /csrf (CSRF token issuance) |
| `router/template.routes.ts` | Public template listing with Redis caching |
| `models/plugins/auditTrail.ts` | Mongoose plugin — auto-creates AuditLog entries on create/update/delete/restore |
| `models/plugins/softDelete.ts` | Mongoose plugin — adds `deletedAt`, filters soft-deleted docs, exposes `.softDelete()` / `.restore()` |
| `models/plugins/cascadeDelete.ts` | Mongoose plugin — cascades deletes to child documents (e.g. User → Resume, AiUsage) |
| `services/aiService.ts` | AI provider abstraction — OpenAI, Gemini, and OpenRouter calls with fallback logic |
| `services/dataIntegrityService.ts` | Periodic data integrity checks, orphaned-document detection |
| `observability.ts` | Pino logger, pino-http request logger, OpenTelemetry tracer and metrics |
| `observability/aiMetrics.ts` | Prometheus AI-specific metrics — request count, latency, fallback rate, tokens |
| `observability/complianceMetrics.ts` | Prometheus compliance metrics — audit log, integrity violations, cascade failures |
| `observability/alerting.ts` | Alert dispatching to Slack, PagerDuty, Sentry, email, webhook |
| `utils/authCookies.ts` | Cookie set/clear helpers for access token, refresh token, and CSRF token |
| `utils/generateToken.ts` | JWT access and refresh token signing with configurable TTL |
| `utils/redis.ts` | Redis client management, cache get/set/delete, health check, rate-limit consumption |

### Frontend

| Module | Responsibility |
|--------|---------------|
| `pages/ResumeBuilder.tsx` | Main resume editor — section tabs, AI panel, style panel, live preview |
| `pages/MyResumePage.tsx` | Saved resume listing with side-by-side card grid, download, delete, ATS re-analyze |
| `pages/AdminDashboard.tsx` | Admin analytics — signups, resume counts, AI usage, template trends |
| `pages/AdminTemplates.tsx` | Admin template management — list, create, edit, reorder, publish/unpublish |
| `store/useResumeBuilderStore.ts` | Zustand store — holds full resume document state, UI state, save/load/restore actions |
| `services/api.ts` | Axios instance with CSRF token management, auto-refresh, retry, SSE support |
| `hooks/useAISuggestions.ts` | Debounced AI text improvement with request deduplication and cancellation |
| `hooks/useRequestManager.ts` | In-flight request tracking with abort-controller management |
| `hooks/useMyResume.ts` | Resume list fetching, user profile, completion score calculation |
| `hooks/useAdminTemplate.ts` | Admin template CRUD operations |
| `hooks/useAnalytics.ts` | Admin dashboard analytics data fetching |
| `templates/ResumeRenderer.tsx` | Routes resume data to the correct template component (12 templates) |
| `data/templateMeta.ts` | Static template metadata — IDs, names, colors, descriptions |
| `data/sampleData.ts` | Sample resume data for demo/preview |
| `components/builder/AIAssistantPanel.tsx` | AI writing assistant UI — section selector, improvement mode, credits display |
| `components/builder/ATSAnalysisPanel.tsx` | ATS analysis results — keyword match, section scores, suggestions |
| `components/myResumes/Compiled.tsx` | Compiled resume card grid with side-by-side layout |
| `utils/pdfGenerator.ts` | Client-side PDF via html2canvas + jsPDF |
| `utils/printPreview.ts` | Browser print preview for resume |
| `utils/logger.ts` | Structured client-side logging with localStorage persistence |
| `utils/errorTracking.ts` | Client-side error capture and Sentry dispatch |

## State Management

The frontend uses Zustand for the resume builder editor state. The store (`useResumeBuilderStore`) holds the full `ResumeDocument` (personal info, all sections, style configuration, section ordering, and visibility toggles) plus UI state (active editor tab, focused field, preview scale, export preset, saving flags). Actions cover everything from adding/removing work entries to applying a full template upgrade.

Other state is either local component state (forms, dialogs) or fetched on demand via the hooks layer. The API client in `api.ts` manages CSRF token state in a module-level variable and handles authentication state through cookie-based session detection.

No global store exists for auth state, admin state, or template listings; each consuming component fetches and caches what it needs.

## Auth & Sessions

Authentication uses a dual-cookie JWT strategy with a separate CSRF token for cross-origin safety:

- **Access token.** Short-lived (15 minutes), stored in an HTTP-only, Secure, SameSite=None cookie set by the backend. The frontend never reads it; the `authMiddleware` verifies it on every request.
- **Refresh token.** Longer-lived (7-30 days), stored in an HTTP-only, Secure, SameSite=None cookie. Sent to `/api/refresh` to obtain a new access token without user interaction.
- **CSRF token.** Issued alongside the access token. The backend sends it in the response body and as a client-readable cookie. The frontend stores it in a JavaScript module-level variable and sends it as the `X-CSRF-Token` header on every mutating request. The `csrfProtection` middleware compares the header value against the cookie value (double-submit pattern).
- **Session bootstrap.** On app load, the frontend calls `bootstrapAuthSession()` which hits `/api/refresh` to validate any existing refresh token and get a fresh access token + CSRF token.
- **MFA.** Optional time-based one-time password (TOTP) via authenticator app, managed through the `/api/auth/mfa/*` endpoints.
- **Google OAuth.** The frontend uses `@react-oauth/google` to obtain a Google credential token, then sends it to `/api/auth/google-login` where the backend verifies it with the Google Auth Library and creates or links a user account.

## Database Schema (summary)

The backend uses MongoDB with Mongoose across 12 models:

| Collection | Key fields | Notable indexes |
|-----------|-----------|-----------------|
| `users` | email (unique), password (hashed), role (user/admin/superadmin), googleId (sparse unique), aiCredits*, mfa*, loginAttempts, lockUntil | email unique, googleId unique sparse |
| `resumes` | userId, baseResumeId (variant support), templateId, personalInfo (embedded), sections (embedded), style (embedded), atsScore, atsStatus | userId + timestamps |
| `templates` | layoutId (unique), name, category, audience, status, tag, tags, cssVars (embedded), slots (embedded) | status + sortOrder, category + status |
| `resumedownloadjobs` | jobId (unique), userId, resumeId, status, fileData (Buffer), resultUrl, attempts | jobId unique, userId + status |
| `atsanalyses` | jobId (unique), resumeId, userId, status, overallScore, sectionScores (embedded), keywordAnalysis (embedded) | jobId unique, resumeId + userId |
| `aiusages` | userId, provider, modelName, feature, inputTokens, outputTokens, costUsd, success, fallback | userId + createdAt, provider + createdAt |
| `auditlogs` | collectionName, documentId, userId, action, changes, oldValues, timestamp | createdAt TTL (1yr), documentId + collectionName |
| `resettokens` | userId, token, expiresAt, resendCount | userId, expiresAt TTL |
| `jobs` | recruiterId, title, company, description, skills | recruiterId + createdAt, text indexes |
| `resumeversions` | resumeId, userId, versionNo, snapshot (Mixed) | resumeId + versionNo unique compound |
| `templateusages` | templateId, layoutId, date, count, resumesCreated | templateId + date unique, layoutId + date |
| `workerheartbeats` | workerId (unique), serviceName, status, lastSeenAt | workerId unique, serviceName + queueName |

Three global Mongoose plugins apply to all models: `auditTrail` (logs creates/updates/deletes/restores to AuditLog), `softDelete` (adds `deletedAt` field, filters soft-deleted docs, exposes `.softDelete()` and `.restore()`), and `cascadeDelete` (removes child documents — e.g., deleting a User cascades to Resume, AiUsage, ResumeVersion, and ResumeDownloadJob).

## Key Design Decisions

- **BullMQ queues run synchronously.** The worker service was removed to eliminate operational complexity. `resumeQueue.ts` and `atsQueue.ts` are shims that call the job processor directly instead of enqueuing to Redis. The BullMQ infrastructure (types, connection helpers) remains in the shared module for future scaling but is not actively used in production.

- **PDF generation uses Puppeteer server-side.** The backend renders the resume HTML, opens it in a headless Chromium instance from a pre-warmed browser pool, and prints to PDF. A client-side fallback using `html2canvas` + `jsPDF` is available but not the primary path.

- **CSRF stored in JS memory, not cookies.** Because the frontend (Vercel) and backend (Render) are on different origins, `document.cookie` cannot read the CSRF cookie. The backend sends the CSRF token in every response body, and the frontend keeps it in a module-level variable. This is refreshed on every response so page navigations or reloads do not lose the token.

- **CORS preview origins are opt-in.** The API accepts `FRONTEND_URL`/`FRONTEND_URLS` explicitly, and only allows broad Vercel/Render/localhost origins when `ALLOW_PREVIEW_ORIGINS=true` (intended for non-production preview environments).

- **OpenTelemetry with Grafana Cloud.** Traces, metrics, and logs are exported via OTLP to Grafana Cloud when configured. A fallback Prometheus metrics endpoint (`/metrics`) is available for local or self-hosted monitoring. Sentry provides error tracking on both the backend and frontend.

- **Compliance features are built into the model layer.** Audit trail, soft delete, and cascade delete are Mongoose plugins applied globally, not middleware. This ensures every document operation is logged regardless of which controller or service triggers it. The compliance audit routes expose this data for admin review.

- **AI credits are soft-enforced.** The `AI_CREDITS_ENFORCED` environment variable controls whether AI features are blocked when credits are exhausted. When not enforced, users receive a warning header (`x-ai-credits-remaining: 0`) but requests proceed. Usage is always logged to `AiUsage` regardless of enforcement.

- **AI provider fallback is automatic.** When `AI_PROVIDER` is set to `"auto"`, the backend tries OpenAI first. If OpenAI returns a rate-limit (429) or timeout error, the request falls through to Gemini. If both fail, a categorized error is returned.

## Known Limitations & TODOs

- **AI providers are both rate-limited in production.** Production logs show 429 errors from both OpenAI and Gemini on ATS analysis requests. A retry-with-backoff strategy has not yet been implemented in the AI provider service.

- **Frontend PDF export uses a client-side fallback path.** The primary Puppeteer-based server-side path is correct, but the client-side fallback (`html2canvas` + `jsPDF`) has known rendering inconsistencies with multi-page layouts and custom fonts. The fallback should be used only as a last resort.

- **MFA backup codes are hashed with scrypt + random salt before storage.** The `mfaController.ts` generates codes via `crypto.scryptSync(code, salt, 64)` with a random 16-byte salt. The `mfaBackupCodes` field defaults to `select: false` to prevent accidental exposure.

- **Rate-limit headers may leak internal configuration.** The Redis rate-limit middleware returns `Retry-After` headers with absolute timestamps that could hint at the rate-limit window configuration to attackers.

- **Compliance documentation is fragmented.** Three separate markdown files (`COMPLIANCE_FEATURES.md`, `COMPLIANCE_IMPLEMENTATION_SUMMARY.md`, `COMPLIANCE_QUICK_START.md`) overlap by approximately 80% and should be consolidated into a single reference.

- **Worker heartbeat model is orphaned.** The `WorkerHeartbeat` model tracks worker processes that no longer exist. The model and its associated routes should be removed or repurposed for the synchronous queue shims.

- **No database migration history.** The `migrations/` directory contains migration scripts but the project does not maintain a migration ledger or automated rollback path. Schema changes are applied manually or through Mongoose schema changes that may not be backward-compatible.

- **Refresh token rotation is implemented.** The `refreshController.ts` generates a new refresh token and blacklists the old one on each refresh. Note: there is no token-family replay detection — if an attacker and legitimate user both present the same token within a short window, both may succeed. This is a known limitation.

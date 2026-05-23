# ResumeStudio

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7-FF4438?logo=redis)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

**ATS-verified resume builder with AI-powered content enhancement, live preview, and high-fidelity PDF export.**

ResumeStudio is a full-stack platform that lets users build, style, and export professional resumes. It combines 12 real HTML templates, a live preview editor, an AI writing assistant, and an ATS scoring engine — all wrapped in an authenticated, production-ready application with enterprise-grade observability and security.

---

## Features

### Core Features
- **Resume Builder** — Rich multi-section editor (personal info, experience, education, skills, projects, certifications, languages) with drag-and-drop section reordering
- **12 HTML Templates** — Classic, Executive, Modern, Compact, Sidebar, Scholarly, Research, Chronological, Functional, Combination, Traditional Assistant, Community Impact — all rendered as real DOM, not images
- **Live Preview** — Instant preview updates as you type, with real-time style changes
- **Visual Style Customizer** — Accent colors, heading/body fonts, font sizes, line heights, page margins, section spacing, header alignment, bullet styles, section dividers
- **PDF Export** — Browser-based print with Puppeteer-powered backend generation for pixel-perfect output
- **Authentication** — Email/password signup and login with Google OAuth integration

### Advanced Features
- **AI Writing Assistant** — Context-aware text improvement, grammar checking, and bullet point enhancement using OpenAI GPT-4.1 or Gemini 2.0 Flash with automatic provider fallback
- **ATS Analysis Engine** — Full resume scoring against applicant tracking system criteria: keyword gaps, section audit, action plan with priority levels, rewrite suggestions, and estimated score after fixes
- **Multi-Factor Authentication (MFA)** — TOTP-based two-factor authentication with backup codes
- **Resume Version History** — Automatic version snapshots on each save
- **Async PDF Generation** — In-process PDF generation with status polling and SSE streaming
- **Admin Dashboard** — Usage analytics, template CRUD, per-template usage statistics, most/least used templates

### Security Features
- **CSRF Protection** — Double-submit cookie pattern with automatic token rotation
- **JWT Authentication** — HTTP-only cookies with access + refresh token rotation
- **Rate Limiting** — Redis-backed or in-memory rate limiting per endpoint (login, registration, AI, forgot-password)
- **Account Lockout** — Progressive lockout on failed login attempts
- **Input Validation** — Zod schemas with XSS sanitization on all inputs
- **Helmet Security Headers** — CSP, HSTS, and other HTTP security headers configured for OAuth compatibility
- **Audit Logging** — Automatic audit trail (create, update, delete, restore) with TTL-based retention
- **Request Deduplication** — Prevents duplicate AI/API requests from inflight collisions

### Performance Features
- **Redis Caching** — Template listings, analytics, and dashboard data with configurable TTL
- **In-Memory Cache Fallback** — Optional zero-dependency caching when Redis is unavailable
- **Database Indexes** — Comprehensive compound indexes across all collections for query performance
- **Lazy-Loaded Routes** — React pages split via dynamic imports for smaller initial bundles
- **Puppeteer Browser Pool** — Reusable Chromium instances for PDF generation
- **Connection Pooling** — Mongo connection pool (10–100) tuned for concurrent workloads

### Developer Features
- **OpenAPI 3.0 Docs** — Auto-generated API documentation at `/api/docs`
- **Prometheus Metrics** — Built-in metrics endpoint for performance monitoring
- **OpenTelemetry Integration** — Distributed tracing across HTTP, Express, and MongoDB
- **Sentry Error Tracking** — Client and server error capture with user context
- **Pino Structured Logging** — JSON logging with Loki push support
- **Health Checks** — Deep health endpoint with component-level status reporting
- **Render Deployment Config** — One-click deploy to Render via `render.yaml`

---

## Tech Stack

### Frontend
| Technology | Version |
|---|---|
| React | 19.2 |
| TypeScript | 5.9 |
| Vite | 8.0 |
| Tailwind CSS | 4.2 |
| React Router | 7.13 |
| Zustand | 5.0 |
| Axios | 1.13 |
| Framer Motion | 12.38 |
| html2canvas + jsPDF | Client-side print |
| Lucide React | Icons |
| Radix UI / Shadcn | Component primitives |
| Vitest + Playwright | Testing |
| Sentry React | Error tracking |

### Backend
| Technology | Version |
|---|---|
| Node.js | 20+ |
| Express | 5.2 |
| TypeScript | 5.9 |
| Mongoose | 9.3 |
| Redis (ioredis) | 5.8 |

| Puppeteer | 24.43 |
| Zod | 4.3 |
| Pino | 10.3 |
| Sentry Node | 10.22 |
| OpenTelemetry | SDK 0.214 |
| Prometheus (prom-client) | 15.1 |
| jsonwebtoken | 9.0 |
| bcrypt | 6.0 |
| Resend | 4.0 |
| google-auth-library | 10.6 |
| Helmet | 8.1 |

### Database
- **MongoDB 7** — Primary data store (users, resumes, templates, analytics, audit logs, AI usage)
- **Redis 7** — Caching, rate limiting
- Indexes: Compound indexes on all collections with `createAllIndexes()` migration script

### Infrastructure
- **Docker Compose** — Full-stack orchestration (backend, frontend, MongoDB, Redis)
- **Render** — One-click deploy via `render.yaml`
- **PM2** — Process management via `ecosystem.config.js`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Builder   │ │ My       │ │ Landing  │ │ Admin         │  │
│  │ Editor    │ │ Resumes  │ │ Pages    │ │ Dashboard     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│       │            │            │               │           │
│       └────────────┴────────────┴───────────────┘           │
│                          │ HTTP (Axios + CSRF)               │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│              Express 5 API (Node.js)                        │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Auth     │  │ Resume   │  │ AI       │  │ Admin      │ │
│  │ Router   │  │ Router   │  │ Router   │  │ Router     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       │             │             │               │         │
│  ┌────┴─────────────┴─────────────┴───────────────┴──────┐ │
│  │              Middleware Pipeline                       │ │
│  │  CORS → Helmet → CSRF → Auth → Rate-Limit → Cache    │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                │
│  ┌─────────────────────────┴─────────────────────────────┐ │
│  │              Services Layer                            │ │
│  │  ResumeService  │  AIService  │  TemplateService      │ │
│  │  ATS Analysis   │  PDF Gen    │  Analytics            │ │
│  └────┬────────────────────┬──────────────────┬──────────┘ │
│       │                    │                  │             │
│  ┌────┴────┐         ┌────┴────┐              
│  │ MongoDB │         │  Redis  │                          │
│  │ (7)     │         │  (7)    │                          │
│  └─────────┘         └─────────┘                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Observability Stack                                │  │
│  │   Sentry │ OpenTelemetry │ Prometheus │ Pino/Loki   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Request Lifecycle
1. **Browser → API**: Axios client injects CSRF token from cookie into `X-CSRF-Token` header
2. **Express Middleware**: CORS → Helmet → Correlation ID → CSRF verification → Rate limit check → Auth (JWT cookie verification) → Cache lookup
3. **Controller**: Zod validation → Service logic → MongoDB query (with Mongoose audit plugin) → Cache set
4. **Response**: JSON with `x-ai-credits-remaining` header (for AI endpoints)
5. **Observability**: Each request is traced via OpenTelemetry spans; errors captured by Sentry; metrics recorded in Prometheus

### Project Structure
```
Project/
├── Backend/                          # Express 5 API server
│   ├── src/
│   │   ├── server.ts                 # Entry point (DB, Puppeteer, shutdown)
│   │   ├── app.ts                    # Express app setup (middleware, routes)
│   │   ├── instrumentation.ts        # OpenTelemetry initialization
│   │   ├── observability.ts          # Pino, Prometheus, Loki config
│   │   ├── config/                   # env, db, sentry, indexes, openapi, puppeteer
│   │   ├── middleware/               # 18 middleware (auth, csrf, cache, rate-limit, etc.)
│   │   ├── models/                   # 12 Mongoose models + 3 plugins
│   │   ├── controllers/              # 8 controllers
│   │   ├── router/                   # 8 route files
│   │   ├── services/                 # AI, Templates, Versions, Data Integrity
│   │   ├── validation/               # Zod schemas with sanitization
│   │   ├── queue/                    # Job queue definitions
│   │   ├── processors/               # ATS, Resume, Job Match, Grammar processors
│   │   ├── utils/                    # 26 utilities (Redis, tokens, email, etc.)
│   │   └── __tests__/                # 75+ test files
│   ├── Dockerfile
│   ├── render.yaml                   # Render deployment config
│   ├── ecosystem.config.js           # PM2 process config
│   └── .env.example
├── frontend/                         # React 19 SPA
│   ├── src/
│   │   ├── App.tsx                   # Router setup with lazy-loaded routes
│   │   ├── main.tsx                  # Entry point (Google OAuth, Sentry, Auth bootstrap)
│   │   ├── pages/                    # 11 page components
│   │   ├── components/               # Landing, Builder, MyResumes, Admin, Templates, UI
│   │   ├── store/                    # Zustand (useResumeBuilderStore)
│   │   ├── hooks/                    # 5 custom hooks
│   │   ├── services/api.ts           # Axios instance with CSRF, retry, 401 refresh
│   │   ├── types/                    # Shared TypeScript types
│   │   └── utils/                    # Print, PDF, logging, performance, AI credits
│   ├── vite.config.ts
│   └── index.html                    # SEO-optimized with OG/Twitter meta
└── shared/                           # Shared TypeScript contracts
    └── src/
        ├── ai.ts                     # AI operation types and helpers
        └── jobs.ts                   # Job data types and utilities
```

---

## Screenshots

| Page | Description |
|---|---|
| `/screenshots/landing.png` | Landing page with Hero, Features, Template carousel, How It Works, CTA |
| `/screenshots/builder-editor.png` | Resume builder with form editor panel (personal info, experience, education sections) |
| `/screenshots/builder-preview.png` | Builder with live A4 preview panel showing real-time template rendering |
| `/screenshots/builder-style.png` | Style customizer panel (color themes, typography, layout, decorations) |
| `/screenshots/builder-ai.png` | AI Assistant drawer with tone selection, improve/grammar actions, suggestions |
| `/screenshots/ats-analysis.png` | ATS analysis panel with score ring, missing keywords, section audit, action plan |
| `/screenshots/my-resumes.png` | Resume grid with search, sort, preview/duplicate/delete actions |
| `/screenshots/resume-preview.png` | Full-screen resume preview modal with zoom controls and section info |
| `/screenshots/admin-dashboard.png` | Admin dashboard with usage charts, most/least used templates, analytics table |
| `/screenshots/admin-templates.png` | Admin template management with status/category filters, CRUD modal |
| `/screenshots/login.png` | Login page with email/password and Google OAuth button |

---

## Installation

### Prerequisites
- **Node.js** >= 20
- **Docker** (for MongoDB + Redis)
- **npm** (included with Node.js)

### 1. Clone and Install
```bash
git clone https://github.com/Rahul-Karki/Resume-Builder-Project.git
cd Resume-Builder-Project

# Install all dependencies (root, Backend, frontend)
npm install
cd Backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Start Infrastructure (MongoDB + Redis)
```bash
docker-compose up -d mongo redis
```

### 3. Configure Environment
```bash
cp Backend/.env.example Backend/.env
cp frontend/.env.example frontend/.env
```
Edit `Backend/.env` with your credentials (at minimum: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).

### 4. Build Shared Types
The `shared/` workspace is referenced by the backend via TypeScript project references. The build step compiles it automatically.

### 5. Run Database Migrations
```bash
cd Backend
npm run migrate:up
```

### 6. Start Development Servers
```bash
# Terminal 1 — Backend
cd Backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:5000`.

### 7. Full-Stack Production Build
```bash
docker-compose up -d --build
```

---

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Application environment |
| `PORT` | Yes | `5000` | API server port |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | — | JWT signing key (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token signing key (min 32 chars) |
| `FRONTEND_URL` | Yes | — | CORS origin for frontend |
| `GOOGLE_CLIENT_ID` | For OAuth | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | — | Google OAuth client secret |
| `RESEND_API_KEY` | For email | — | Resend API key for password reset emails |
| `REDIS_URL` | Recommended | `redis://localhost:6379/0` | Redis connection URL |

| `AI_PROVIDER` | For AI | `auto` | `openai`, `gemini`, or `auto` (fallback) |
| `OPENAI_API_KEY` | For OpenAI | — | OpenAI API key |
| `GEMINI_API_KEY` | For Gemini | — | Gemini API key |
| `SENTRY_DSN` | Optional | — | Sentry error tracking DSN |
| `ENABLE_METRICS` | No | `true` | Enable Prometheus `/metrics` endpoint |
| `LOG_LEVEL` | No | `info` | Pino log level |

See `Backend/.env.example` for the complete list (97 variables).

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:5000/api` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | For OAuth | — | Google OAuth client ID |
| `VITE_SENTRY_DSN` | Optional | — | Sentry DSN for frontend error tracking |

---

## API Documentation

The server exposes OpenAPI 3.0 documentation at `/api/docs` when running. Below are the primary endpoints.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register new user (name, email, password) |
| POST | `/api/auth/login` | No | Login (email, password); returns HTTP-only cookies |
| POST | `/api/auth/google-login` | No | Google OAuth authentication (credential token) |
| POST | `/api/auth/logout` | Cookie | Clear session |
| GET | `/api/auth/me` | Cookie | Get current user profile |
| POST | `/api/auth/forgot-password` | No | Request password reset email |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| GET | `/api/csrf` | Cookie | Issue new CSRF token |

### Multi-Factor Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/mfa/setup` | Cookie | Generate TOTP secret and QR code |
| POST | `/api/auth/mfa/verify` | Cookie | Verify and activate MFA |
| POST | `/api/auth/mfa/disable` | Cookie | Disable MFA |
| GET | `/api/auth/mfa/status` | Cookie | Get MFA status |

### Resumes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/resumes` | Cookie | List user's resumes (paginated, with ATS scores) |
| GET | `/api/resumes/:id` | Cookie | Get single resume with full data |
| POST | `/api/resumes` | Cookie | Create new resume |
| PUT | `/api/resumes/:id` | Cookie | Update resume |
| DELETE | `/api/resumes/:id` | Cookie | Soft-delete resume |

### Resume Enhancements

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/resumes/:id/analyze-ats` | Cookie | Queue ATS analysis job |
| GET | `/api/resumes/:id/ats-analysis` | Cookie | Get latest ATS analysis results |
| POST | `/api/resumes/:id/ats/suggestions/apply` | Cookie | Apply ATS rewrite suggestion |
| POST | `/api/resumes/:id/download` | Cookie | Queue PDF generation job |
| GET | `/api/resumes/:id/download/status/:jobId` | Cookie | Poll download job status |
| GET | `/api/resumes/:id/download/result/:jobId` | Cookie | Stream completed PDF |
| GET | `/api/resumes/:id/preview` | Cookie | Get preview rendering data |

### AI

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/improve-text` | Cookie | Improve resume text (summary, descriptions) |
| POST | `/api/ai/check-grammar` | Cookie | Grammar check on text section |
| POST | `/api/ai/enhance-bullet` | Cookie | Enhance bullet points with action verbs |
| GET | `/api/ai/usage/stats` | Cookie | Get AI credit usage statistics |
| GET | `/api/ai/usage/history` | Cookie | Get AI request history |

### Templates

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/templates` | No | List published templates (cached) |
| GET | `/api/templates/:id` | No | Get single template |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/templates` | Admin | List all templates (all statuses) |
| POST | `/api/admin/templates` | Admin | Create template |
| PUT | `/api/admin/templates/:id` | Admin | Update template |
| DELETE | `/api/admin/templates/:id` | Admin | Delete template |
| PUT | `/api/admin/templates/:id/status` | Admin | Set template status |
| PUT | `/api/admin/templates/:id/premium` | Admin | Toggle premium status |
| POST | `/api/admin/templates/reorder` | Admin | Reorder template sort positions |
| GET | `/api/admin/dashboard` | Admin | Dashboard stats (total templates, uses) |
| GET | `/api/admin/analytics` | Admin | Per-template usage analytics |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/deep` | Deep health (DB, Redis connectivity) |
| GET | `/api/health/uptime` | Server uptime and resource stats |
| GET | `/metrics` | Prometheus metrics (if enabled) |

---

## Database Schema Overview

### Collections

#### `users`
| Field | Type | Notes |
|---|---|---|
| `name` | String | User's full name |
| `email` | String | Unique, indexed |
| `password` | String | bcrypt hashed, `select: false` |
| `role` | String | `user`, `admin`, `superadmin`, `recruiter` |
| `googleId` | String | Optional Google OAuth identifier |
| `authProvider` | String[] | `["local"]`, `["google"]`, or both |
| `aiCredits` | Number | Available AI credits |
| `mfa.totp.secret` | String | Encrypted TOTP secret |
| `mfa.totp.enabled` | Boolean | MFA active |
| `mfa.backupCodes` | String[] | One-time backup codes (hashed) |
| `loginAttempts` | Number | Failed consecutive login attempts |
| `lockUntil` | Date | Account lockout expiry |

#### `resumes`
| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Reference to User |
| `title` | String | Resume display name |
| `templateId` | String | Template layout identifier |
| `personalInfo` | Embedded | name, email, phone, location, linkedin, github, portfolio, summary |
| `sections` | Embedded | experience[], education[], skills[], projects[], certifications[], languages[] |
| `style` | Embedded | accentColor, headingColor, bodyFont, fontSize, lineHeight, pageMargin, etc. |
| `sectionOrder` | String[] | Custom ordering of sections |
| `sectionVisibility` | Embedded | Per-section visibility toggle |
| `atsScore` | Number | Latest ATS score |
| `atsStatus` | String | `pending`, `completed`, `failed` |

#### `templates`
| Field | Type | Notes |
|---|---|---|
| `layoutId` | String | Unique slug identifier |
| `name` | String | Display name |
| `description` | String | Template description |
| `category` | String | Template category |
| `audience` | String | `tech` or `non-tech` |
| `status` | String | `draft`, `published`, `archived` |
| `isPremium` | Boolean | Premium-only access |
| `cssVars` | Embedded | accentColor, bodyFont, headingFont, etc. |
| `slots` | Embedded | Section visibility defaults |
| `sortOrder` | Number | Display ordering |

#### `ats_analyses`
| Field | Type | Notes |
|---|---|---|
| `resumeId` | ObjectId | Reference to Resume |
| `userId` | ObjectId | Reference to User |
| `status` | String | `queued`, `processing`, `completed`, `failed` |
| `overallScore` | Number | 0–100 composite score |
| `sectionScores` | Embedded | Per-section scoring breakdown |
| `keywordAnalysis` | Embedded | Present and missing keywords |
| `rewriteSuggestions` | Embedded[] | Section-specific rewrite recommendations |
| `actionPlan` | Embedded[] | Prioritized improvement actions |
| `quickWins` | String[] | Easy improvement items |
| `grade` | String | Letter grade |

#### `template_usage`
| Field | Type | Notes |
|---|---|---|
| `templateId` | ObjectId | Reference to Template |
| `layoutId` | String | Template layout identifier |
| `date` | Date | Day bucket (YYYY-MM-DD) |
| `count` | Number | Total uses on this date |
| `resumesCreated` | Number | Resumes created on this date |
| `resumesEdited` | Number | Resumes edited on this date |

#### Additional Collections
- `resume_versions` — Snapshot history with version numbers and notes
- `resume_download_jobs` — PDF generation job tracking with status and file data
- `ai_usage` — Per-request AI token/cost tracking with provider and model info
- `reset_tokens` — Password reset tokens with TTL indexes and resend tracking
- `audit_logs` — Immutable audit trail with TTL-based auto-cleanup (1 year)


### Indexes
The project defines comprehensive compound indexes in `Backend/src/config/indexes.ts` for:
- User lookups (email, googleId, role)
- Resume queries (userId + updatedAt, userId + atsScore, title text search)
- Template queries (status + audience + sortOrder, layoutId unique)
- ATS analysis queries (resumeId + createdAt)
- Template usage aggregation queries (templateId + date, layoutId + date)
- Audit log queries (collectionName + documentId + createdAt)
- Job status queries (status + createdAt)

---

## Scripts

### Root
| Script | Command |
|---|---|
| `npm run build` | Build Backend + frontend |
| `npm run lint` | Lint frontend |
| `npm run test` | Run all tests |
| `npm run verify` | Lint → Build → Test |

### Backend
| Script | Command |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Production start with instrumentation |
| `npm test` | Build + run automated test suite (node --test) |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:vitest` | Run Vitest tests |
| `npm run migrate:up` | Run database migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run backup` | Run database backup script |

### Frontend
| Script | Command |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint check |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |

---

## Production Deployment

### Docker Compose (Recommended)
```bash
docker-compose up -d --build
```
This starts four services:
- **mongo** — MongoDB 7 with persistent volume
- **redis** — Redis 7-alpine with AOF persistence
- **backend** — Express API with Puppeteer, health checks, depends on mongo + redis
- **frontend** — Vite build served via Nginx on port 80

### Render
A `render.yaml` is included for one-click deployment:
```bash
# Deploy via Render dashboard → Blueprint → Connect repo
# Or use render-cli:
render deploy
```
Key settings in `render.yaml`:
- Node runtime, free tier compatible
- Puppeteer Chrome installed via build command
- All env vars configured with secure sync:false for secrets

### PM2 (Process Management)
```bash
pm2 start ecosystem.config.js
```

### Manual Production Build
```bash
# Build shared types first
cd Backend && npm run build && cd ..

# Build frontend
cd frontend && npm run build && cd ..

# Start backend
cd Backend && NODE_ENV=production node -r ./dist/Backend/src/instrumentation.js dist/Backend/src/server.js
```

Serve the `frontend/dist/` directory via Nginx, configured to proxy `/api/*` to the backend at port 5000.

### Required Infrastructure
- **MongoDB** — Atlas (free tier sufficient) or self-hosted
- **Redis** — Upstash (free tier) or self-hosted (optional with `USE_MEMORY_ONLY_CACHE=true`)
- **Email** — Resend account for password reset emails
- **Google OAuth** — GCP project with configured redirect URIs
- **AI Provider** — OpenAI or Gemini API key

---

## Performance Optimizations

- **API Response Caching**: Template listings cached in Redis with configurable TTL. Analytics data cached for dashboard performance.
- **In-Memory Cache Mode**: `USE_MEMORY_ONLY_CACHE=true` eliminates Redis dependency for caching/rate-limiting (uses Maps + `setTimeout` cleanup).
- **Database Indexes**: 60+ compound indexes across all collections with dedicated migration runner.
- **MongoDB Connection Pool**: `minPoolSize: 10, maxPoolSize: 100` for concurrent workload handling.
- **Lazy Route Loading**: React pages loaded via `React.lazy()` with Suspense fallback.
- **Puppeteer Browser Pool**: Reusable browser instances avoid cold-start latency for PDF generation.
- **Request Deduplication**: Inflight request tracking prevents duplicate API calls for identical payloads.
- **In-Process Job Processing**: ATS analysis and PDF generation run within the application process.
- **Graceful Shutdown**: SIGINT/SIGTERM handlers close connections cleanly.

---

## Security

- **CSRF Protection**: Double-submit cookie pattern — compares `csrfToken` cookie against `X-CSRF-Token` header with automatic rotation on refresh.
- **JWT Authentication**: Access tokens in HTTP-only cookies (not accessible to JavaScript). Refresh token rotation invalidates old tokens.
- **Rate Limiting**: Separate rate limiters for auth endpoints (login, forgot-password), AI endpoints, and general API with Redis backing.
- **Account Lockout**: Progressive lockout: 5 failed attempts → 15 min lock, 10 → 30 min, 15 → 1 hour.
- **Input Sanitization**: All text input sanitized via `sanitizePlainText()` before storage (strips HTML tags, limits length).
- **Password Policy**: Minimum 8 characters, must include uppercase, lowercase, and special character.
- **Helmet**: Secure HTTP headers with CSP allowing Google OAuth and Sentry.
- **Audit Logging**: Automatic immutable audit trail for all create/update/delete operations across models.
- **Soft Delete**: All destructive operations use `deletedAt` flag with `withDeleted` query helper for recovery.
- **CORS**: Whitelist configured via `FRONTEND_URL` / `FRONTEND_URLS` with credentials support for cookie auth.
- **Security Logging**: Failed login attempts, lockout events, and suspicious activity logged via `securityLogger`.

---

## Testing

### Framework
- **Backend**: Node.js built-in test runner (`node --test`) with Supertest for HTTP assertions
- **Frontend**: Vitest for unit tests, Playwright for E2E browser tests
- **Mocks**: MongoDB Memory Server for integration tests, mock AI responses for AI service tests

### Run Tests
```bash
# All tests
npm test

# Backend tests
cd Backend
npm test              # Full test suite
npm run test:unit     # Unit tests only
npm run test:integration  # Integration with supertest

# Frontend tests
cd frontend
npm test              # Vitest unit tests
npm run test:e2e      # Playwright E2E tests

# CI pipeline
npm run verify        # lint → build → test
```

### Test Coverage
- Controllers (auth, resume, AI, admin, template)
- Services (AI, versioning)
- Middleware (auth, CSRF, rate limiting)
- Validation schemas
- Utilities (token generation, hash, sanitization)
- Frontend stores (Zustand resume builder)
- Frontend hooks (useMyResume, useAdminTemplate, useAISuggestions, useAnalytics)

### Manual Tests
The `Backend/manual-tests/` directory includes scripts for:
- Rate limit testing (login, forgot-password)
- Cache hit validation (templates)
- Production download flow

---

## Future Improvements

- **Collaborative Editing** — Real-time collaboration on resumes via WebSockets or CRDTs
- **Job Board Integration** — Parse job descriptions and auto-suggest keyword-optimized resume content
- **LinkedIn Import** — Import profile data via LinkedIn API to pre-fill resume fields
- **Cover Letter Generator** — AI-powered cover letter generation from resume data
- **Multi-Language Support** — i18n for international users
- **Template Marketplace** — Allow community-contributed templates with review process
- **Bulk Operations** — Export/download multiple resumes as ZIP archive
- **Webhook System** — Notify external services on resume save/publish events
- **Mobile App** — React Native wrapper for on-the-go resume editing

---

## Contributing

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Write TypeScript in strict mode — no `any` types unless absolutely necessary
- All new features must include tests (unit + integration where applicable)
- Follow the existing patterns for controllers, services, middleware, and validation
- Ensure Zod validation schemas cover all new API inputs
- Run `npm run verify` before submitting a PR
- Use conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`)

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the component primitives

- [Resend](https://resend.com/) for email delivery
- [Google OAuth](https://developers.google.com/identity) for authentication
- [OpenAI](https://openai.com/) and [Google Gemini](https://deepmind.google/technologies/gemini/) for AI capabilities

---

*Built with TypeScript, React, Express, MongoDB, and Redis.*

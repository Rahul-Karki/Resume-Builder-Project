# Resume Builder SaaS

A full-stack resume builder platform with authentication, resume editing, template browsing, and admin tools.

## Repository Layout

- Backend: Node.js, Express, TypeScript, MongoDB
- frontend: React, TypeScript, Vite, Zustand

## Features

- Email and password signup/login
- Google OAuth login
- JWT access and refresh token flow
- Resume create, edit, list, and delete
- Template browsing and admin template management
- ATS analysis and suggestion apply flow
- CSRF protection, CORS controls, request validation
- Redis and Upstash-backed distributed cache and rate limiting

## Local Run

### Backend

1. Open terminal in Backend.
2. Install dependencies.
3. Configure env vars.
4. Start dev server.

```bash
cd Backend
npm install
npm run dev
```

### Frontend

1. Open terminal in frontend.
2. Install dependencies.
3. Configure frontend env vars.
4. Start Vite dev server.

```bash
cd frontend
npm install
npm run dev
```

## Backend Environment Variables

Core:
- NODE_ENV
- PORT
- MONGO_URI
- FRONTEND_URL
- FRONTEND_URLS
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- RESEND_API_KEY
- RESEND_FROM or EMAIL_FROM
- GOOGLE_CLIENT_ID

Cache and rate limiting:
- REDIS_URL
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- REDIS_CACHE_TTL_SECONDS
- REDIS_RATE_LIMIT_WINDOW_MS
- REDIS_RATE_LIMIT_MAX

Provider selection order:
1. REDIS_URL (Redis protocol mode)
2. UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Upstash REST mode)
3. No provider configured: middleware fails open

## Cache and Rate-Limit Flow

### Cache flow

1. Request hits cache middleware.
2. Middleware resolves cache scope and cache key.
3. If payload exists, returns HIT response immediately.
4. If payload missing, request goes to controller and successful 2xx response is cached.
5. On write operations, affected cache scope is invalidated.

### Rate-limit flow

1. Middleware increments key counter scoped by route and user/ip.
2. Window TTL is applied when counter starts.
3. If count exceeds max, request is blocked with status 429.
4. If cache backend is unavailable, middleware fails open.

## Routes with Cache Applied

- GET /api/templates
- GET /api/admin/analytics/dashboard
- GET /api/admin/analytics/templates
- GET /api/admin/templates
- GET /api/admin/templates/:id
- GET /api/resumes (per-user scoped cache)
- GET /api/resumes/:id (per-user scoped cache)

## Routes with Rate Limiting Applied

- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/resend
- POST /api/auth/google-login
- POST /api/admin/templates
- PUT /api/admin/templates/reorder
- PUT /api/admin/templates/:id
- PATCH /api/admin/templates/:id/status
- PATCH /api/admin/templates/:id/premium
- DELETE /api/admin/templates/:id
- POST /api/admin/usage

## Invalidation Rules

- Template create/update/delete/reorder/status changes invalidate template cache scopes.
- Resume create/update/delete invalidates current user resume scope.
- ATS suggestion apply invalidates current user resume scope.

## Basic Hit-and-Trial Testing

Build validation:

```bash
cd Backend
npm run build
```

## Manual Testing Procedure

### 1. Public templates cache

1. Call GET /api/templates.
2. Confirm response header X-Cache is MISS.
3. Call GET /api/templates again.
4. Confirm response header X-Cache is HIT.

### 2. Resume per-user cache isolation

1. Login as user A.
2. Call GET /api/resumes twice and confirm MISS then HIT.
3. Login as user B.
4. Call GET /api/resumes and verify no user A data appears.

### 3. Resume invalidation after writes

1. Call GET /api/resumes until HIT.
2. Create or update resume.
3. Call GET /api/resumes and confirm MISS.
4. Call GET /api/resumes again and confirm HIT.

### 4. Rate-limit behavior

1. Repeatedly call POST /api/auth/login with bad credentials.
2. Confirm status 429 appears after threshold.
3. Confirm X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After headers.

## Screenshot Checklist for README Test Evidence

Add these screenshots:

1. Terminal output for npm run build.
2. First GET /api/templates showing X-Cache MISS.
3. Second GET /api/templates showing X-Cache HIT.
4. User A GET /api/resumes showing cache headers.
5. User B GET /api/resumes showing separate response and cache behavior.
6. Resume write request followed by GET /api/resumes showing invalidation (MISS then HIT).
7. Rate-limit 429 response including retry headers.

## Deployment Notes

- Dockerfiles are available for backend and frontend.
- docker-compose.yml supports local development services.
- render.yaml is used for backend deployment settings.
- vercel.json is used for frontend SPA routing on Vercel.

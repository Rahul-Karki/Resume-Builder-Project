# Resume Builder SaaS

A full-stack resume builder platform with authentication, resume editing, template browsing, and an admin dashboard.

This repository is split into:
- `Backend` - Node.js, Express, TypeScript, MongoDB
- `frontend` - React, TypeScript, Vite, Zustand

## What It Does

- Email/password signup and login
- Google OAuth login
- JWT access and refresh token session flow
- Resume create, edit, save, load, and delete
- Style customization for fonts, spacing, colors, and layout
- Section visibility and ordering controls
- Live resume preview and browser-based PDF export
- Public template browsing and template initialization
- Admin analytics and template management
- Security hardening with Helmet, CORS, and CSRF protection
- Request validation, structured logging, and metrics/tracing

## Project Structure

### Backend

- `src/config/` - database and environment setup
- `src/controllers/` - auth, resume, template, and refresh handlers
- `src/middleware/` - auth, CSRF, and validation middleware
- `src/models/` - MongoDB models for users, resumes, templates, reset tokens, usage, and versions
- `src/router/` - route registration by feature area
- `src/services/` - template and resume version helpers
- `src/utils/` - token helpers, email, cookies, logging helpers
- `src/validation/` - Zod schemas for request payloads

### Frontend

- `src/pages/` - route-level pages like home, login, builder, resumes, templates, and admin
- `src/components/` - UI grouped by domain
- `src/store/` - Zustand resume builder state
- `src/services/` - Axios client and session bootstrap
- `src/templates/` - resume rendering engine
- `src/types/` - shared TypeScript contracts

## Running Locally

### Backend

1. Install dependencies in `Backend`.
2. Set environment variables for MongoDB, frontend URL, JWT secrets, email provider, and OAuth.
3. Start the server on the configured port.

### Frontend

1. Install dependencies in `frontend`.
2. Set `VITE_API_BASE_URL` to the backend API URL.
3. Start the Vite dev server.

## Environment Variables

### Backend

- `NODE_ENV`
- `PORT`
- `MONGO_URI`
- `FRONTEND_URL`
- `FRONTEND_URLS`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM` or `EMAIL_FROM`
- `GOOGLE_CLIENT_ID`

### Frontend

- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

## Notes

- The builder now focuses on resume creation, editing, preview, and export.
- Public share links and the separate Pro panel have been removed.
- The admin dashboard still provides template and usage insights.

## Deployment

- Dockerfiles are included for both apps.
- `docker-compose.yml` can be used for local development with MongoDB.
- `render.yaml` and `vercel.json` support deployment targets.

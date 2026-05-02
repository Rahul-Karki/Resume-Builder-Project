# Frontend Environment Variables Setup

## Overview

This frontend uses **Vite** as the build tool. Vite has specific requirements for environment variables:

- ✅ Variables prefixed with `VITE_` are exposed to client-side code
- ✅ Variables without `VITE_` prefix are only available in Node.js context (config files, build time)
- ❌ `process.env` is not available in client code (use `import.meta.env` instead)

## Setup Instructions

### 1. Create `.env.local` for Local Development

Copy `.env.example` to `.env.local` and customize as needed:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

**Note**: `.env.local` is gitignored and only used for local development.

### 2. Environment Variables

| Variable | Usage | Example |
|----------|-------|---------|
| `VITE_BASE_URL` | Frontend application URL | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Backend API endpoint | `http://localhost:5000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | `your_client_id.apps.googleusercontent.com` |

### 3. Accessing Environment Variables in Code

**✅ Correct way (client code):**
```typescript
// In React components
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.MODE === "development";
```

**❌ Wrong way (will not work in Vite):**
```typescript
// Don't use process.env in client code
const apiUrl = process.env.VITE_API_BASE_URL; // ❌ undefined
```

**✅ Correct way (server/config files):**
```typescript
// In playwright.config.ts, vite.config.ts, etc.
const apiUrl = process.env.VITE_API_BASE_URL; // ✅ works
```

### 4. Playwright E2E Tests

Environment variables are automatically loaded from `.env.local` when running Playwright tests:

```bash
npm run test:e2e
npx playwright test
```

Test configuration uses:
- `VITE_BASE_URL` → Frontend URL to test against
- `VITE_API_BASE_URL` → Backend API for test requests

### 5. Build Time vs Runtime

**Vite replaces env variables at build time:**

```typescript
// During build, this gets replaced:
const apiUrl = import.meta.env.VITE_API_BASE_URL;

// Becomes:
const apiUrl = "http://localhost:5000/api";
```

**For dynamic environment variables:**
- Use environment variables to start the dev server: `VITE_API_BASE_URL=... npm run dev`
- Or modify `.env.local` and restart the dev server

### 6. Production Deployment

For production builds:

```bash
# Build with custom API URL
VITE_API_BASE_URL=https://api.production.com npm run build
```

Or set `.env.production`:
```env
VITE_BASE_URL=https://app.production.com
VITE_API_BASE_URL=https://api.production.com
VITE_GOOGLE_CLIENT_ID=production_google_client_id
```

### 7. Troubleshooting

**Issue**: `process.env.VITE_API_BASE_URL` is `undefined` in React component
- **Solution**: Use `import.meta.env.VITE_API_BASE_URL` instead

**Issue**: Environment variables not loading in Playwright tests
- **Solution**: Ensure `.env.local` exists and `dotenv` is configured in `playwright.config.ts`

**Issue**: Changes to `.env.local` not reflected
- **Solution**: Restart dev server (`npm run dev`)

### References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-modes.html)
- [Playwright Configuration](https://playwright.dev/docs/test-configuration)

# Testing & Documentation Standards
# Resume Builder SaaS — Conventional Reference Guide

Last updated: 2026-05-22  
Applies to: All modules, all contributors

> This document is the single source of truth for how we write tests and documentation.  
> When in doubt, refer here before writing a single line.

---

## Table of Contents

1. [Folder & File Conventions](#1-folder--file-conventions)
2. [Test File Anatomy](#2-test-file-anatomy)
3. [Unit Tests](#3-unit-tests)
4. [Integration Tests](#4-integration-tests)
5. [E2E Tests](#5-e2e-tests)
6. [What to Test (Coverage Rules)](#6-what-to-test-coverage-rules)
7. [Forbidden Patterns](#7-forbidden-patterns)
8. [Code Documentation (TSDoc/JSDoc)](#8-code-documentation-tsdocjsdoc)
9. [File-level Header Comments](#9-file-level-header-comments)
10. [README Convention](#10-readme-convention)
11. [Architecture Doc Convention](#11-architecture-doc-convention)
12. [Feature Doc Convention](#12-feature-doc-convention)
13. [Changelog Convention](#13-changelog-convention)
14. [Quick-Reference Cheatsheet](#14-quick-reference-cheatsheet)

---

## 1. Folder & File Conventions

```
resume-builder/
├── src/
│   ├── modules/
│   │   ├── resume/
│   │   │   ├── resume.service.ts         ← source
│   │   │   ├── resume.controller.ts
│   │   │   ├── resume.types.ts
│   │   │   └── __tests__/
│   │   │       ├── resume.service.test.ts      ← unit test
│   │   │       └── resume.controller.test.ts   ← unit test
│   │   └── auth/
│   │       ├── auth.service.ts
│   │       └── __tests__/
│   │           └── auth.service.test.ts
│   └── __tests__/
│       └── integration/
│           ├── resume-create.test.ts     ← integration test
│           └── auth-flow.test.ts
├── e2e/
│   ├── resume-editor.spec.ts             ← E2E test (Playwright/Cypress)
│   └── auth.spec.ts
├── __mocks__/
│   ├── prisma.ts                         ← shared DB mock
│   └── resend.ts                         ← shared email mock
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TESTING_AND_DOCS_STANDARDS.md    ← this file
│   ├── CHANGELOG.md
│   └── features/
│       ├── resume-editor.md
│       ├── pdf-export.md
│       └── auth.md
└── README.md
```

### Naming rules

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `<source-file>.test.ts` | `resume.service.test.ts` |
| Integration test | `<flow-name>.test.ts` inside `integration/` | `resume-create.test.ts` |
| E2E test | `<feature>.spec.ts` inside `e2e/` | `resume-editor.spec.ts` |
| Mock file | mirrors source path, inside `__mocks__/` | `__mocks__/prisma.ts` |
| Feature doc | `<kebab-feature-name>.md` | `pdf-export.md` |

---

## 2. Test File Anatomy

Every test file — unit, integration, or E2E — must begin with this header block:

```typescript
// ─────────────────────────────────────────────────────────────
// Module:       ResumeService
// File:         src/modules/resume/__tests__/resume.service.test.ts
// Description:  Unit tests for resume CRUD operations and validation
// Coverage:     createResume, updateResume, deleteResume, getResumeById
// Last updated: 2026-05-22
// ─────────────────────────────────────────────────────────────
```

Then follow this structure, in order:

```typescript
// 1. Imports — external libs first, then internal
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResumeService } from '../resume.service'
import { prismaMock } from '../../../__mocks__/prisma'

// 2. Module-level mocks — always at the top, never inside tests
vi.mock('../../../lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('../../../lib/storage')

// 3. Shared fixtures / factories
const mockResume = {
  id: 'resume-001',
  userId: 'user-001',
  title: 'Software Engineer Resume',
  createdAt: new Date('2026-01-01'),
}

// 4. describe block — one per module
describe('ResumeService', () => {

  // 5. Setup / teardown
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 6. Nested describe — one per public method
  describe('createResume', () => {

    it('should create and return a new resume for a valid user', async () => { ... })
    it('should throw ValidationError when title is empty', async () => { ... })
    it('should throw NotFoundError when userId does not exist', async () => { ... })

  })

  describe('deleteResume', () => {
    // ...
  })

})
```

---

## 3. Unit Tests

Unit tests live at `src/modules/<module>/__tests__/<file>.test.ts`.

They test **one function in isolation** — all dependencies are mocked.

### Template

```typescript
// ─────────────────────────────────────────────────────────────
// Module:       PdfExportService
// File:         src/modules/export/__tests__/pdf-export.service.test.ts
// Description:  Unit tests for PDF generation from resume data
// Coverage:     generatePdf, applyTemplate, validateLayout
// Last updated: 2026-05-22
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PdfExportService } from '../pdf-export.service'
import { mockResumeData, mockPdfBuffer } from '../../__fixtures__/resume.fixtures'

vi.mock('../../../lib/puppeteer')
vi.mock('../../../lib/storage')

const service = new PdfExportService()

describe('PdfExportService', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generatePdf', () => {

    // Happy path — what should work
    it('should return a PDF buffer when given valid resume data', async () => {
      const result = await service.generatePdf(mockResumeData)
      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    // Edge case — boundary or unusual but valid input
    it('should handle a resume with no work experience entries', async () => {
      const data = { ...mockResumeData, experience: [] }
      const result = await service.generatePdf(data)
      expect(result).toBeInstanceOf(Buffer)
    })

    // Error case — invalid input or failure path
    it('should throw ExportError when template rendering fails', async () => {
      vi.mocked(renderTemplate).mockRejectedValueOnce(new Error('render failed'))
      await expect(service.generatePdf(mockResumeData)).rejects.toThrow('ExportError')
    })

  })

  describe('applyTemplate', () => {

    it('should inject resume data into the selected HTML template', () => {
      const html = service.applyTemplate(mockResumeData, 'modern')
      expect(html).toContain(mockResumeData.name)
      expect(html).toContain('class="template-modern"')
    })

    it('should fall back to the default template when template name is invalid', () => {
      const html = service.applyTemplate(mockResumeData, 'nonexistent')
      expect(html).toContain('class="template-default"')
    })

    it('should throw TemplateError when resume data is missing required fields', () => {
      expect(() => service.applyTemplate({} as any, 'modern')).toThrow('TemplateError')
    })

  })

})
```

### Assertion style

```typescript
// ✅ Prefer specific matchers over toBe(true)
expect(result.id).toBe('resume-001')
expect(errors).toHaveLength(2)
expect(result).toMatchObject({ title: 'Engineer', status: 'draft' })

// ✅ For async errors
await expect(fn()).rejects.toThrow('ErrorClassName')
await expect(fn()).rejects.toMatchObject({ code: 'NOT_FOUND' })

// ❌ Never
expect(result !== null).toBe(true)        // too vague
expect(JSON.stringify(result)).toBe(...)  // brittle
```

---

## 4. Integration Tests

Integration tests live at `src/__tests__/integration/<flow>.test.ts`.

They test **a full request-response flow** — real service + real DB queries (test DB) or realistic mocks at the network boundary only.

### Template

```typescript
// ─────────────────────────────────────────────────────────────
// Flow:         Resume Creation
// File:         src/__tests__/integration/resume-create.test.ts
// Description:  Tests the full create-resume flow: request → service → DB → response
// Covers:       POST /api/resumes, validation, DB write, response shape
// Last updated: 2026-05-22
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { db } from '../../lib/prisma'
import { seedTestUser, cleanDatabase } from '../helpers/db.helpers'

describe('POST /api/resumes — create resume flow', () => {

  let authToken: string
  let userId: string

  beforeAll(async () => {
    await cleanDatabase()
    const user = await seedTestUser()
    userId = user.id
    authToken = user.token
  })

  afterAll(async () => {
    await cleanDatabase()
  })

  it('should create a resume and return 201 with the new record', async () => {
    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'My First Resume', templateId: 'modern' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      id: expect.any(String),
      title: 'My First Resume',
      userId,
    })
  })

  it('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ templateId: 'modern' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/i)
  })

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app)
      .post('/api/resumes')
      .send({ title: 'Unauthorized Resume' })

    expect(res.status).toBe(401)
  })

})
```

---

## 5. E2E Tests

E2E tests live at `e2e/<feature>.spec.ts` and run against the full running app.

Use **Playwright** (preferred) or Cypress.

### Template (Playwright)

```typescript
// ─────────────────────────────────────────────────────────────
// Feature:      Resume Editor
// File:         e2e/resume-editor.spec.ts
// Description:  E2E tests for creating, editing, and saving a resume
// Covers:       Editor load, field edits, autosave, template switch
// Last updated: 2026-05-22
// ─────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth.helpers'

test.describe('Resume Editor', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/dashboard/resumes/new')
  })

  test('should display a blank editor for a new resume', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Untitled Resume' })).toBeVisible()
    await expect(page.getByTestId('section-experience')).toBeVisible()
  })

  test('should save changes when the user edits the resume title', async ({ page }) => {
    await page.getByTestId('resume-title-input').fill('Senior Engineer Resume')
    await page.keyboard.press('Tab')
    await expect(page.getByText('Saved')).toBeVisible()
  })

  test('should switch templates without losing content', async ({ page }) => {
    await page.getByTestId('resume-title-input').fill('Content Test Resume')
    await page.getByTestId('template-selector').selectOption('classic')
    await expect(page.getByTestId('resume-title-input')).toHaveValue('Content Test Resume')
  })

})
```

### Locator rules

```typescript
// ✅ Prefer — accessible and stable
page.getByRole('button', { name: 'Export PDF' })
page.getByLabel('Job title')
page.getByTestId('section-skills')         // add data-testid to components

// ❌ Avoid — brittle
page.locator('.btn-primary')
page.locator('#resume-form > div:nth-child(3)')
page.locator('text=Export PDF')            // breaks on copy change
```

---

## 6. What to Test (Coverage Rules)

### Minimum per public function

| Scenario | Required |
|----------|----------|
| Happy path | Yes — at least 1 |
| Edge case (empty array, zero, boundary value) | Yes — at least 1 |
| Error path (invalid input, failed dependency) | Yes — at least 1 |
| Auth/permission check (where applicable) | Yes |

### Coverage targets

| Layer | Line coverage | Branch coverage |
|-------|-------------|-----------------|
| Services | 85% | 75% |
| Controllers | 80% | 70% |
| Utilities / helpers | 90% | 85% |
| E2E (critical flows only) | — | — |

### What does NOT need unit tests

- Type definitions (`.types.ts`)
- Database migrations
- Config files
- Plain data constants

---

## 7. Forbidden Patterns

Never commit any of the following:

```typescript
// ❌ console.log inside tests
it('should...', () => {
  console.log(result)   // remove before committing
})

// ❌ .only — blocks all other tests in CI
it.only('should...')
describe.only('Module')

// ❌ Hardcoded credentials or real IDs
const userId = 'usr_a1b2c3d4_REAL_PROD_ID'
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// ❌ Mocks declared inside test cases
it('should...', () => {
  vi.mock('../../lib/prisma')   // must be at file top
})

// ❌ Nested describes more than 2 levels deep
describe('Module', () => {
  describe('method', () => {
    describe('edge case', () => {   // ← unnecessary third level
      describe('sub-edge case', () => { })
    })
  })
})

// ❌ Testing implementation details
expect(service._internalCache.size).toBe(1)   // test behavior, not internals

// ❌ Skipped tests without a comment explaining why
it.skip('should handle X')   // must add: // TODO: unskip when feature Y is ready
```

---

## 8. Code Documentation (TSDoc/JSDoc)

Use **TSDoc** style for all exported functions, classes, and types.

### Function TSDoc template

```typescript
/**
 * Generates a PDF buffer from the given resume data using the specified template.
 *
 * @param resumeData - The structured resume content to render.
 * @param templateId - The ID of the visual template to apply. Defaults to `'default'`.
 * @returns A Promise that resolves to a `Buffer` containing the rendered PDF.
 *
 * @throws {TemplateError} If the templateId does not match any registered template.
 * @throws {ExportError} If PDF generation fails due to a rendering engine error.
 *
 * @example
 * ```ts
 * const pdf = await generatePdf(resumeData, 'modern')
 * res.setHeader('Content-Type', 'application/pdf')
 * res.send(pdf)
 * ```
 */
export async function generatePdf(
  resumeData: ResumeData,
  templateId: string = 'default'
): Promise<Buffer> { ... }
```

### Type TSDoc template

```typescript
/**
 * Represents a single resume document owned by a user.
 */
export interface Resume {
  /** Unique identifier (UUID v4). */
  id: string

  /** The user who owns this resume. */
  userId: string

  /** Display title shown in the dashboard. */
  title: string

  /** ISO 8601 creation timestamp. */
  createdAt: string

  /**
   * Whether the resume is visible to third parties via a public share link.
   * Defaults to `false`.
   */
  isPublic: boolean
}
```

### What needs a TSDoc comment

| Should document | Should NOT document |
|----------------|---------------------|
| All exported functions | Private utility functions obvious from name |
| All exported types/interfaces | Internal implementation variables |
| All class public methods | Self-explanatory one-liners |
| Any non-obvious parameter | Standard CRUD that matches the name exactly |

---

## 9. File-level Header Comments

Every source file (non-test) gets a short header block at the top:

```typescript
// ─────────────────────────────────────────────────────────────
// File:         src/modules/resume/resume.service.ts
// Description:  Core business logic for resume CRUD operations.
//               Handles creation, updates, soft-delete, and retrieval.
// Dependencies: PrismaClient, StorageService, ResumeValidator
// ─────────────────────────────────────────────────────────────
```

Rules:
- Keep to 3–5 lines maximum.
- `Description` is 1–2 sentences; no full paragraphs.
- `Dependencies` lists only non-obvious external dependencies.
- Do NOT repeat the file path or description in the code itself.

---

## 10. README Convention

The root `README.md` must follow this exact structure:

```markdown
# Resume Builder

> One-sentence description of what the product is.

## Quick start

\`\`\`bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev
\`\`\`

## Requirements

- Node.js ≥ 20
- PostgreSQL ≥ 15
- (any other hard requirements)

## Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm test` | Run unit + integration tests |
| `pnpm test:e2e` | Run E2E tests (requires running server) |
| `pnpm test:cov` | Tests with coverage report |
| `pnpm lint` | ESLint + type check |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed development data |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for session signing |
| `RESEND_API_KEY` | Yes | Email delivery API key |
| `STORAGE_BUCKET` | No | S3 bucket name (defaults to local) |

## Project structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Testing

See [docs/TESTING_AND_DOCS_STANDARDS.md](docs/TESTING_AND_DOCS_STANDARDS.md).

## Contributing

1. Branch off `main` using the pattern `feat/<name>` or `fix/<name>`.
2. All tests must pass and coverage thresholds must be met before opening a PR.
3. Follow the standards in `docs/TESTING_AND_DOCS_STANDARDS.md`.
```

Rules:
- No marketing copy. No emojis.
- Keep it to what a new developer needs to get running in under 5 minutes.
- If a section grows beyond 15 lines, move it to a dedicated doc in `/docs/` and link it.

---

## 11. Architecture Doc Convention

Location: `docs/ARCHITECTURE.md`

Use exactly these sections, in this order:

```markdown
# Architecture
Last updated: YYYY-MM-DD

## Overview
(2–3 sentences: what the system does and its key technical boundaries)

## Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 14 |
| API | Next.js Route Handlers / tRPC | — |
| Database | PostgreSQL + Prisma | Postgres 15, Prisma 5 |
| Auth | NextAuth.js | 5 |
| Email | Resend | — |
| Storage | AWS S3 / local | — |
| Testing | Vitest + Playwright | — |
| Deployment | Vercel | — |

## Project structure
(annotated directory tree — see section 1 of this doc for the pattern)

## Data flow
(numbered steps for the most important flows, e.g. "User creates a resume")

1. User submits the resume form on the client.
2. Form data is validated client-side with Zod.
3. ...

## Module responsibilities

| Module | Location | Responsibility |
|--------|----------|----------------|
| ResumeService | `src/modules/resume/` | CRUD + validation for resume records |
| PdfExportService | `src/modules/export/` | PDF rendering via Puppeteer |
| AuthService | `src/modules/auth/` | Session management, OAuth flows |

## State management
(how client state is handled: React Query, Zustand, Context, etc.)

## Auth & sessions
(auth model: JWT vs sessions, token storage, refresh strategy)

## Database schema (summary)
(key tables/models and their relationships — not a full schema dump)

## Key design decisions
(ADR-style: what was decided, why, and what was ruled out)

## Known limitations & TODOs
> Not yet defined — add when identified.
```

---

## 12. Feature Doc Convention

Location: `docs/features/<feature-name>.md`

One file per feature. Use this exact template:

```markdown
---
Feature:      PDF Export
Status:       Complete          # Planned | In Progress | Complete | Deprecated
Last updated: 2026-05-22
---

## Purpose
One to two sentences explaining what user problem this feature solves.

## User stories
- As a job seeker, I want to export my resume as a PDF so I can attach it to applications.
- As a user, I want the PDF to match the template I selected in the editor.

## Scope

### In scope
- One-click PDF generation from the editor toolbar.
- PDF reflects the currently selected visual template.

### Out of scope
- Batch export of multiple resumes at once (tracked separately).
- DOCX export format.

## Technical design

### Files involved

| File | Role |
|------|------|
| `src/modules/export/pdf-export.service.ts` | Core PDF generation logic |
| `src/modules/export/pdf-export.controller.ts` | HTTP handler for export endpoint |
| `src/components/editor/ExportButton.tsx` | UI trigger in the editor toolbar |

### API endpoint

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/resumes/:id/export/pdf` | Required | Generates and returns a PDF buffer |

### Data flow
1. User clicks "Export PDF" in the editor.
2. Client sends POST to `/api/resumes/:id/export/pdf`.
3. `PdfExportService.generatePdf()` fetches resume data and renders HTML.
4. Puppeteer converts the HTML to a PDF buffer.
5. Buffer is returned as `application/pdf` with a `Content-Disposition: attachment` header.

## Edge cases & error handling

| Case | Handling |
|------|---------|
| Resume not found | 404 with `NOT_FOUND` error code |
| Template rendering fails | 500 with `EXPORT_ERROR`, logged to Sentry |
| User not owner of resume | 403 with `FORBIDDEN` |

## Tests

- Unit: `src/modules/export/__tests__/pdf-export.service.test.ts`
- Integration: `src/__tests__/integration/pdf-export.test.ts`
- E2E: `e2e/pdf-export.spec.ts`

## Open questions

- Should we cache generated PDFs in S3? (owner: TBD, due: 2026-06-01)
```

---

## 13. Changelog Convention

Location: `docs/CHANGELOG.md` (or root `CHANGELOG.md`)

Follow **Keep a Changelog** format exactly:

```markdown
# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Template switcher in the resume editor toolbar.

### Fixed
- PDF export failing when resume had no work experience entries.

---

## [1.2.0] — 2026-05-01

### Added
- PDF export feature for all resume templates.
- `ExportButton` component with loading and error states.

### Changed
- Upgraded Prisma from 4.x to 5.x.

### Deprecated
- `/api/v1/export` endpoint — use `/api/resumes/:id/export/pdf` instead.

### Removed
- Legacy `resume.generate()` method (was deprecated in 1.1.0).

### Fixed
- Auth token not refreshing correctly after session expiry.

### Security
- Patched SSRF vulnerability in image URL validation.

---

## [1.1.0] — 2026-03-15
...
```

Rules:
- Sections used: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Use past tense for all entries.
- Never write "minor improvements" or "various bug fixes" — be specific.
- `[Unreleased]` is always at the top and cleared on each release.

---

## 14. Quick-Reference Cheatsheet

| Question | Answer |
|----------|--------|
| Where do unit tests go? | `src/modules/<module>/__tests__/<file>.test.ts` |
| Where do integration tests go? | `src/__tests__/integration/<flow>.test.ts` |
| Where do E2E tests go? | `e2e/<feature>.spec.ts` |
| Where do mocks go? | `__mocks__/<mirror-of-source>.ts` |
| Where do feature docs go? | `docs/features/<feature-name>.md` |
| How many test cases per function? | Minimum 3: happy path + edge case + error case |
| Can I use `.only()`? | Never in committed code |
| Can I use `console.log` in tests? | Never |
| Can I mock inside a test case? | No — mocks go at the top of the file |
| Do I need TSDoc on private functions? | No — only exported functions and types |
| What format for changelog entries? | Keep a Changelog (past tense, specific) |
| Minimum coverage for services? | 85% line, 75% branch |

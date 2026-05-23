---
# Feature: Resume Management (CRUD)
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides the backend API for creating, reading, updating, and deleting user resumes — the core data persistence layer for the resume builder.

## User Stories
- As a user, I want to create a new resume with my personal information and work history so that I can apply for jobs.
- As a user, I want to update sections of my resume and save changes so that I can keep it current.
- As a user, I want to delete old resumes so that my dashboard stays organized.

## Scope
### In scope
- Full CRUD: create, list, get, update, soft-delete resumes
- Multi-section structure: experience, education, skills, projects, certifications, languages
- Resume variant support via baseResumeId
- Redis caching for list and get operations (per-user scope, 60s TTL)
- Rate limiting on mutations
- Referential integrity validation on userId
- Soft delete via global Mongoose plugin
- Zod schema validation for all inputs
- Legacy template ID normalization

### Out of scope
- Hard delete (soft delete only, restorable)
- Batch operations (create/update/delete multiple at once)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/resumeController.ts | getAllResumes, getResumeById, createResume, updateResume, deleteResume |
| Backend/src/router/resume.routes.ts | Resume route definitions with caching, rate limiting, validation |
| Backend/src/middleware/redisCache.ts | Per-user resume list caching |
| Backend/src/middleware/referentialIntegrity.ts | Validates userId exists before create/update |
| Backend/src/validation/schemas.ts | createResumeSchema, updateResumeSchema, objectIdParamSchema |
| Backend/src/models/Resume.ts | Resume schema with personalInfo, sections, style |
| Backend/src/utils/resumeTemplate.ts | normalizeResumeTemplateId for legacy label mapping |

### Data model
```typescript
// Resume model (simplified)
interface IResume {
  userId: ObjectId;
  baseResumeId?: ObjectId;   // for variant support
  isVariant?: boolean;
  variantLabel?: string;
  title?: string;
  templateId: string;
  personalInfo: { fullName, email, phone, location, linkedin, github, portfolio, summary };
  sections: { experience: WorkEntry[], education: EduEntry[], skills: SkillGroup[], projects: Project[], certifications: CertEntry[], languages: LanguageEntry[] };
  style: { fontFamily, fontSize, lineHeight, pageMargin, sectionSpacing, bulletStyle, primaryColor, secondaryColor };
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
  atsScore?: number;
  atsStatus?: string;
  atsAnalyzedAt?: Date;
}
```

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /api/resumes | Yes | List user's resumes (cached, 60s) |
| GET | /api/resumes/:id | Yes | Get resume by ID (cached) |
| POST | /api/resumes | Yes | Create a new resume |
| PUT | /api/resumes/:id | Yes | Update resume fields |
| DELETE | /api/resumes/:id | Yes | Soft-delete the resume |

## Edge Cases & Error Handling
- If the resume is not found, the system returns 404 with NOT_FOUND code.
- If the resume belongs to another user, the system returns 404 (not 403) to avoid leaking existence info.
- If the ObjectId format is invalid, the system returns 400 with a validation error.
- If a legacy template ID is in the payload, normalizeResumeTemplateId maps it to the current ID or falls back to "classic".
- When concurrent updates occur, the system uses last-write-wins (Mongoose saves the full document).

## Tests
- Unit: __tests__/resumeController.test.ts, __tests__/models/resume.test.ts, __tests__/utils/resumeTemplate.test.ts
- Integration: __tests__/integration/resume.test.ts

## Open Questions
- None.

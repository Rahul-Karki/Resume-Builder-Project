---
# Feature: Template System
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides a curated set of 12 resume templates that users can choose from, with admin management for publishing, unpublishing, and reordering templates.

## User Stories
- As a user, I want to browse and select from a variety of resume templates so that my resume matches my industry and personal style.
- As an admin, I want to create, update, publish, and unpublish templates so that the template library stays up to date.
- As an admin, I want to reorder templates so that the most popular ones appear first.

## Scope
### In scope
- 12 renderable templates with distinct layouts (classic, modern, executive, compact, sidebar, scholarly, research, chronological, functional, combination, traditional, community)
- Public template listing with audience and category filters
- Admin CRUD: create, read, update, delete, reorder, set status, toggle premium
- Redis caching for public and admin template lists
- Template category (tech, general) and audience (tech, general) targeting
- CSS variable overrides per template
- Slot visibility configuration per template
- Usage tracking and analytics
- Legacy template ID migration support

### Out of scope
- Custom/user-uploaded templates
- Template versioning

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/templateController.ts | listTemplates, listPublicTemplates, getTemplate, createTemplate, updateTemplate, setTemplateStatus, togglePremium, deleteTemplate, reorderTemplates, recordUsage |
| Backend/src/router/template.routes.ts | Public template listing with cache |
| Backend/src/router/admin.routes.ts | Admin template CRUD with adminGuard and audit |
| Backend/src/middleware/redisCache.ts | Template list caching (public 600s, admin 180s) |
| Backend/src/middleware/adminAuth.ts | adminGuard for all admin template routes |
| Backend/src/models/Template.ts | Template schema with layoutId, category, audience, cssVars, slots |
| Backend/src/models/TemplateUsage.ts | Daily usage tracking per template |
| Backend/src/bootstrap/defaultTemplates.ts | Seeds default templates on first startup |
| frontend/src/templates/ResumeRenderer.tsx | Routes resume data to correct template React component |
| frontend/src/data/templateMeta.ts | Static template metadata (colors, descriptions, IDs) |
| frontend/src/components/templates/ | 12 template React components |

### Data model
```typescript
// Template model (simplified)
interface ITemplate {
  layoutId: string;       // unique — e.g. "modern", "classic"
  name: string;
  description: string;
  category: "tech" | "general";
  audience: "tech" | "general";
  tag?: string;
  tags: string[];
  thumbnailUrl?: string;
  status: "draft" | "published" | "archived";
  isPremium: boolean;
  sortOrder: number;
  cssVars?: { primaryColor, secondaryColor, fontFamily, fontSize, lineHeight, pageMargin, sectionSpacing };
  slots?: { summary, skills, projects, certifications, languages } // visibility defaults
  createdBy: ObjectId;
  publishedAt?: Date;
}
```

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| GET | /api/templates | No | List published templates (cached, 600s) |
| GET | /api/admin/templates | Admin | List all templates (cached, 180s) |
| GET | /api/admin/templates/:id | Admin | Get template by ID |
| POST | /api/admin/templates | Admin | Create a new template |
| PUT | /api/admin/templates/:id | Admin | Update a template |
| PUT | /api/admin/templates/reorder | Admin | Reorder templates |
| PATCH | /api/admin/templates/:id/status | Admin | Set template status (draft/published/archived) |
| PATCH | /api/admin/templates/:id/premium | Admin | Toggle premium flag |
| DELETE | /api/admin/templates/:id | Admin | Delete a template |

## Edge Cases & Error Handling
- If a duplicate layoutId is used on create, the system returns 400 with LAYOUT_ID_EXISTS.
- If the reorder request contains missing IDs, the system returns 400 with a validation error.
- If an admin tries to delete a published template, they must unpublish first, or the deletion also removes it from the public listing.
- If the public template list is requested for an unknown audience, the system returns an empty array (no error).

## Tests
- Unit: __tests__/templateController.test.ts, __tests__/models/template.test.ts, __tests__/utils/resumeTemplate.test.ts
- Integration: __tests__/integration/admin.test.ts
- E2E: e2e/templates-filter.spec.ts (frontend)

## Open Questions
- None.

---
# Feature: Resume Builder Editor
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Provides an interactive, real-time resume editing experience where users can fill in sections, customize styling, preview changes instantly, and toggle between 12 templates — with AI assistance available inline.

## User Stories
- As a user, I want to edit my resume sections (experience, education, skills) in a structured form so that I don't have to worry about layout formatting.
- As a user, I want to see a live preview of my resume as I edit so that I know exactly what it will look like.
- As a user, I want to change templates without losing my content so that I can try different looks.
- As a user, I want AI suggestions available inline so that I can improve my writing without leaving the editor.

## Scope
### In scope
- Structured form editor for personal info, work experience, education, skills, projects, certifications, languages
- Section add/remove/reorder with drag-free tabbed interface
- Live preview pane that updates as the user types
- Style customization: font, colors, margins, spacing, bullet style
- Template switching with style merge (preserves user's customizations)
- Section visibility toggles
- Integrated AI assistant panel (improve text, grammar check, enhance bullet)
- Integrated ATS analysis panel (scores, keyword matches, suggestions)
- Auto-save with debouncing
- Resume completion score indicator
- Export preset selection (web, standard, print)
- Undo via version history access

### Out of scope
- Drag-and-drop section reordering
- Collaborative real-time editing
- Mobile editor experience (desktop-first)

## Technical Design
### Files involved
| File | Role |
|------|------|
| frontend/src/pages/ResumeBuilder.tsx | Main editor page composing all panels |
| frontend/src/store/useResumeBuilderStore.ts | Zustand store for all editor state |
| frontend/src/types/resume-types.ts | ResumeDocument, PersonalInfo, ResumeSections, ResumeStyle types |
| frontend/src/data/sampleData.ts | Sample resume data for demo/new users |
| frontend/src/components/builder/editorPanel.tsx | Personal info and section editor forms |
| frontend/src/components/builder/stylePanel.tsx | Style customization controls |
| frontend/src/components/builder/AIAssistantPanel.tsx | AI writing assistant panel |
| frontend/src/components/builder/ATSAnalysisPanel.tsx | ATS analysis results panel |
| frontend/src/components/builder/ResumeStudioWorkExperienceEditor.tsx | Work experience entry form |
| frontend/src/templates/ResumeRenderer.tsx | Live preview rendering with template routing |
| frontend/src/hooks/useAISuggestions.ts | Debounced AI suggestions |
| frontend/src/services/api.ts | API client for saving and AI operations |
| frontend/src/components/myResumes/Compiled.tsx | Resume card grid for saved/compiled view |

### Data model
`	ypescript
// Zustand store state (frontend only structure)
interface ResumeDocument {
  templateId: string;
  personalInfo: { fullName, email, phone, location, linkedin, github, portfolio, summary, photo };
  sections: {
    experience: Array<{ id, company, position, location, startDate, endDate, current, description, bullets }>;
    education: Array<{ id, institution, degree, field, startDate, endDate, gpa, honors }>;
    skills: Array<{ id, category, skills }>;
    projects: Array<{ id, name, url, description, technologies }>;
    certifications: Array<{ id, name, issuer, date, url }>;
    languages: Array<{ id, language, proficiency }>;
  };
  style: { fontFamily, fontSize, lineHeight, pageMargin, sectionSpacing, bulletStyle, primaryColor, secondaryColor };
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
}

interface BuilderUIState {
  activeTab: "personal" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";
  activeSection: string | null;
  focusedField: string | null;
  previewScale: number;
  exportPreset: "web" | "standard" | "print";
  saving: boolean;
  lastSavedAt: Date | null;
}
`

## Edge Cases & Error Handling
- Unsaved changes on navigation: browser beforeunload warning.
- Template switch with custom style: user styles are merged with template defaults (user overrides preserved).
- Empty resume creation: pre-populated with sample data on first use.
- Concurrent save conflicts: last-write-wins on the backend.
- AI panel with no section selected: disabled state with prompt to select a section.
- Completion score: dynamically calculated based on filled fields; shown as a circular ring.

## Tests
- Unit (frontend): __tests__/useResumeBuilderStore.test.ts, __tests__/useAISuggestions.test.ts
- E2E: e2e/resume-builder.spec.ts

## Open Questions
- Should auto-save be triggered on field blur rather than debounced keystroke? (owner: TBD)

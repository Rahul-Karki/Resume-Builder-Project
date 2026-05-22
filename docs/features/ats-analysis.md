---
# Feature: ATS Analysis & Optimization
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Analyzes a resume against a target job description to calculate an ATS (Applicant Tracking System) compatibility score and provide actionable suggestions for improvement.

## User Stories
- As a job seeker, I want to see how well my resume matches a specific job description so that I can tailor it before applying.
- As a user, I want keyword suggestions and section-level scores so that I know exactly what to improve.

## Scope
### In scope
- ATS compatibility scoring (overall + section-level)
- Keyword extraction and matching against job description
- Section-level score breakdown (experience, education, skills, etc.)
- ATS-specific resume suggestions (rewording, keyword insertion)
- Historical analysis tracking per resume
- Resume snapshotting for before/after comparison
- Job ID deduplication (one active analysis per job)

### Out of scope
- Real-time collaborative analysis
- Company-specific ATS system emulation

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/resumeEnhancementController.ts | analyzeAts, getLatestAtsAnalysis, getAtsAnalysisByJobId, applyAtsSuggestion |
| Backend/src/router/resume.routes.ts | ATS routes with referential integrity |
| Backend/src/queue/atsQueue.ts | BullMQ shim — processes ATS analysis synchronously |
| Backend/src/services/aiProviders.ts | AI provider abstraction for ATS scoring calls |
| Backend/src/utils/atsPromptTemplates.ts | Prompt template loading and interpolation |
| Backend/prompts/enhanced_ats_prompt.py | System prompt file for ATS analysis |
| Backend/src/models/AtsAnalysis.ts | Analysis schema with scores, keyword matches, section breakdown |

### Data model
`	ypescript
// AtsAnalysis model (simplified)
interface IAtsAnalysis {
  jobId: string;              // unique — one analysis per job
  resumeId: ObjectId;
  userId: ObjectId;
  status: "queued" | "processing" | "completed" | "failed";
  reportType: "resume-analysis" | "job-description-match";
  jobTitle?: string;
  jobDescription?: string;
  targetKeywords: string[];
  previousOverallScore?: number;
  overallScore: number;        // 0-100
  matchScore: number;
  sectionScores: {             // per-section breakdown
    experience: { score, keywordsFound, keywordsMissing, suggestions };
    education: { score, keywordsFound, keywordsMissing, suggestions };
    skills: { score, keywordsFound, keywordsMissing, suggestions };
  };
  keywordAnalysis: {
    matched: Array<{ keyword, count, importance }>;
    missing: Array<{ keyword, importance }>;
  };
}
`

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| POST | /api/resumes/:id/analyze-ats | Yes | Enqueue ATS analysis for a resume |
| POST | /api/resumes/:id/ats-analysis | Yes | Alias for analyze-ats |
| GET | /api/resumes/:id/ats-analysis/latest | Yes | Get the latest ATS analysis |
| GET | /api/resumes/:id/ats-analysis/:jobId | Yes | Get analysis by job ID |
| POST | /api/resumes/:id/apply-suggestion | Yes | Apply an ATS suggestion to the resume |

## Edge Cases & Error Handling
- Same resume + same job analyzed again: returns cached analysis, does not re-process.
- Empty resume or job description: returns 400 with validation error.
- AI provider rate limit (429): falls through to secondary provider (OpenAI <-> Gemini).
- Both providers exhausted: returns 429 with categorized error.
- Analysis takes too long: request timeout middleware returns 503.

## Tests
- Unit: __tests__/resumeEnhancementController.test.ts, __tests__/atsQueue.test.ts, __tests__/aiProviders.test.ts, __tests__/utils/atsPromptTemplates.test.ts, __tests__/models/atsAnalysis.test.ts
- Integration: part of __tests__/integration/ai.test.ts

## Open Questions
- Should the cached analysis be invalidated when the resume changes? (owner: TBD)
- Is the 429 rate limit on both providers a production bottleneck? Need retry-with-backoff. (owner: TBD)

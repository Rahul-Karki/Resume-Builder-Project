---
# Feature: Resume PDF Download
Last updated: 2026-05-22
Status: [x] Complete

## Purpose
Generates a PDF version of a user's resume for download or printing, using server-side Puppeteer rendering with a client-side html2canvas + jsPDF fallback.

## User Stories
- As a user, I want to download my resume as a PDF so that I can email it to employers.
- As a user, I want the PDF to preserve the exact formatting of my chosen template so that it looks professional in print.

## Scope
### In scope
- Server-side PDF generation via Puppeteer (headless Chromium browser pool)
- Job-based download workflow: enqueue, poll status, stream events via SSE, download result
- Client-side PDF fallback using html2canvas + jsPDF
- Browser print preview and native print
- Concurrent Puppeteer browser pool with pre-warming
- SSE event streaming for job status updates
- Download job status tracking in MongoDB
- Preview data endpoint for pre-rendering resume HTML

### Out of scope
- Bulk/batch PDF generation
- Custom page size selection (letter/A4 only)

## Technical Design
### Files involved
| File | Role |
|------|------|
| Backend/src/controllers/resumeDownloadController.ts | downloadResume, getResumeDownloadJobStatus, streamResumeDownloadJobEvents, downloadResumeResult, getResumePreviewData |
| Backend/src/router/resume.routes.ts | Download routes with referential integrity middleware |
| Backend/src/queue/resumeQueue.ts | BullMQ shim — enqueues and processes download jobs synchronously |
| Backend/src/queue/resumeQueueEvents.ts | SSE event emitter for job status changes |
| Backend/src/lib/browserPool.ts | Pre-warmed Puppeteer browser pool |
| Backend/src/models/ResumeDownloadJob.ts | Job schema with status, fileData (Buffer), resultUrl, attempts |
| frontend/src/utils/pdfGenerator.ts | Client-side PDF fallback via html2canvas + jsPDF |
| frontend/src/utils/print.ts | Native browser print function |
| frontend/src/utils/printPreview.ts | Opens print preview in a new window |

### Data model
```typescript
// ResumeDownloadJob model (simplified)
interface IResumeDownloadJob {
  jobId: string;              // unique
  userId: ObjectId;
  resumeId: ObjectId;
  resume: Record<string, any>; // snapshot of resume data at time of request
  preset: "web" | "standard" | "print";
  status: "queued" | "active" | "completed" | "failed";
  fileData?: Buffer;           // generated PDF binary
  resultUrl?: string;
  resultPath?: string;
  attemptsMade: number;
  totalAttempts: number;
  lastError?: string;
  durationMs?: number;
}
```

### API endpoints
| Method | Route | Auth required | Description |
|--------|-------|---------------|-------------|
| POST | /api/resumes/download-resume | Yes | Enqueue a resume download job |
| GET | /api/resumes/job-status/:id | Yes | Poll job status |
| GET | /api/resumes/job-events/:id | Yes | SSE stream for live job status updates |
| GET | /api/resumes/download-result/:id | Yes | Download the completed PDF file |
| GET | /api/resumes/preview-data/:id | Yes | Get rendered HTML preview data |

## Edge Cases & Error Handling
- If the resume is not found, the system returns 404 before enqueuing.
- If Puppeteer crashes, the browser pool auto-recovers and the job is marked as failed and retryable.
- When resumes are large, the page split logic in the client-side fallback handles multi-page content.
- If the same resume is downloaded concurrently, the queue shim processes synchronously so no duplicate jobs are created.
- If the SSE connection drops, the client reconnects and polls job-status instead.

## Tests
- Unit: __tests__/resumeDownloadController.test.ts, __tests__/resumeQueue.test.ts, __tests__/resumeQueueEvents.test.ts, __tests__/models/resumeDownloadJob.test.ts
- Integration: part of __tests__/integration/resume.test.ts

## Open Questions
- Should the client-side fallback be removed now that Puppeteer is the primary path? (owner: TBD)
- Should we cache generated PDFs for unchanged resumes? (owner: TBD)

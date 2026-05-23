export type ResumeDownloadPreset = "web" | "standard" | "print";

export type ResumeDownloadJobData = {
  userId: string;
  preset: ResumeDownloadPreset;
  resumeId?: string;
  resume: Record<string, unknown>;
  requestId?: string;
};

export type AtsAnalysisJobData = {
  userId: string;
  resumeId: string;
  analysisId: string;
  previousOverallScore?: number | null;
  resume: Record<string, unknown>;
  jobTitle?: string;
  jobDescription?: string;
  keywords: string[];
  tone?: "professional" | "concise" | "technical" | "leadership-focused";
  reportType?: "resume-analysis" | "job-description-match";
  requestId?: string;
};

export const createResumeDownloadFileName = (jobId: string) => `${jobId}.pdf`;

export const resolveResumeDownloadUrl = (jobId: string) => `/api/resumes/download-result/${encodeURIComponent(jobId)}`;

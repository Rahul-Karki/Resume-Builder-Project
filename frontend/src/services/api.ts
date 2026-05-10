import axios from "axios";
import { ExportPreset, ResumeDocument } from "@/types/resume-types";
import type {
  AiGrammarResult,
  AiRewriteResult,
  AiTone,
  AtsAnalysisReport,
} from "../../../shared/src/ai";
import { logger } from "@/utils/logger";
import { performanceMonitor } from "@/utils/performance";
import { errorTracker } from "@/utils/errorTracking";
import { aiCreditsManager } from "@/utils/aiCredits";

type RetriableConfig = {
  _retry?: boolean;
  _retryCount?: number;
  url?: string;
  headers?: Record<string, string>;
  method?: string;
};

const isCsrfFailure = (error: any) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message ?? "");
  return status === 403 && message.toLowerCase().includes("csrf");
};

const AUTH_EXCLUDED_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/google-login",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/refresh",
];

const isExcludedPath = (url?: string) => {
  if (!url) return false;
  return AUTH_EXCLUDED_PATHS.some((path) => url.includes(path));
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_STORAGE_KEY = "csrfToken";
const MAX_TRANSIENT_RETRIES = 3;

const getStoredCsrfToken = () => localStorage.getItem(CSRF_STORAGE_KEY) ?? "";

const setStoredCsrfToken = (token?: unknown) => {
  if (typeof token === "string" && token.trim().length > 0) {
    localStorage.setItem(CSRF_STORAGE_KEY, token);
  }
};

const clearStoredCsrfToken = () => {
  localStorage.removeItem(CSRF_STORAGE_KEY);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientFailure = (error: any) => {
  const status = error?.response?.status;
  const code = String(error?.code ?? "");
  return !error?.response || status === 429 || status === 503 || code === "ECONNABORTED";
};

const fetchRotatedCsrfToken = async () => {
  const response = await api.get("/csrf");
  setStoredCsrfToken(response.data?.csrfToken);
  return response.data?.csrfToken;
};

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 15000,
});

export type ResumeDownloadRequest = {
  resumeId?: string;
  resume?: ResumeDocument;
  preset: ExportPreset;
};

export type ResumeDownloadQueueResponse = {
  message: string;
  jobId: string;
  statusUrl: string;
  downloadUrl: string;
  resultUrl?: string | null;
  status?: "pending" | "completed" | "failed";
};

export type ResumeDownloadJobStatusResponse = {
  jobId: string;
  status: "pending" | "completed" | "failed";
  resultUrl: string | null;
  attemptsMade: number;
  totalAttempts: number;
  lastError: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  durationMs: number | null;
};

export type AiSectionRequest = {
  text: string;
  section: "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";
  tone?: AiTone;
  context?: string;
  targetRole?: string;
};

export type AtsAnalysisQueueResponse = {
  message: string;
  jobId: string;
  analysisId: string;
  statusUrl: string;
  latestUrl: string;
};

export type AtsAnalysisResponse = {
  analysis: AtsAnalysisReport;
};

export const getResumeExportPreset = async (resumeId: string, preset: ExportPreset) => {
  const response = await api.post(`/resumes/${resumeId}/export-pdf`, { preset });
  return response.data?.export as { preset: ExportPreset; options: { scale: number }; filename: string };
};

export const queueResumeDownload = async (payload: ResumeDownloadRequest) => {
  const response = await api.post("/resumes/download-resume", payload, { timeout: 120000 });
  return response.data as ResumeDownloadQueueResponse;
};

export const getResumeDownloadJobStatus = async (jobId: string) => {
  const response = await api.get(`/resumes/job-status/${encodeURIComponent(jobId)}`);
  return response.data as ResumeDownloadJobStatusResponse;
};

export const improveResumeText = async (payload: AiSectionRequest) => {
  const operation = 'improve-text';
  const estimatedCredits = aiCreditsManager.estimateCredits(operation, payload.text.length);
  
  if (!aiCreditsManager.canAfford(operation, payload.text.length)) {
    const error = new Error(`Insufficient credits for ${operation}. Required: ${estimatedCredits}, Available: ${aiCreditsManager.getCurrentCredits()}`);
    errorTracker.trackError('Insufficient AI Credits', error, { operation, estimatedCredits });
    throw error;
  }

  try {
    logger.info('Starting AI text improvement', { operation, textLength: payload.text.length, estimatedCredits });
    
    const response = await performanceMonitor.measureApiCall(
      'improveResumeText',
      () => api.post("/ai/improve-text", payload, { timeout: 20000 }),
      { operation, textLength: payload.text.length }
    );
    
    await aiCreditsManager.recordUsage(operation, payload.text.length, { textLength: payload.text.length, section: payload.section });
    logger.logApiRequest('POST', '/ai/improve-text', response.status, undefined);
    
    return response.data as AiRewriteResult;
  } catch (error) {
    await aiCreditsManager.recordFailedUsage(operation, estimatedCredits, error as Error);
    errorTracker.trackError('AI text improvement failed', error, { operation, payload });
    logger.error('AI text improvement failed', { operation, error: (error as Error).message });
    throw error;
  }
};

export const checkResumeGrammar = async (payload: AiSectionRequest) => {
  const operation = 'check-grammar';
  const estimatedCredits = aiCreditsManager.estimateCredits(operation, payload.text.length);
  
  if (!aiCreditsManager.canAfford(operation, payload.text.length)) {
    const error = new Error(`Insufficient credits for ${operation}. Required: ${estimatedCredits}, Available: ${aiCreditsManager.getCurrentCredits()}`);
    errorTracker.trackError('Insufficient AI Credits', error, { operation, estimatedCredits });
    throw error;
  }

  try {
    logger.info('Starting AI grammar check', { operation, textLength: payload.text.length, estimatedCredits });
    
    const response = await performanceMonitor.measureApiCall(
      'checkResumeGrammar',
      () => api.post("/ai/check-grammar", payload, { timeout: 20000 }),
      { operation, textLength: payload.text.length }
    );
    
    await aiCreditsManager.recordUsage(operation, payload.text.length, { textLength: payload.text.length, section: payload.section });
    logger.logApiRequest('POST', '/ai/check-grammar', response.status, undefined);
    
    return response.data as AiGrammarResult;
  } catch (error) {
    await aiCreditsManager.recordFailedUsage(operation, estimatedCredits, error as Error);
    errorTracker.trackError('AI grammar check failed', error, { operation, payload });
    logger.error('AI grammar check failed', { operation, error: (error as Error).message });
    throw error;
  }
};

export const enhanceResumeBullet = async (payload: AiSectionRequest) => {
  const operation = 'enhance-bullet';
  const estimatedCredits = aiCreditsManager.estimateCredits(operation, payload.text.length);
  
  if (!aiCreditsManager.canAfford(operation, payload.text.length)) {
    const error = new Error(`Insufficient credits for ${operation}. Required: ${estimatedCredits}, Available: ${aiCreditsManager.getCurrentCredits()}`);
    errorTracker.trackError('Insufficient AI Credits', error, { operation, estimatedCredits });
    throw error;
  }

  try {
    logger.info('Starting AI bullet enhancement', { operation, textLength: payload.text.length, estimatedCredits });
    
    const response = await performanceMonitor.measureApiCall(
      'enhanceResumeBullet',
      () => api.post("/ai/enhance-bullet", payload, { timeout: 20000 }),
      { operation, textLength: payload.text.length }
    );
    
    await aiCreditsManager.recordUsage(operation, payload.text.length, { textLength: payload.text.length, section: payload.section });
    logger.logApiRequest('POST', '/ai/enhance-bullet', response.status, undefined);
    
    return response.data as AiRewriteResult;
  } catch (error) {
    await aiCreditsManager.recordFailedUsage(operation, estimatedCredits, error as Error);
    errorTracker.trackError('AI bullet enhancement failed', error, { operation, payload });
    logger.error('AI bullet enhancement failed', { operation, error: (error as Error).message });
    throw error;
  }
};

export const queueAtsAnalysis = async (resumeId: string, payload: {
  jobTitle?: string;
  jobDescription?: string;
  keywords?: string[];
  tone?: AiTone;
  reportType?: "resume-analysis" | "job-description-match";
}) => {
  const operation = 'ats-analysis';
  const estimatedCredits = aiCreditsManager.estimateCredits(operation);
  
  if (!aiCreditsManager.canAfford(operation)) {
    const error = new Error(`Insufficient credits for ${operation}. Required: ${estimatedCredits}, Available: ${aiCreditsManager.getCurrentCredits()}`);
    errorTracker.trackError('Insufficient AI Credits', error, { operation, estimatedCredits });
    throw error;
  }

  try {
    logger.info('Starting ATS analysis', { operation, resumeId, reportType: payload.reportType, estimatedCredits });
    
    const response = await performanceMonitor.measureApiCall(
      'queueAtsAnalysis',
      () => api.post(`/resumes/${encodeURIComponent(resumeId)}/analyze-ats`, payload, { timeout: 60000 }),
      { operation, resumeId, reportType: payload.reportType }
    );
    
    await aiCreditsManager.recordUsage(operation, 0, { resumeId, reportType: payload.reportType });
    logger.logApiRequest('POST', `/resumes/${resumeId}/analyze-ats`, response.status, undefined);
    
    return response.data as AtsAnalysisQueueResponse;
  } catch (error) {
    await aiCreditsManager.recordFailedUsage(operation, estimatedCredits, error as Error);
    errorTracker.trackError('ATS analysis queue failed', error, { operation, resumeId, payload });
    logger.error('ATS analysis queue failed', { operation, error: (error as Error).message });
    throw error;
  }
};

export const getAtsAnalysis = async (resumeId: string, jobId: string) => {
  const response = await api.get(`/resumes/${encodeURIComponent(resumeId)}/ats-analysis/${encodeURIComponent(jobId)}`);
  return response.data as AtsAnalysisResponse;
};

export const getLatestAtsAnalysis = async (resumeId: string) => {
  const response = await api.get(`/resumes/${encodeURIComponent(resumeId)}/ats-analysis/latest`);
  return response.data as AtsAnalysisResponse;
};

export async function bootstrapAuthSession() {
  try {
    const response = await api.post("/refresh", {});
    setStoredCsrfToken(response.data?.csrfToken);
    localStorage.setItem("accessToken", "session");
    return true;
  } catch {
    try {
      await fetchRotatedCsrfToken();
    } catch {
      clearStoredCsrfToken();
      // If token rotation fails we fall back to the next successful auth response.
    }
    return false;
  }
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "GET").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getStoredCsrfToken();
    config.headers = config.headers ?? {};
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    setStoredCsrfToken(response.data?.csrfToken);
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as RetriableConfig | undefined;
    const excludedPath = isExcludedPath(originalRequest?.url);
    const method = (originalRequest?.method ?? "GET").toUpperCase();

    if (
      originalRequest &&
      !excludedPath &&
      !SAFE_METHODS.has(method) &&
      isTransientFailure(error)
    ) {
      const retryCount = originalRequest._retryCount ?? 0;

      if (retryCount < MAX_TRANSIENT_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        const backoffMs = Math.min(1000 * 2 ** retryCount, 8000);
        await wait(backoffMs);
        return api(originalRequest);
      }
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !excludedPath
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await api.post("/refresh", {});
        setStoredCsrfToken(refreshResponse.data?.csrfToken);
        localStorage.setItem("accessToken", "session");
        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        clearStoredCsrfToken();
      }
    }

    if (
      isCsrfFailure(error) &&
      originalRequest &&
      !originalRequest._retry &&
      !excludedPath
    ) {
      originalRequest._retry = true;

      try {
        await fetchRotatedCsrfToken();
        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        clearStoredCsrfToken();
      }
    }

    return Promise.reject(error);
  },
);

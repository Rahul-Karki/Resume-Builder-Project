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

type AiOperation = 'improve-text' | 'check-grammar' | 'enhance-bullet' | 'ats-analysis';

type RetriableConfig = {
  _retry?: boolean;
  _csrfRetried?: boolean;
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
  "/auth/verify-email",
  "/auth/resend-verification",
  "/refresh",
];

const isExcludedPath = (url?: string) => {
  if (!url) return false;
  return AUTH_EXCLUDED_PATHS.some((path) => url.includes(path));
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_TRANSIENT_RETRIES = 3;

// ⚠️ SECURITY: CSRF token is stored in an HttpOnly cookie set by the backend.
// The token is returned in response bodies for the frontend to read.
// It is stored ONLY in this module-level variable — NEVER read from document.cookie
// (the cookie is HttpOnly, making it inaccessible to JavaScript).
// withCredentials: true ensures the browser sends the cookie automatically.

let _csrfToken: string | null = null;

const setCsrfToken = (token: string) => {
  _csrfToken = token;
};

const getCsrfToken = (): string => {
  return _csrfToken ?? "";
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hasAuthSessionMarker = () => Boolean(localStorage.getItem("accessToken"));

const isTransientFailure = (error: any) => {
  const status = error?.response?.status;
  const code = String(error?.code ?? "");
  return !error?.response || status === 429 || status === 503 || code === "ECONNABORTED";
};

const fetchRotatedCsrfToken = async () => {
  const response = await api.get("/csrf");
  // Extract token from response body (works in cross-origin setups)
  const token = response.data?.csrfToken as string | undefined;
  if (token) {
    setCsrfToken(token);
    return token;
  }
  // Fallback: read from cookie (same-origin setups)
  return getCsrfToken();
};

const syncCreditsFromHeaders = (headers: Record<string, string | string[] | undefined>, deducted: number, operation: AiOperation, extra?: Record<string, unknown>) => {
  const remaining = headers["x-ai-credits-remaining"];
  const resetAt = headers["x-ai-credits-reset-at"];
  const plan = headers["x-ai-credits-plan"];

  if (remaining !== undefined) {
    aiCreditsManager.syncFromServer({
      remaining: Number(remaining) || 0,
      resetAt: typeof resetAt === "string" ? resetAt : undefined,
      plan: (plan as any) || undefined,
    });
  }

  if (deducted > 0) {
    void aiCreditsManager.recordUsage(operation, deducted, extra);
  }
};

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const resolveBackendOrigin = (baseUrl: string) => {
  try {
    const parsed = new URL(baseUrl, window.location.origin);
    const pathname = parsed.pathname.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${parsed.origin}${pathname}`;
  } catch {
    return baseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
};

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
  forceRefresh?: boolean;
  variationSeed?: string;
};

export type AiRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  requestId?: string;
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

const performAiRequest = async <T>(
  operation: AiOperation,
  url: string,
  payload: AiSectionRequest,
  options: AiRequestOptions,
  signal?: AbortSignal,
): Promise<T> => {
  const estimatedCredits = aiCreditsManager.estimateCredits(operation, payload.text.length);
  logger.info(`Starting AI ${operation}`, { operation, textLength: payload.text.length, estimatedCredits });

  try {
    const response = await performanceMonitor.measureApiCall(
      operation,
      () => api.post(url, payload, {
        timeout: options.timeoutMs ?? 20000,
        signal: options.signal,
        headers: options.requestId ? { "X-Request-ID": options.requestId } : undefined,
      }),
      { operation, textLength: payload.text.length },
    );

    const deducted = Number(response.headers?.["x-ai-credits-deducted"] ?? 0) || 0;
    syncCreditsFromHeaders(response.headers as Record<string, string | undefined>, deducted, operation, {
      textLength: payload.text.length,
      section: payload.section,
    });

    logger.logApiRequest('POST', url, response.status, undefined);
    return response.data as T;
  } catch (error) {
    await aiCreditsManager.recordFailedUsage(operation, estimatedCredits, error as Error);
    errorTracker.trackError(`AI ${operation} failed`, error, { operation, payload });
    logger.error(`AI ${operation} failed`, { operation, error: (error as Error).message });
    throw error;
  }
};

export const improveResumeText = async (payload: AiSectionRequest, options: AiRequestOptions = {}) => {
  return performAiRequest<AiRewriteResult>('improve-text', '/ai/improve-text', payload, options);
};

export const checkResumeGrammar = async (payload: AiSectionRequest, options: AiRequestOptions = {}) => {
  return performAiRequest<AiGrammarResult>('check-grammar', '/ai/check-grammar', payload, options);
};

export const enhanceResumeBullet = async (payload: AiSectionRequest, options: AiRequestOptions = {}) => {
  return performAiRequest<AiRewriteResult>('enhance-bullet', '/ai/enhance-bullet', payload, options);
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

  try {
    logger.info('Starting ATS analysis', { operation, resumeId, reportType: payload.reportType, estimatedCredits });
    
    const response = await performanceMonitor.measureApiCall(
      'queueAtsAnalysis',
      () => api.post(`/resumes/${encodeURIComponent(resumeId)}/analyze-ats`, payload, { timeout: 60000 }),
      { operation, resumeId, reportType: payload.reportType }
    );
    
    const deducted = Number(response.headers?.["x-ai-credits-deducted"] ?? 0) || 0;
    syncCreditsFromHeaders(response.headers as Record<string, string | undefined>, deducted, operation, {
      resumeId,
      reportType: payload.reportType,
    });

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

export const applyAtsSuggestion = async (resumeId: string, analysisId: string, suggestionId: string) => {
  const response = await api.post(`/resumes/${encodeURIComponent(resumeId)}/apply-suggestion`, { analysisId, suggestionId });
  return response.data as { message: string; resume: ResumeDocument };
};

export const applyKeywordPlacement = async (resumeId: string, keyword: string, section: string) => {
  const response = await api.post(`/resumes/${encodeURIComponent(resumeId)}/apply-keyword`, { keyword, section });
  return response.data as { message: string; resume: ResumeDocument };
};

export const createMissingSection = async (resumeId: string, section: string, copyPasteTemplate?: string) => {
  const response = await api.post(`/resumes/${encodeURIComponent(resumeId)}/create-section`, { section, copyPasteTemplate });
  return response.data as { message: string; resume: ResumeDocument };
};

export async function bootstrapAuthSession() {
  if (!hasAuthSessionMarker()) {
    return false;
  }

  try {
    await api.post("/refresh", {}, { timeout: 3000 });
    localStorage.setItem("accessToken", "session");
    return true;
  } catch {
    try {
      await fetchRotatedCsrfToken();
    } catch {
      // If token rotation fails, the next auth response will set it
    }
    return false;
  }
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "GET").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    config.headers = config.headers ?? {};
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // Extract CSRF token from response body (set by /api/csrf, auth, and refresh endpoints)
    const token = response.data?.csrfToken as string | undefined;
    if (token) {
      setCsrfToken(token);
    }
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
      !excludedPath &&
      hasAuthSessionMarker()
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/refresh", {}, { timeout: 5000 });
        localStorage.setItem("accessToken", "session");
        return api(originalRequest);
      } catch {
        // Token refresh failed
      }
    }

    if (
      isCsrfFailure(error) &&
      originalRequest &&
      !originalRequest._csrfRetried &&
      !excludedPath
    ) {
      originalRequest._csrfRetried = true;

      // Small backoff to allow bootstrap or concurrent CSRF rotation to complete
      await wait(500);

      try {
        await fetchRotatedCsrfToken();
        return api(originalRequest);
      } catch {
        // CSRF rotation failed
      }
    }

    return Promise.reject(error);
  },
);

// ⚠️ ERROR TRACKING: Capture all API errors (failed responses and network errors)
// This provides observability into production issues without breaking the app
api.interceptors.response.use(
  undefined,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    const method = error?.config?.method?.toUpperCase() ?? "UNKNOWN";
    
    // Track non-auth errors to error tracking service
    if (status !== 401) {
      const message = `API ${method} ${url} failed`;
      errorTracker.trackError(message, error, {
        status,
        statusText: error?.response?.statusText,
        method,
        url,
        type: 'api_error',
        isNetworkError: !error?.response,
      });
    }
    
    return Promise.reject(error);
  },
);

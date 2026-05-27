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
const MAX_TRANSIENT_RETRIES = 3;

const parseCookieValue = (name: string): string => {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=(.*?)(?:;|$)`));
  return match ? decodeURIComponent(match[1]) : "";
};

// In-memory CSRF token storage for cross-origin environments (e.g., Render)
// where the cookie is set by the API domain but frontend JS can't read it
// from document.cookie. The token is returned in response bodies and stored here.
let _csrfToken = "";

const getStoredCsrfToken = () => {
  // Prefer in-memory token (populated via setStoredCsrfToken from response bodies)
  if (_csrfToken) return _csrfToken;
  // Fallback to cookie for same-origin setups
  return parseCookieValue("csrfToken");
};

const setStoredCsrfToken = (token?: unknown) => {
  if (typeof token === "string" && token.length > 0) {
    _csrfToken = token;
  }
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

const syncCreditsFromHeaders = (headers: Record<string, string | string[] | undefined>, deducted: number, operation: string, extra?: Record<string, unknown>) => {
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
  operation: string,
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
    
    await aiCreditsManager.recordUsage(operation, estimatedCredits, { resumeId, reportType: payload.reportType });
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
      }
    }

    return Promise.reject(error);
  },
);

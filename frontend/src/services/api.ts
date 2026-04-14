import axios from "axios";
import { AtsAnalysis, ExportPreset, ResumeVersionMeta, ShareAnalytics } from "@/types/resume-types";

type RetriableConfig = {
  _retry?: boolean;
  url?: string;
  headers?: Record<string, string>;
  method?: string;
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

const getCookie = (name: string) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
};

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 15000,
});

export type VersionCompareResponse = {
  left: { versionNo: number; snapshot: Record<string, unknown> };
  right: { versionNo: number; snapshot: Record<string, unknown> };
  diff: {
    titleChanged: boolean;
    summaryChanged: boolean;
    sectionCountDelta: Record<string, number>;
  };
};

export const analyzeResumeAts = async (resumeId: string, payload: { jobTitle?: string; keywords?: string[] }) => {
  const response = await api.post(`/resumes/${resumeId}/ats-analyze`, payload);
  return response.data?.analysis as AtsAnalysis;
};

export const applyResumeAtsSuggestion = async (resumeId: string, payload: { analysisId: string; suggestionId: string }) => {
  const response = await api.patch(`/resumes/${resumeId}/ats-suggestions/apply`, payload);
  return response.data?.resume;
};

export const listResumeVersions = async (resumeId: string) => {
  const response = await api.get(`/resumes/${resumeId}/versions`);
  return (response.data?.versions ?? []) as ResumeVersionMeta[];
};

export const compareResumeVersions = async (resumeId: string, leftVersion: number, rightVersion: number) => {
  const response = await api.post(`/resumes/${resumeId}/compare`, { leftVersion, rightVersion });
  return response.data as VersionCompareResponse;
};

export const restoreResumeVersion = async (resumeId: string, versionNo: number) => {
  const response = await api.post(`/resumes/${resumeId}/restore/${versionNo}`);
  return response.data?.resume;
};

export const createRoleTailoredVariant = async (resumeId: string, payload: { targetRole: string; keywords?: string[] }) => {
  const response = await api.post(`/resumes/${resumeId}/variants/role-tailored`, payload);
  return response.data?.resume;
};

export const getResumeExportPreset = async (resumeId: string, preset: ExportPreset) => {
  const response = await api.post(`/resumes/${resumeId}/export-pdf`, { preset });
  return response.data?.export as { preset: ExportPreset; options: { scale: number }; filename: string };
};

export const upsertResumeShareSettings = async (
  resumeId: string,
  payload: { visibility: "public" | "unlisted" | "password"; password?: string; allowDownload?: boolean; isActive?: boolean; expiresAt?: string },
) => {
  const response = await api.post(`/resumes/${resumeId}/share`, payload);
  return response.data?.share as {
    id: string;
    slug: string;
    visibility: "public" | "unlisted" | "password";
    allowDownload: boolean;
    isActive: boolean;
    expiresAt?: string;
    url: string;
  };
};

export const getResumeShareAnalytics = async (resumeId: string) => {
  const response = await api.get(`/resumes/${resumeId}/share/analytics`);
  return response.data?.analytics as ShareAnalytics;
};

export const getPublicSharedResume = async (slug: string, password?: string) => {
  const response = await api.get(`/share/${slug}`, {
    params: password ? { password } : undefined,
  });
  return response.data;
};

export const trackSharedResumeDownload = async (slug: string, password?: string) => {
  const response = await api.post(`/share/${slug}/download`, { password });
  return response.data;
};

export async function bootstrapAuthSession() {
  try {
    await api.post("/refresh", {});
    localStorage.setItem("accessToken", "session");
    return true;
  } catch {
    return false;
  }
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "GET").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookie("csrfToken");
    config.headers = config.headers ?? {};
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as RetriableConfig | undefined;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isExcludedPath(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/refresh", {});
        localStorage.setItem("accessToken", "session");
        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
      }
    }

    return Promise.reject(error);
  },
);

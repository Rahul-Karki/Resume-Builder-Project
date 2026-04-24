import axios from "axios";
import { ExportPreset } from "@/types/resume-types";

type RetriableConfig = {
  _retry?: boolean;
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

const getStoredCsrfToken = () => localStorage.getItem(CSRF_STORAGE_KEY) ?? "";

const setStoredCsrfToken = (token?: unknown) => {
  if (typeof token === "string" && token.trim().length > 0) {
    localStorage.setItem(CSRF_STORAGE_KEY, token);
  }
};

const clearStoredCsrfToken = () => {
  localStorage.removeItem(CSRF_STORAGE_KEY);
};

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 15000,
});

export const getResumeExportPreset = async (resumeId: string, preset: ExportPreset) => {
  const response = await api.post(`/resumes/${resumeId}/export-pdf`, { preset });
  return response.data?.export as { preset: ExportPreset; options: { scale: number }; filename: string };
};

const getFilenameFromContentDisposition = (value?: string) => {
  if (!value) return null;

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const basicMatch = value.match(/filename=\"?([^\";]+)\"?/i);
  return basicMatch?.[1] ?? null;
};

export const exportResumePdfSafe = async (
  resumeId: string,
  payload: { html: string; title?: string; preset?: ExportPreset },
) => {
  const response = await api.post(`/resumes/${resumeId}/export-pdf-safe`, payload, {
    responseType: "blob",
    timeout: 60000,
  });

  return {
    blob: response.data as Blob,
    filename: getFilenameFromContentDisposition(response.headers?.["content-disposition"]),
  };
};

export async function bootstrapAuthSession() {
  try {
    const response = await api.post("/refresh", {});
    setStoredCsrfToken(response.data?.csrfToken);
    localStorage.setItem("accessToken", "session");
    return true;
  } catch {
    clearStoredCsrfToken();
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
        const refreshResponse = await api.post("/refresh", {});
        setStoredCsrfToken(refreshResponse.data?.csrfToken);
        localStorage.setItem("accessToken", "session");
        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        clearStoredCsrfToken();
      }
    }

    return Promise.reject(error);
  },
);

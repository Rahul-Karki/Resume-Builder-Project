import axios from "axios";
import { ExportPreset } from "@/types/resume-types";

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

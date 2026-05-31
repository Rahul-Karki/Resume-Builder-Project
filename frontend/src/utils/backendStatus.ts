import type { AxiosError } from "axios";

export const BACKEND_WAKING_UP_MESSAGE =
  "The backend is waking up on Render. Please retry in a few seconds.";

const COLD_START_STATUS_CODES = new Set([502, 503, 504, 521, 522, 523, 524]);

const hasColdStartText = (value: unknown) => {
  const text = String(value ?? "").toLowerCase();
  return (
    text.includes("waking up") ||
    text.includes("cold start") ||
    text.includes("sleeping") ||
    text.includes("service unavailable") ||
    text.includes("bad gateway") ||
    text.includes("gateway timeout")
  );
};

export const isBackendWakingUpError = (error: unknown) => {
  const axiosError = error as AxiosError<{ error?: string; message?: string } & Record<string, unknown>>;
  const status = axiosError.response?.status;
  const responseData = axiosError.response?.data;

  return Boolean(
    (status != null && COLD_START_STATUS_CODES.has(status)) ||
    hasColdStartText(axiosError.message) ||
    hasColdStartText(responseData?.error) ||
    hasColdStartText(responseData?.message) ||
    hasColdStartText(responseData)
  );
};

export const getFriendlyApiErrorMessage = (
  error: unknown,
  fallback = "Failed to load data"
) => {
  if (isBackendWakingUpError(error)) {
    return BACKEND_WAKING_UP_MESSAGE;
  }

  const axiosError = error as AxiosError<{ error?: string; message?: string }>;
  return (
    axiosError.response?.data?.error ??
    axiosError.response?.data?.message ??
    axiosError.message ??
    fallback
  );
};
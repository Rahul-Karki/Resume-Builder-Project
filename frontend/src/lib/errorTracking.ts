import { errorTracker } from "@/utils/errorTracking";

export const reportClientError = (error: unknown, source: "react-boundary" | "window-error" | "unhandled-rejection") => {
  const message = error instanceof Error ? error.message : "Unknown client error";
  errorTracker.trackError(message, error, { source });
};

export const initializeClientErrorTracking = () => {
  errorTracker.initGlobalHandlers();
};

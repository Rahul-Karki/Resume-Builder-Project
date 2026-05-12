import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN || "";
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;

let isInitialized = false;

export const initializeClientSentry = () => {
  if (isInitialized || !dsn || import.meta.env.MODE === "development") {
    return;
  }

  Sentry.init({
    dsn,
    environment,
    enabled: true,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });

  isInitialized = true;
};

export const captureClientException = (error: unknown, context?: Record<string, unknown>) => {
  if (!isInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("client", context);
    }

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
};
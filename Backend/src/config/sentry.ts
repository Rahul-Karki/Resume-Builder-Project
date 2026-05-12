import * as Sentry from "@sentry/node";
import type { Request } from "express";
import { env } from "./env";

let sentryInitialized = false;

const shouldEnableSentry = () => Boolean(env.SENTRY_DSN) && env.NODE_ENV !== "test";

export const initializeBackendSentry = () => {
  if (sentryInitialized || !shouldEnableSentry()) {
    return sentryInitialized;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
    enabled: true,
  });

  sentryInitialized = true;
  return true;
};

export const captureBackendException = (error: unknown, req?: Request) => {
  if (!sentryInitialized || !shouldEnableSentry()) {
    return;
  }

  Sentry.withScope((scope) => {
    if (req) {
      const user = req.user as { id?: string; role?: string } | undefined;

      scope.setTag("traceId", req.traceId ?? req.correlationId ?? "unknown-trace-id");
      scope.setTag("method", req.method);
      scope.setTag("route", req.originalUrl);
      scope.setContext("request", {
        params: req.params,
        query: req.query,
      });

      if (user?.id) {
        scope.setUser({ id: user.id, username: user.role });
      }
    }

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
};

export const flushBackendSentry = async (timeoutMs = 2000) => {
  if (!sentryInitialized) {
    return false;
  }

  return Sentry.flush(timeoutMs);
};
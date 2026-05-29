type ClientErrorPayload = {
  message: string;
  stack?: string;
  source: "react-boundary" | "window-error" | "unhandled-rejection";
  url?: string;
  userAgent?: string;
  timestamp: string;
};

const ERROR_ENDPOINT = import.meta.env.VITE_ERROR_TRACKING_ENDPOINT || "";
const isProduction = import.meta.env.PROD;

let isInitialized = false;

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown client error",
    stack: undefined,
  };
};

const dispatchPayload = (payload: ClientErrorPayload) => {
  if (isProduction && ERROR_ENDPOINT) {
    void fetch(ERROR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {
      // Monitoring should never break the app.
    });
    return;
  }

  // Keep rich diagnostics visible during development.
  console.error("Client error report", payload);
};

export const reportClientError = (error: unknown, source: ClientErrorPayload["source"]) => {
  const serialized = serializeError(error);
  dispatchPayload({
    message: serialized.message,
    stack: serialized.stack,
    source,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    timestamp: new Date().toISOString(),
  });
};

export const initializeClientErrorTracking = () => {
  if (isInitialized || typeof window === "undefined") {
    return;
  }

  isInitialized = true;

  window.addEventListener("error", (event) => {
    reportClientError(event.error ?? event.message, "window-error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, "unhandled-rejection");
  });
};

import { describe, it, expect } from "vitest";

describe("backendStatus", () => {
  it("should detect cold start errors by status code", async () => {
    const { isBackendWakingUpError } = await import("../utils/backendStatus");
    expect(isBackendWakingUpError({ response: { status: 502 } })).toBe(true);
    expect(isBackendWakingUpError({ response: { status: 503 } })).toBe(true);
    expect(isBackendWakingUpError({ response: { status: 200 } })).toBe(false);
  });

  it("should detect cold start errors by message text", async () => {
    const { isBackendWakingUpError } = await import("../utils/backendStatus");
    expect(isBackendWakingUpError({ message: "waking up" })).toBe(true);
    expect(isBackendWakingUpError({ message: "cold start" })).toBe(true);
    expect(isBackendWakingUpError({ message: "ok" })).toBe(false);
  });

  it("should detect cold start errors in response data", async () => {
    const { isBackendWakingUpError } = await import("../utils/backendStatus");
    expect(isBackendWakingUpError({ response: { data: { error: "Service Unavailable" } } })).toBe(true);
    expect(isBackendWakingUpError({ response: { data: { message: "Backend is sleeping" } } })).toBe(true);
  });

  it("should return waking-up message for cold start errors", async () => {
    const { getFriendlyApiErrorMessage, BACKEND_WAKING_UP_MESSAGE } = await import("../utils/backendStatus");
    const err = { response: { status: 503 } };
    expect(getFriendlyApiErrorMessage(err)).toBe(BACKEND_WAKING_UP_MESSAGE);
  });

  it("should return server error message for other errors", async () => {
    const { getFriendlyApiErrorMessage } = await import("../utils/backendStatus");
    const err = { response: { data: { error: "Not found" } }, message: "Request failed" };
    expect(getFriendlyApiErrorMessage(err)).toBe("Not found");
  });

  it("should fall back to data.message when data.error is missing", async () => {
    const { getFriendlyApiErrorMessage } = await import("../utils/backendStatus");
    const err = { response: { data: { message: "Server error" } } };
    expect(getFriendlyApiErrorMessage(err)).toBe("Server error");
  });

  it("should fall back to axios message when no response data", async () => {
    const { getFriendlyApiErrorMessage } = await import("../utils/backendStatus");
    const err = { message: "Network Error" };
    expect(getFriendlyApiErrorMessage(err)).toBe("Network Error");
  });

  it("should use the fallback message when nothing is available", async () => {
    const { getFriendlyApiErrorMessage } = await import("../utils/backendStatus");
    expect(getFriendlyApiErrorMessage({})).toBe("Failed to load data");
    expect(getFriendlyApiErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });
});

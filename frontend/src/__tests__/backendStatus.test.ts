import { describe, expect, it } from "vitest";
import { BACKEND_WAKING_UP_MESSAGE, getFriendlyApiErrorMessage, isBackendWakingUpError } from "@/utils/backendStatus";

describe("backendStatus", () => {
  it("detects Render cold-start responses", () => {
    const error = {
      response: {
        status: 503,
        data: { message: "Service Unavailable" },
      },
      message: "Request failed with status code 503",
    };

    expect(isBackendWakingUpError(error)).toBe(true);
    expect(getFriendlyApiErrorMessage(error, "Fallback")).toBe(BACKEND_WAKING_UP_MESSAGE);
  });

  it("leaves non-cold-start errors untouched", () => {
    const error = {
      response: {
        status: 400,
        data: { message: "Bad request" },
      },
      message: "Request failed with status code 400",
    };

    expect(isBackendWakingUpError(error)).toBe(false);
    expect(getFriendlyApiErrorMessage(error, "Fallback")).toBe("Bad request");
  });
});
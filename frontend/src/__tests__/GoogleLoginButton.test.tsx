import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: vi.fn(({ onSuccess, onError }) => (
    <div data-testid="google-login">
      <button data-testid="mock-google-success" onClick={() => onSuccess({ credential: "mock-token" })}>Success</button>
      <button data-testid="mock-google-error" onClick={() => onError()}>Error</button>
    </div>
  )),
}));

vi.mock("@/services/api", () => ({
  api: { post: vi.fn() },
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const originalLocation = globalThis.location;

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(globalThis, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  it("should render Google login button", async () => {
    const { default: GoogleAuthButton } = await import("../components/ui/GoogleLoginButton");
    render(<GoogleAuthButton />);
    expect(screen.getByTestId("google-login")).toBeDefined();
  });

  it("should call API on success and redirect", async () => {
    const { api } = await import("@/services/api");
    vi.mocked(api.post).mockResolvedValue({ status: 200 });

    const { default: GoogleAuthButton } = await import("../components/ui/GoogleLoginButton");
    render(<GoogleAuthButton redirectTo="/dashboard" />);

    await fireEvent.click(screen.getByTestId("mock-google-success"));

    expect(api.post).toHaveBeenCalledWith("/auth/google-login", { token: "mock-token" });
  });

  it("should log error on API failure", async () => {
    const { api } = await import("@/services/api");
    const { logger } = await import("@/utils/logger");
    vi.mocked(api.post).mockRejectedValue(new Error("API Error"));

    const { default: GoogleAuthButton } = await import("../components/ui/GoogleLoginButton");
    render(<GoogleAuthButton />);

    await fireEvent.click(screen.getByTestId("mock-google-success"));

    expect(logger.error).toHaveBeenCalled();
  });

  it("should log error on Google auth failure", async () => {
    const { logger } = await import("@/utils/logger");

    const { default: GoogleAuthButton } = await import("../components/ui/GoogleLoginButton");
    render(<GoogleAuthButton />);

    await fireEvent.click(screen.getByTestId("mock-google-error"));

    expect(logger.error).toHaveBeenCalled();
  });
});

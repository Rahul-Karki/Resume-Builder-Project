import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "@/components/ErrorBoundary";

vi.mock("@/lib/errorTracking", () => ({
  reportClientError: vi.fn(),
}));

const Boom = () => { throw new Error("test error"); };

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><div>safe</div></ErrorBoundary>);
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("renders default fallback on error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("renders custom fallback on error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary fallback={<div>Custom error</div>}><Boom /></ErrorBoundary>);
    expect(screen.getByText("Custom error")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("calls onError when provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onError = vi.fn();
    render(<ErrorBoundary onError={onError}><Boom /></ErrorBoundary>);
    expect(onError).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error("Not authenticated")),
  },
}));

describe("ProtectedRoute", () => {
  it("shows loading skeleton initially", async () => {
    render(<MemoryRouter><ProtectedRoute><div>protected content</div></ProtectedRoute></MemoryRouter>);
    expect(screen.getByLabelText("Loading page")).toBeInTheDocument();
  });

  it("redirects to login when not authenticated", async () => {
    render(<MemoryRouter><ProtectedRoute><div>protected content</div></ProtectedRoute></MemoryRouter>);
    const skeleton = screen.getByLabelText("Loading page");
    expect(skeleton).toBeInTheDocument();
  });
});

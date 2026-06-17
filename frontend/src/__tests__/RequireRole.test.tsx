import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { RequireRole } from "@/components/auth/RequireRole";

vi.mock("@/services/api", () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error("Not authorized")),
  },
}));

describe("RequireRole", () => {
  it("shows loading skeleton initially", () => {
    render(<MemoryRouter><RequireRole allowedRoles={["admin"]}><div>admin content</div></RequireRole></MemoryRouter>);
    expect(screen.getByLabelText("Loading page")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Templates from "@/pages/Templates";

vi.mock("@/components/templates/landing", () => ({
  default: () => <div data-testid="templates-page">Templates Page</div>,
}));

describe("Templates", () => {
  it("renders templates page component", () => {
    render(<MemoryRouter><Templates /></MemoryRouter>);
    expect(screen.getByTestId("templates-page")).toBeInTheDocument();
  });
});

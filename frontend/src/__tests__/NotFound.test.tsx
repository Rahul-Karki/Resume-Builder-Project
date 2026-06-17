import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import NotFound from "@/pages/NotFound";

describe("NotFound", () => {
  it("renders 404 heading", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders page not found message", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    expect(screen.getByText(/Oops! Page not found/i)).toBeInTheDocument();
  });

  it("renders a link to home", () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>);
    const link = screen.getByRole("link", { name: /return to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});

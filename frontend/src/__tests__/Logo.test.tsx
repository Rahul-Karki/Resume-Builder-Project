import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { Logo } from "@/components/Logo";

describe("Logo", () => {
  it("renders brand text", () => {
    render(<MemoryRouter><Logo /></MemoryRouter>);
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
  });

  it("renders a link to home", () => {
    render(<MemoryRouter><Logo /></MemoryRouter>);
    const link = screen.getByTitle("Go to home page");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("applies compact styles when isCompact is true", () => {
    render(<MemoryRouter><Logo isCompact /></MemoryRouter>);
    const link = screen.getByTitle("Go to home page");
    expect(link).toBeInTheDocument();
  });

  it("hides label text when hideLabel is true", () => {
    render(<MemoryRouter><Logo hideLabel /></MemoryRouter>);
    expect(screen.getByText("Resume")).toBeInTheDocument();
  });
});

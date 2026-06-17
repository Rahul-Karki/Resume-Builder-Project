import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { HeroSection } from "@/components/landing/Hero";

describe("HeroSection", () => {
  it("renders headline", () => {
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText(/Resumes that/i)).toBeInTheDocument();
  });

  it("renders browse templates link", () => {
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    const link = screen.getByText("Browse Templates →");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/templates");
  });

  it("renders feature pills", () => {
    render(<MemoryRouter><HeroSection /></MemoryRouter>);
    expect(screen.getByText("✓ Clean Template Layouts")).toBeInTheDocument();
    expect(screen.getByText("✓ Full Style Control")).toBeInTheDocument();
  });
});

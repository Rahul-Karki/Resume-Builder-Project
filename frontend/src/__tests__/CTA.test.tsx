import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { CTASection } from "@/components/landing/CTA";

describe("CTASection", () => {
  it("renders heading", () => {
    render(<MemoryRouter><CTASection /></MemoryRouter>);
    expect(screen.getByText(/Your resume/i)).toBeInTheDocument();
  });

  it("renders browse templates link", () => {
    render(<MemoryRouter><CTASection /></MemoryRouter>);
    const link = screen.getByText("Browse Templates");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/templates");
  });

  it("renders fine print", () => {
    render(<MemoryRouter><CTASection /></MemoryRouter>);
    expect(screen.getByText(/No credit card required/i)).toBeInTheDocument();
  });
});

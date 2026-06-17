import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import LandingPage from "@/pages/Home";

describe("Home (LandingPage)", () => {
  it("renders hero section", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const links = screen.getAllByText(/Browse Templates/i);
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders features section", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText(/Template Rendering/i)).toBeInTheDocument();
  });

  it("renders how it works section", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText(/How It Works/i)).toBeInTheDocument();
  });

  it("renders CTA section", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
  });

  it("renders footer", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(screen.getByText(/ResumeStudio/i)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FeaturesSection } from "@/components/landing/Features";

describe("FeaturesSection", () => {
  it("renders section header", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("What You Get")).toBeInTheDocument();
    expect(screen.getByText("Three things, done right.")).toBeInTheDocument();
  });

  it("renders all feature titles", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Template Rendering")).toBeInTheDocument();
    const previews = screen.getAllByText("Live Preview");
    expect(previews.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Full Style Control")).toBeInTheDocument();
  });

  it("renders feature numbers", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});

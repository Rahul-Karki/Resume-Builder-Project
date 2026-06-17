import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorks } from "@/components/landing/HowItWorks";

describe("HowItWorks", () => {
  it("renders section header", () => {
    render(<HowItWorks />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
  });

  it("renders all step titles", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Pick a template")).toBeInTheDocument();
    expect(screen.getByText("Fill in your details")).toBeInTheDocument();
    expect(screen.getByText("Download your resume")).toBeInTheDocument();
  });

  it("renders step labels", () => {
    render(<HowItWorks />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("Step 3")).toBeInTheDocument();
  });
});

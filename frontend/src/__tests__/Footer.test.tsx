import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "@/components/landing/Footer";

describe("Footer", () => {
  it("renders brand name", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("renders link sections", () => {
    render(<Footer />);
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("My Resumes")).toBeInTheDocument();
    expect(screen.getByText("Log In")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(<Footer />);
    expect(screen.getByText("ATS-Verified")).toBeInTheDocument();
    expect(screen.getByText("Live Score")).toBeInTheDocument();
  });

  it("renders copyright", () => {
    render(<Footer />);
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Toast } from "@/components/myResumes/Toast";

describe("Toast", () => {
  it("renders message", () => {
    render(<Toast msg="Resume saved" />);
    expect(screen.getByText("Resume saved")).toBeInTheDocument();
  });

  it("renders checkmark icon", () => {
    render(<Toast msg="Done" />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });
});

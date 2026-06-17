import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Label } from "@/components/ui/label";

describe("Label", () => {
  it("renders children", () => {
    render(<Label>Name</Label>);
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("has data-slot attribute", () => {
    render(<Label data-testid="label">Label</Label>);
    expect(screen.getByTestId("label")).toHaveAttribute("data-slot", "label");
  });

  it("applies custom className", () => {
    render(<Label className="custom" data-testid="label">Label</Label>);
    expect(screen.getByTestId("label")).toHaveClass("custom");
  });
});

import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Separator } from "@/components/ui/separator";

describe("Separator", () => {
  it("renders as hr by default", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[data-slot='separator']")).toBeInTheDocument();
  });

  it("has correct data-slot", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[data-slot='separator']")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResumePage } from "@/components/builder/ResumePage";

describe("ResumePage", () => {
  it("renders children", () => {
    render(<ResumePage index={0}><div>resume content</div></ResumePage>);
    expect(screen.getByText("resume content")).toBeInTheDocument();
  });

  it("sets data attributes", () => {
    const { container } = render(<ResumePage index={2}><span>content</span></ResumePage>);
    const el = container.querySelector("[data-resume-page]");
    expect(el).toHaveAttribute("data-page-index", "2");
  });

  it("applies custom background color", () => {
    const { container } = render(<ResumePage index={0} backgroundColor="#f0f0f0"><span>content</span></ResumePage>);
    const el = container.querySelector("[data-resume-page]") as HTMLElement;
    expect(el.style.background).toBe("rgb(240, 240, 240)");
  });

  it("accepts custom className", () => {
    const { container } = render(<ResumePage index={0} className="custom-page"><span>content</span></ResumePage>);
    expect(container.querySelector(".custom-page")).toBeInTheDocument();
  });
});

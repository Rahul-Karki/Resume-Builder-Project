import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Ring } from "@/components/myResumes/CompletionRing";

describe("Ring", () => {
  it("renders with score", () => {
    const { container } = render(<Ring score={85} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders score number", () => {
    const { container } = render(<Ring score={92} />);
    expect(container.textContent).toContain("92");
  });

  it("uses green for high scores", () => {
    const { container } = render(<Ring score={90} />);
    const spans = container.querySelectorAll("span");
    const colorSpan = Array.from(spans).find(s => s.textContent === "90");
    expect(colorSpan).toBeInTheDocument();
  });

  it("uses yellow for medium scores", () => {
    const { container } = render(<Ring score={65} />);
    expect(container.textContent).toContain("65");
  });

  it("uses red for low scores", () => {
    const { container } = render(<Ring score={30} />);
    expect(container.textContent).toContain("30");
  });
});

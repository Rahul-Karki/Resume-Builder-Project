import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "@/components/myResumes/SkeletonCard";

describe("SkeletonCard (myResumes)", () => {
  it("renders skeleton structure", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});

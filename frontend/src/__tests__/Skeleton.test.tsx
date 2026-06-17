import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton, SkeletonText, SkeletonCard, SkeletonResume, SkeletonSidebar, SkeletonDashboard, SkeletonAtsAnalysis, SkeletonAiAssistant, SkeletonTable, SkeletonForm, SkeletonProfile, SkeletonList, SkeletonChart, SkeletonSettings, PageSkeleton, SkeletonModal, SkeletonTemplateGrid } from "@/components/Skeleton";

describe("Skeleton", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts className and style", () => {
    const { container } = render(<Skeleton className="custom" style={{ width: 100 }} />);
    expect(container.firstElementChild).toHaveClass("custom");
  });
});

describe("SkeletonText", () => {
  it("renders specified number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const skeletons = container.querySelectorAll(".skeleton-shimmer");
    expect(skeletons.length).toBe(5);
  });

  it("defaults to 3 lines", () => {
    const { container } = render(<SkeletonText />);
    expect(container.querySelectorAll(".skeleton-shimmer").length).toBe(3);
  });
});

describe("SkeletonCard", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonResume", () => {
  it("renders header and content blocks", () => {
    const { container } = render(<SkeletonResume />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonSidebar", () => {
  it("renders", () => {
    const { container } = render(<SkeletonSidebar />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonDashboard", () => {
  it("renders", () => {
    const { container } = render(<SkeletonDashboard />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonAtsAnalysis", () => {
  it("renders", () => {
    const { container } = render(<SkeletonAtsAnalysis />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonAiAssistant", () => {
  it("renders", () => {
    const { container } = render(<SkeletonAiAssistant />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonTable", () => {
  it("renders default rows", () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders custom number of rows", () => {
    const { container } = render(<SkeletonTable rows={3} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonForm", () => {
  it("renders", () => {
    const { container } = render(<SkeletonForm />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonProfile", () => {
  it("renders", () => {
    const { container } = render(<SkeletonProfile />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonList", () => {
  it("renders", () => {
    const { container } = render(<SkeletonList />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonChart", () => {
  it("renders", () => {
    const { container } = render(<SkeletonChart />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonSettings", () => {
  it("renders", () => {
    const { container } = render(<SkeletonSettings />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("PageSkeleton", () => {
  it("renders with aria-label", () => {
    const { container } = render(<PageSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-label", "Loading page");
  });
});

describe("SkeletonModal", () => {
  it("renders", () => {
    const { container } = render(<SkeletonModal />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SkeletonTemplateGrid", () => {
  it("renders default count", () => {
    const { container } = render(<SkeletonTemplateGrid />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

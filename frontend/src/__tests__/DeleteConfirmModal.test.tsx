import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("DelModal", () => {
  it("should render with resume title", async () => {
    const { DelModal } = await import("../components/myResumes/DeleteConfirmModal");
    const resume = { id: "1", title: "My Resume" } as any;
    render(<DelModal resume={resume} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/My Resume/)).toBeDefined();
    expect(screen.getByText("Yes, Delete")).toBeDefined();
    expect(screen.getByText("Cancel")).toBeDefined();
  });

  it("should call onConfirm when delete is clicked", async () => {
    const { DelModal } = await import("../components/myResumes/DeleteConfirmModal");
    const onConfirm = vi.fn();
    render(<DelModal resume={{ id: "1", title: "Test" } as any} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await fireEvent.click(screen.getByText("Yes, Delete"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("should call onCancel when cancel is clicked", async () => {
    const { DelModal } = await import("../components/myResumes/DeleteConfirmModal");
    const onCancel = vi.fn();
    render(<DelModal resume={{ id: "1", title: "Test" } as any} onConfirm={vi.fn()} onCancel={onCancel} />);
    await fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("should call onCancel when backdrop is clicked", async () => {
    const { DelModal } = await import("../components/myResumes/DeleteConfirmModal");
    const onCancel = vi.fn();
    const { container } = render(<DelModal resume={{ id: "1", title: "Test" } as any} onConfirm={vi.fn()} onCancel={onCancel} />);
    const backdrop = container.firstElementChild!;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies variant classes via data-variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-variant", "destructive");
  });

  it("applies size classes via data-size", () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-size", "lg");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: /link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
  });
});

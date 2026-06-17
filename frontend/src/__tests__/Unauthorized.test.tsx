import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Unauthorized from "@/pages/Unauthorized";

describe("Unauthorized", () => {
  it("renders 403 heading", () => {
    render(<MemoryRouter><Unauthorized /></MemoryRouter>);
    expect(screen.getByText("403")).toBeInTheDocument();
  });

  it("renders permission message", () => {
    render(<MemoryRouter><Unauthorized /></MemoryRouter>);
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });

  it("renders a link to home", () => {
    render(<MemoryRouter><Unauthorized /></MemoryRouter>);
    const link = screen.getByRole("link", { name: /back to home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import MyResumePage from "@/pages/MyResumePage";

vi.mock("@/components/myResumes/Compiled", () => ({
  default: () => <div data-testid="compiled">Compiled</div>,
}));

describe("MyResumePage", () => {
  it("renders compiled component", () => {
    render(<MemoryRouter><MyResumePage /></MemoryRouter>);
    expect(screen.getByTestId("compiled")).toBeInTheDocument();
  });
});

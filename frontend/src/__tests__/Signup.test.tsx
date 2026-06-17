import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import SignupPage from "@/pages/Signup";

vi.mock("@/components/signup-form", () => ({
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
}));

describe("SignupPage", () => {
  it("renders signup form", () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>);
    expect(screen.getByTestId("signup-form")).toBeInTheDocument();
  });
});

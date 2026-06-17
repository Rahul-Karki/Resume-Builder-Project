import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import LoginPage from "@/pages/Login";

vi.mock("@/components/login-form", () => ({
  LoginForm: () => <div data-testid="login-form">Login Form</div>,
}));

describe("LoginPage", () => {
  it("renders login form", () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });
});

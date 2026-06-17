import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><CardContent>content</CardContent></Card>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders with sm size", () => {
    render(<Card size="sm" data-testid="card" />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "sm");
  });

  it("renders with default size", () => {
    render(<Card data-testid="card" />);
    expect(screen.getByTestId("card")).toHaveAttribute("data-size", "default");
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader><CardTitle>Title</CardTitle></CardHeader>);
    expect(screen.getByText("Title")).toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("renders text", () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });
});

describe("CardDescription", () => {
  it("renders description", () => {
    render(<CardDescription>A description</CardDescription>);
    expect(screen.getByText("A description")).toBeInTheDocument();
  });
});

describe("CardContent", () => {
  it("renders content", () => {
    render(<CardContent>body text</CardContent>);
    expect(screen.getByText("body text")).toBeInTheDocument();
  });
});

describe("CardFooter", () => {
  it("renders footer", () => {
    render(<CardFooter>footer</CardFooter>);
    expect(screen.getByText("footer")).toBeInTheDocument();
  });
});

describe("CardAction", () => {
  it("renders action", () => {
    render(<CardAction><button>action</button></CardAction>);
    expect(screen.getByText("action")).toBeInTheDocument();
  });
});

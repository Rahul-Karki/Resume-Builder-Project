import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Field, FieldSet, FieldLegend, FieldGroup, FieldContent, FieldLabel, FieldTitle, FieldDescription, FieldSeparator, FieldError } from "@/components/ui/field";

describe("Field", () => {
  it("renders with vertical orientation by default", () => {
    render(<Field data-testid="field" />);
    const el = screen.getByTestId("field");
    expect(el).toHaveAttribute("data-orientation", "vertical");
    expect(el).toHaveAttribute("role", "group");
  });

  it("renders with horizontal orientation", () => {
    render(<Field orientation="horizontal" data-testid="field" />);
    expect(screen.getByTestId("field")).toHaveAttribute("data-orientation", "horizontal");
  });
});

describe("FieldSet", () => {
  it("renders as fieldset", () => {
    render(<FieldSet data-testid="fs" />);
    expect(screen.getByTestId("fs").tagName).toBe("FIELDSET");
  });
});

describe("FieldLegend", () => {
  it("renders as legend", () => {
    render(<FieldLegend data-testid="legend">Legend</FieldLegend>);
    expect(screen.getByTestId("legend").tagName).toBe("LEGEND");
    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("renders with label variant", () => {
    render(<FieldLegend variant="label" data-testid="legend" />);
    expect(screen.getByTestId("legend")).toHaveAttribute("data-variant", "label");
  });
});

describe("FieldGroup", () => {
  it("renders children", () => {
    render(<FieldGroup><span>child</span></FieldGroup>);
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});

describe("FieldContent", () => {
  it("renders children", () => {
    render(<FieldContent>content</FieldContent>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});

describe("FieldLabel", () => {
  it("renders label text", () => {
    render(<FieldLabel>Name</FieldLabel>);
    expect(screen.getByText("Name")).toBeInTheDocument();
  });
});

describe("FieldTitle", () => {
  it("renders title", () => {
    render(<FieldTitle>Title</FieldTitle>);
    expect(screen.getByText("Title")).toBeInTheDocument();
  });
});

describe("FieldDescription", () => {
  it("renders description", () => {
    render(<FieldDescription>help text</FieldDescription>);
    expect(screen.getByText("help text")).toBeInTheDocument();
  });
});

describe("FieldSeparator", () => {
  it("renders without children", () => {
    const { container } = render(<FieldSeparator />);
    expect(container.querySelector("[data-slot='field-separator']")).toBeInTheDocument();
  });

  it("renders with children", () => {
    render(<FieldSeparator>or</FieldSeparator>);
    expect(screen.getByText("or")).toBeInTheDocument();
  });
});

describe("FieldError", () => {
  it("renders children", () => {
    render(<FieldError>Error message</FieldError>);
    expect(screen.getByText("Error message")).toBeInTheDocument();
  });

  it("renders single error from array", () => {
    render(<FieldError errors={[{ message: "Required" }]} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders multiple errors as a list", () => {
    render(<FieldError errors={[{ message: "Required" }, { message: "Too short" }]} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Too short")).toBeInTheDocument();
  });

  it("returns null when no errors or children", () => {
    const { container } = render(<FieldError />);
    expect(container.querySelector("[role='alert']")).not.toBeInTheDocument();
  });

  it("deduplicates errors by message", () => {
    render(<FieldError errors={[{ message: "Required" }, { message: "Required" }]} />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});

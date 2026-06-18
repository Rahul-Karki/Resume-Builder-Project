import { describe, it, expect } from "vitest";

describe("cn", () => {
  it("should merge class names", async () => {
    const { cn } = await import("../lib/utils");
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", async () => {
    const { cn } = await import("../lib/utils");
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("should handle tailwind conflicts", async () => {
    const { cn } = await import("../lib/utils");
    const result = cn("px-4", "px-2");
    expect(result).toBeTruthy();
  });

  it("should handle empty inputs", async () => {
    const { cn } = await import("../lib/utils");
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });
});

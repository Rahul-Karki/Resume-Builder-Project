import { describe, it, expect } from "vitest";

describe("templateHelpers", () => {
  it("should format date range", async () => {
    const { formatDateRange } = await import("../components/templates/templateHelpers");
    expect(formatDateRange("2020", "2023", false)).toBe("2020 - 2023");
    expect(formatDateRange("2020", "", false)).toBe("2020");
    expect(formatDateRange("", "2023", false)).toBe("2023");
    expect(formatDateRange("2020", "2023", true)).toBe("2020 - Present");
    expect(formatDateRange("", "", false)).toBe("");
  });

  it("should format project tech", async () => {
    const { formatProjectTech } = await import("../components/templates/templateHelpers");
    expect(formatProjectTech({ tech: "React, Node.js,  TypeScript " } as any)).toBe("React, Node.js, TypeScript");
    expect(formatProjectTech({ tech: "" } as any)).toBe("");
  });

  it("should format certification", async () => {
    const { formatCertification } = await import("../components/templates/templateHelpers");
    expect(formatCertification({ name: "AWS Certified", issuer: "Amazon", year: "2024", url: "https://aws.com" } as any))
      .toBe("AWS Certified - Amazon (2024) — https://aws.com");
    expect(formatCertification({ name: "Cert", issuer: "", year: "", url: "" } as any)).toBe("Cert");
  });

  it("should get display bullets and detect paragraph mode", async () => {
    const { getDisplayBullets, isParagraphMode } = await import("../components/templates/templateHelpers");
    expect(getDisplayBullets([" a ", "", "b "])).toEqual(["a", "b"]);
    expect(isParagraphMode("paragraph")).toBe(true);
    expect(isParagraphMode("bullets")).toBe(false);
  });

  it("should get experience and project paragraphs", async () => {
    const { getExperienceParagraph, getProjectParagraph } = await import("../components/templates/templateHelpers");
    expect(getExperienceParagraph({ description: "  Led team  " } as any)).toBe("Led team");
    expect(getProjectParagraph({ description: "  Built app  " } as any)).toBe("Built app");
  });

  it("should convert URLs to absolute", async () => {
    const { toAbsoluteUrl } = await import("../components/templates/templateHelpers");
    expect(toAbsoluteUrl("https://example.com")).toBe("https://example.com");
    expect(toAbsoluteUrl("example.com")).toBe("https://example.com");
    expect(toAbsoluteUrl("")).toBe("");
  });

  it("should convert to mailto:", async () => {
    const { toMailto } = await import("../components/templates/templateHelpers");
    expect(toMailto("test@example.com")).toBe("mailto:test@example.com");
    expect(toMailto("mailto:test@example.com")).toBe("mailto:test@example.com");
    expect(toMailto("")).toBe("");
  });

  it("should convert to tel:", async () => {
    const { toTel } = await import("../components/templates/templateHelpers");
    expect(toTel("+1-555-1234")).toBe("tel:+15551234");
    expect(toTel("tel:+15551234")).toBe("tel:+15551234");
    expect(toTel("")).toBe("");
  });

  it("should detect LinkedIn and GitHub URLs", async () => {
    const { isLinkedInUrl, isGitHubUrl } = await import("../components/templates/templateHelpers");
    expect(isLinkedInUrl("https://linkedin.com/in/john")).toBe(true);
    expect(isGitHubUrl("https://github.com/john")).toBe(true);
  });

  it("should render text with links", async () => {
    const { renderTextWithLinks } = await import("../components/templates/templateHelpers");
    expect(renderTextWithLinks("Check https://example.com")).not.toBeNull();
    expect(renderTextWithLinks("Email test@example.com")).not.toBeNull();
    expect(renderTextWithLinks("Hello world")).toBe("Hello world");
    expect(renderTextWithLinks("")).toBe("");
  });

  it("should return social icon component based on URL", async () => {
    const { getSocialIconComponent } = await import("../components/templates/templateHelpers");
    expect(getSocialIconComponent("https://linkedin.com/in/john")).toBeTruthy();
    expect(getSocialIconComponent("https://github.com/john")).toBeTruthy();
    expect(getSocialIconComponent("https://example.com")).toBeTruthy();
  });
});

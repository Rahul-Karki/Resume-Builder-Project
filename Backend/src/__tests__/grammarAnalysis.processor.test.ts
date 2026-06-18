import { describe, it, expect } from "vitest";
import { analyzeGrammarIssues } from "../processors/grammarAnalysis.processor";

describe("grammarAnalysis.processor", () => {
  it("returns no findings for empty resume", () => {
    const findings = analyzeGrammarIssues({});
    expect(findings).toEqual([]);
  });

  it("returns no findings for resume with no experience section", () => {
    const findings = analyzeGrammarIssues({ sections: {} });
    expect(findings).toEqual([]);
  });

  it("flags bullet with weak verb as high severity (missing metric)", () => {
    const resume = {
      sections: {
        experience: [
          { role: "Engineer", company: "Acme", bullets: ["Was responsible for building features"] },
        ],
      },
    };
    const findings = analyzeGrammarIssues(resume);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].originalText).toBe("Was responsible for building features");
    expect(findings[0].reason).toContain("action verb");
  });

  it("flags bullet missing metric even with strong verb", () => {
    const resume = {
      sections: {
        experience: [
          { role: "Engineer", company: "Acme", bullets: ["Built a new feature"] },
        ],
      },
    };
    const findings = analyzeGrammarIssues(resume);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].reason).toContain("measurable impact");
  });

  it("flags medium severity when weak verb but has metric", () => {
    const resume = {
      sections: {
        experience: [
          { role: "Engineer", company: "Acme", bullets: ["Was responsible for 5 major product launches"] },
        ],
      },
    };
    const findings = analyzeGrammarIssues(resume);
    const match = findings.find((f) => f.originalText === "Was responsible for 5 major product launches");
    expect(match).toBeDefined();
    expect(match.severity).toBe("medium");
    expect(match.reason).toContain("action verb");
  });

  it("skips bullet with strong verb and numeric metric", () => {
    const resume = {
      sections: {
        experience: [
          { role: "Engineer", company: "Acme", bullets: ["Built a feature used by 500 customers"] },
        ],
      },
    };
    const findings = analyzeGrammarIssues(resume);
    const match = findings.find((f) => f.originalText === "Built a feature used by 500 customers");
    expect(match).toBeUndefined();
  });

  it("limits findings to 12 items", () => {
    const bullets = Array.from({ length: 20 }, (_, i) => `Was responsible for item ${i}`);
    const resume = {
      sections: {
        experience: [
          { role: "Engineer", company: "Acme", bullets },
        ],
      },
    };
    const findings = analyzeGrammarIssues(resume);
    expect(findings.length).toBeLessThanOrEqual(12);
  });

  it("handles mixed quality bullets correctly", () => {
    const resume = {
      sections: {
        experience: [
          {
            role: "Engineer",
            company: "Acme",
            bullets: [
              "Led a team of 10 engineers",
              "Was responsible for maintaining legacy code",
              "Built a feature used by 500 customers",
            ],
          },
        ],
      },
    };
    const findings = analyzeGrammarIssues(resume);
    const highFindings = findings.filter((f) => f.severity === "high");
    const passedBullets = ["Led a team of 10 engineers", "Built a feature used by 500 customers"];
    const passed = findings.filter((f) => passedBullets.includes(f.originalText));
    expect(highFindings.length).toBeGreaterThanOrEqual(1);
    expect(passed).toHaveLength(0);
  });
});

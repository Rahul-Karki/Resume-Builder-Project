import { describe, it, expect } from "vitest";
import { analyzeKeywordMatch } from "../processors/jdMatch.processor";

const baseResume = {
  personalInfo: { name: "John Doe", email: "john@example.com", summary: "Software engineer with 5 years experience" },
  sections: {
    experience: [
      { role: "Senior Engineer", company: "Acme", bullets: ["Built React components", "Optimized API performance by 40%"] },
    ],
    skills: [
      { category: "Languages", items: ["TypeScript", "Python", "JavaScript"] },
      { category: "Frameworks", items: ["React", "Node.js"] },
    ],
    projects: [
      { name: "Dashboard", tech: "React, D3", bullets: ["Built interactive charts"] },
    ],
  },
};

describe("jdMatch.processor", () => {
  it("returns zero match for empty resume and keywords", () => {
    const result = analyzeKeywordMatch({}, []);
    expect(result.matchScore).toBe(0);
    expect(result.matchedKeywordCount).toBe(0);
    expect(result.analysis.missingKeywords).toEqual([]);
  });

  it("matches keywords present in resume", () => {
    const result = analyzeKeywordMatch(baseResume, ["TypeScript", "React", "Python"]);
    expect(result.matchedKeywordCount).toBe(3);
    expect(result.matchScore).toBe(100);
    expect(result.analysis.matchedKeywords).toContain("typescript");
    expect(result.analysis.matchedKeywords).toContain("react");
  });

  it("identifies missing keywords", () => {
    const result = analyzeKeywordMatch(baseResume, ["TypeScript", "Kubernetes", "Docker"]);
    expect(result.matchedKeywordCount).toBe(1);
    expect(result.matchScore).toBeLessThan(100);
    const missing = result.analysis.missingKeywords.map((k) => k.keyword);
    expect(missing).toContain("kubernetes");
    expect(missing).toContain("docker");
  });

  it("extracts keywords from job description", () => {
    const jd = "We need a senior TypeScript developer with React experience and cloud infrastructure knowledge";
    const result = analyzeKeywordMatch(baseResume, [], jd);
    expect(result.matchedKeywordCount).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates keywords", () => {
    const result = analyzeKeywordMatch(baseResume, ["TypeScript", "TypeScript", "React"]);
    expect(result.matchedKeywordCount).toBe(2);
  });

  it("assigns importance based on keyword length", () => {
    const result = analyzeKeywordMatch(baseResume, ["TypeScript", "Kubernetes", "Go"]);
    const missing = result.analysis.missingKeywords;
    const kubernetes = missing.find((k) => k.keyword === "kubernetes");
    const go = missing.find((k) => k.keyword === "go");
    expect(kubernetes?.importance).toBe("critical");
    expect(go?.importance).toBe("optional");
  });

  it("detects repeated keywords", () => {
    const resume = {
      ...baseResume,
      sections: {
        ...baseResume.sections,
        skills: [{ category: "Lang", items: ["TypeScript"] }],
        experience: [
          ...baseResume.sections.experience,
          { role: "Dev", company: "Corp", bullets: ["Used TypeScript daily"] },
        ],
      },
    };
    const result = analyzeKeywordMatch(resume, ["TypeScript", "React"]);
    expect(result.analysis.repeatedKeywords).toContain("typescript");
  });

  it("handles case-insensitive matching", () => {
    const resume = {
      ...baseResume,
      sections: {
        ...baseResume.sections,
        experience: [{ role: "Engineer", company: "Co", bullets: ["Built apis with TYPESCRIPT"] }],
      },
    };
    const result = analyzeKeywordMatch(resume, ["typescript", "API"]);
    expect(result.analysis.matchedKeywords).toContain("typescript");
  });
});

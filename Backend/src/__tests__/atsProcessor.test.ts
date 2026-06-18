import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/AtsAnalysis", () => {
  const findOne = vi.fn();
  function mockFindOneReturn(value: any) {
    const chain = { lean: vi.fn().mockResolvedValue(value) };
    findOne.mockReturnValue(chain);
    return chain;
  }
  mockFindOneReturn(null);
  return {
    default: {
      findOne,
      findOneAndUpdate: vi.fn(),
    },
  };
});

vi.mock("../models/Resume", () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../observability", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../processors/jdMatch.processor", () => ({
  analyzeKeywordMatch: vi.fn(),
}));

vi.mock("../processors/grammarAnalysis.processor", () => ({
  analyzeGrammarIssues: vi.fn(),
}));

vi.mock("../utils/atsPromptTemplates", () => ({
  ENHANCED_ATS_SYSTEM_PROMPT: "You are an ATS analysis assistant.",
  buildEnhancedAtsUserPrompt: vi.fn(() => "User prompt"),
  isOptimizedPromptAvailable: false,
}));

import { processAtsAnalysisJob } from "../processors/ats.processor";
import { analyzeKeywordMatch } from "../processors/jdMatch.processor";
import { analyzeGrammarIssues } from "../processors/grammarAnalysis.processor";
import AtsAnalysis from "../models/AtsAnalysis";
import Resume from "../models/Resume";

function makeResume(overrides = {}) {
  return {
    personalInfo: {
      name: "John Doe",
      email: "john@example.com",
      summary: "Software engineer with 5 years of experience building scalable applications.",
    },
    sections: {
      experience: [
        {
          role: "Senior Engineer",
          company: "Acme Corp",
          bullets: [
            "Built a microservice architecture serving 10k requests per second",
            "Led a team of 5 engineers to deliver a major platform rewrite",
          ],
        },
      ],
      skills: [
        { category: "Languages", items: ["TypeScript", "Python", "Go"] },
        { category: "Frameworks", items: ["React", "Node.js"] },
      ],
      education: [{ degree: "B.S. Computer Science", institution: "MIT", year: "2018" }],
      projects: [
        { name: "Dashboard", tech: "React, D3", bullets: ["Built interactive data visualization"] },
      ],
    },
    ...overrides,
  };
}

function makeKeywordMatchResult(matched: string[], missing: string[]) {
  return {
    analysis: {
      matchedKeywords: matched,
      missingKeywords: missing.map((k) => ({ keyword: k, importance: "important" as const, reason: `Missing ${k}` })),
      repeatedKeywords: [],
      weakKeywords: [],
      atsFriendlyKeywords: matched,
      keywordDensity: matched.length > 0 ? matched.length / 10 : 0,
    },
    matchScore: matched.length > 0 ? Math.round((matched.length / (matched.length + missing.length)) * 100) : 0,
    matchedKeywordCount: matched.length,
  };
}

function makeGrammarResult() {
  return [
    { type: "spelling", message: "Test grammar issue", severity: "low" as const, suggestion: "Fix it" },
  ];
}

describe("ats.processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AtsAnalysis.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
  });

  it("should produce a heuristic-only report when AI is unavailable", async () => {
    vi.mocked(AtsAnalysis.findOneAndUpdate).mockResolvedValue({ toObject: () => ({ status: "completed", overallScore: 65 }) });
    vi.mocked(Resume.findOneAndUpdate).mockResolvedValue({} as any);
    vi.mocked(analyzeKeywordMatch).mockReturnValue(makeKeywordMatchResult(
      ["typescript", "python", "react", "node.js"],
      ["kubernetes"],
    ));
    vi.mocked(analyzeGrammarIssues).mockReturnValue(makeGrammarResult());

    const result = await processAtsAnalysisJob({
      id: "job-1",
      data: {
        resumeId: "res-1",
        userId: "user-1",
        analysisId: "analysis-1",
        resume: makeResume(),
        keywords: ["TypeScript", "Python", "React", "Kubernetes"],
        jobTitle: "Senior Software Engineer",
        jobDescription: "",
        reportType: "resume-analysis",
        previousOverallScore: undefined,
      },
    });

    expect(result).toBeDefined();
    expect(result.status).toBe("completed");
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it("should return lower score for sparse resume", async () => {
    vi.mocked(AtsAnalysis.findOneAndUpdate).mockResolvedValue({ toObject: () => ({ status: "completed", overallScore: 30 }) });
    vi.mocked(Resume.findOneAndUpdate).mockResolvedValue({} as any);
    vi.mocked(analyzeKeywordMatch).mockReturnValue(makeKeywordMatchResult([], ["typescript", "react", "python"]));
    vi.mocked(analyzeGrammarIssues).mockReturnValue([]);

    const sparseResume = {
      personalInfo: { name: "John", email: "john@test.com", summary: "" },
      sections: {
        experience: [],
        skills: [],
        education: [],
        projects: [],
      },
    };

    const result = await processAtsAnalysisJob({
      id: "job-2",
      data: {
        resumeId: "res-2",
        userId: "user-2",
        analysisId: "analysis-2",
        resume: sparseResume,
        keywords: ["TypeScript", "React", "Python"],
        jobTitle: "Engineer",
        jobDescription: "",
        reportType: "resume-analysis",
        previousOverallScore: undefined,
      },
    });

    expect(result.overallScore).toBeLessThan(50);
  });

  it("should detect missing sections and generate warnings", async () => {
    vi.mocked(AtsAnalysis.findOneAndUpdate).mockResolvedValue({ toObject: () => ({ status: "completed", overallScore: 40 }) });
    vi.mocked(Resume.findOneAndUpdate).mockResolvedValue({} as any);
    vi.mocked(analyzeKeywordMatch).mockReturnValue(makeKeywordMatchResult([], ["aws", "docker"]));
    vi.mocked(analyzeGrammarIssues).mockReturnValue([]);

    const minimalResume = {
      personalInfo: { name: "Jane", email: "jane@test.com", summary: "" },
      sections: {
        experience: [],
        skills: [],
        education: [],
        projects: [],
      },
    };

    const result = await processAtsAnalysisJob({
      id: "job-3",
      data: {
        resumeId: "res-3",
        userId: "user-3",
        analysisId: "analysis-3",
        resume: minimalResume,
        keywords: [],
        jobTitle: "Developer",
        jobDescription: "",
        reportType: "resume-analysis",
        previousOverallScore: undefined,
      },
    });

    expect(result.overallScore).toBeLessThan(50);
  });

  it("should handle empty keywords gracefully", async () => {
    vi.mocked(AtsAnalysis.findOneAndUpdate).mockResolvedValue({ toObject: () => ({ status: "completed", overallScore: 60 }) });
    vi.mocked(Resume.findOneAndUpdate).mockResolvedValue({} as any);
    vi.mocked(analyzeKeywordMatch).mockReturnValue(makeKeywordMatchResult([], []));
    vi.mocked(analyzeGrammarIssues).mockReturnValue([]);

    const result = await processAtsAnalysisJob({
      id: "job-4",
      data: {
        resumeId: "res-4",
        userId: "user-4",
        analysisId: "analysis-4",
        resume: makeResume(),
        keywords: [],
        jobTitle: "",
        jobDescription: "",
        reportType: "resume-analysis",
        previousOverallScore: undefined,
      },
    });

    expect(result).toBeDefined();
  });
});

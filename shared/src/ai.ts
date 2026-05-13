export type AiTone = "professional" | "concise" | "technical" | "leadership-focused";

export type AiSuggestionImpact = "low" | "medium" | "high";

export type AiSuggestion = {
  id: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  impact: AiSuggestionImpact;
  path?: string;
};

export type AtsSectionKey = "summary" | "experience" | "skills" | "education" | "projects" | "certifications" | "languages";

export type AtsSectionSuggestions = Partial<Record<AtsSectionKey, AiSuggestion[]>>;

export type AtsSectionAuditStatus = "present" | "missing" | "empty" | "weak";

export type AtsSectionAuditFix = {
  why: string;
  keywordsToInclude: string[];
  copyPasteTemplate: string;
  example: string;
  expectedScoreGain: number;
};

export type AtsSectionAudit = {
  section: AtsSectionKey | "contact_info" | "achievements" | "volunteer";
  status: AtsSectionAuditStatus;
  fix: AtsSectionAuditFix;
};

export type AtsActionPlanItem = {
  priority: "P0" | "P1" | "P2";
  action: string;
  whyItIncreasesScore: string;
  howToDo: string[];
  expectedScoreGain: number;
};

export type AtsKeywordPlacement = {
  keyword: string;
  placeIn: Array<"summary" | "skills" | "experience" | "projects">;
  exampleUsage: string;
};

export type AiRewriteResult = {
  suggestions: AiSuggestion[];
  variations: string[];
  summary: string;
};

export type AiGrammarIssue = {
  id: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  severity: AiSuggestionImpact;
  path?: string;
};

export type AiGrammarResult = {
  issues: AiGrammarIssue[];
  correctedText: string;
};

export type AtsScoreBreakdown = {
  summary: number;
  experience: number;
  skills: number;
  education: number;
  formatting: number;
  projects: number;
};

export type AtsKeywordAnalysis = {
  missingKeywords: string[];
  repeatedKeywords: string[];
  weakKeywords: string[];
  atsFriendlyKeywords: string[];
  matchedKeywords: string[];
};

export type AtsFormattingCheck = {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  reason: string;
};

export type AtsGrammarFinding = {
  id: string;
  path?: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  severity: AiSuggestionImpact;
};

export type AtsAnalysisReport = {
  jobId?: string;
  resumeId?: string;
  status: "pending" | "completed" | "failed";
  reportType: "resume-analysis" | "job-description-match";
  grade?: "poor" | "average" | "good" | "excellent";
  jobTitle?: string;
  jobDescription?: string;
  targetKeywords: string[];
  overallScore: number;
  matchScore: number;
  sectionScores: AtsScoreBreakdown;
  keywordAnalysis: AtsKeywordAnalysis;
  grammarIssues: AtsGrammarFinding[];
  formattingChecks: AtsFormattingCheck[];
  rewriteSuggestions: AiSuggestion[];
  perSectionSuggestions?: AtsSectionSuggestions;
  sectionAudit?: AtsSectionAudit[];
  actionPlan?: AtsActionPlanItem[];
  quickWins?: string[];
  estimatedScoreAfterFixes?: number;
  questionsForUser?: string[];
  keywordPlacement?: AtsKeywordPlacement[];
  keywordGaps?: string[];
  verdict?: string;
  summary: string;
  analyzedAt?: string;
};

export const AI_TONE_OPTIONS: AiTone[] = ["professional", "concise", "technical", "leadership-focused"];

export const ATS_REPORT_TYPES: AtsAnalysisReport["reportType"][] = ["resume-analysis", "job-description-match"];

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const createSuggestionId = (prefix: string, index: number) => `${prefix}-${index + 1}`;

export const normalizeTone = (tone?: string): AiTone => {
  if (tone === "concise" || tone === "technical" || tone === "leadership-focused") {
    return tone;
  }

  return "professional";
};

export const compactText = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

export const sliceText = (value: unknown, maxLength: number) => compactText(value).slice(0, maxLength);

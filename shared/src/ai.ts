export type AiTone = "professional" | "concise" | "technical" | "leadership-focused";

export type AiSuggestionImpact = "low" | "medium" | "high";

export type AiSuggestionPriority = "critical" | "high" | "medium" | "low";

export type ClickToApply = {
  type: "replace" | "insert" | "remove";
  targetText: string;
  replacementText: string;
};

export type AiSuggestion = {
  id: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  impact: AiSuggestionImpact;
  path?: string;
  priority?: AiSuggestionPriority;
  atsImpact?: string;
  scoreDelta?: number;
  appliedStatus?: "pending" | "applied" | "rolled_back";
  clickToApply?: ClickToApply;
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

export type AtsCategoryScores = {
  keywordMatch: number;
  parsing: number;
  contentQuality: number;
  experienceRelevance: number;
  formatting: number;
};

export type AtsFormatIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  section: string;
  problem: string;
  reason: string;
  fixSuggestion: string;
  startIndex: number;
  endIndex: number;
  clickToApply?: ClickToApply;
};

export type AtsContentImprovement = {
  id: string;
  section: AtsSectionKey;
  original: string;
  improved: string;
  reason: string;
  impact: string;
  atsGain: number;
  clickToApply?: ClickToApply;
};

export type AtsSectionAnalysis = {
  section: string;
  score: number;
  issues: string[];
  recommendations: string[];
};

export type AtsPriorityFix = {
  priority: number;
  issue: string;
  expectedScoreIncrease: number;
};

export type AiRewriteResult = {
  suggestions: AiSuggestion[];
  variations: string[];
  summary: string;
};

export type AtsScoreBreakdown = {
  summary: number;
  experience: number;
  skills: number;
  education: number;
  formatting: number;
  projects: number;
};

export type KeywordImportance = "critical" | "important" | "optional";

export type MissingKeyword = {
  keyword: string;
  importance: KeywordImportance;
  reason: string;
  suggestedPlacement?: string;
};

export type AtsKeywordAnalysis = {
  missingKeywords: MissingKeyword[];
  repeatedKeywords: string[];
  weakKeywords: string[];
  atsFriendlyKeywords: string[];
  matchedKeywords: string[];
};

export type AtsFormattingFix = {
  id: string;
  issue: string;
  fix: string;
  expectedImpact: string;
  codeExample?: string;
};

export type AtsFormattingCheck = {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  reason: string;
  fix?: string;
};

export type AtsGrammarFinding = {
  id: string;
  path?: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  severity: AiSuggestionImpact;
};

export type RecruiterImpression = {
  firstImpression: string;
  confidenceLevel: "low" | "medium" | "high";
  interviewProbability: number;
};

// ── Enhanced ATS Types ─────────────────────────────────────────

export type SectionScoreDetail = {
  atsScore: number;
  qualityScore: number;
  completenessScore: number;
  keywordRelevanceScore: number;
  recruiterEffectivenessScore: number;
};

export type ExpandendSectionKey = AtsSectionKey | "header" | "contact_info" | "achievements" | "interests" | "links" | "portfolio" | "publications" | "volunteer";

export type SectionWiseAnalysis = {
  section: ExpandendSectionKey;
  label: string;
  scores: SectionScoreDetail;
  isPresent: boolean;
  isEmpty: boolean;
  isPlaceholder: boolean;
  wordCount: number;
  bulletCount?: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingElements: string[];
};

export type BulletAnalysis = {
  text: string;
  hasStrongVerb: boolean;
  hasMetric: boolean;
  hasLeadershipIndicator: boolean;
  hasBusinessImpact: boolean;
  isGeneric: boolean;
  isPassive: boolean;
  suggestedImprovement: string;
};

export type ExperienceAnalysis = {
  entryCount: number;
  totalBullets: number;
  strongVerbRatio: number;
  quantifiedRatio: number;
  leadershipRatio: number;
  genericBulletCount: number;
  passiveVoiceCount: number;
  averageBulletLength: number;
  bulletAnalyses: BulletAnalysis[];
  topActionVerbs: string[];
  weakVerbsDetected: string[];
  missingElements: string[];
  suggestions: string[];
};

export type ProjectAnalysis = {
  entryCount: number;
  hasLinks: boolean;
  hasDeploymentLinks: boolean;
  hasGithubLinks: boolean;
  technicalDepthScore: number;
  hasMeasurableImpact: boolean;
  isTutorialLevel: boolean;
  technologiesUsed: string[];
  missingElements: string[];
  suggestions: string[];
};

export type SkillCategorization = {
  category: string;
  skills: string[];
  relevance: "high" | "medium" | "low";
  isOutdated: boolean;
  suggestions: string[];
};

export type SkillsAnalysis = {
  totalSkills: number;
  categorized: SkillCategorization[];
  redundantSkills: string[];
  outdatedTechnologies: string[];
  modernAlternatives: Array<{ old: string; modern: string }>;
  missingCriticalSkills: string[];
  categorizationScore: number;
  suggestions: string[];
};

export type RoleMatchAnalysis = {
  roleTitle: string;
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  weakKeywords: string[];
  experienceLevelMatch: "junior" | "mid" | "senior" | "lead" | "executive";
  suggestedRoles: string[];
  industryFit: string;
  suggestions: string[];
};

export type KeywordDensity = {
  keyword: string;
  count: number;
  density: number;
  suggestedMinCount: number;
  status: "good" | "low" | "overused";
};

export type ContentQualityAnalysis = {
  overallQuality: "excellent" | "good" | "average" | "poor";
  clarityScore: number;
  concisenessScore: number;
  impactScore: number;
  professionalismScore: number;
  grammarQuality: number;
  issues: string[];
  suggestions: string[];
};

export type RecruiterFeedback = {
  firstImpression: string;
  shortlistingProbability: number;
  technicalCredibility: "low" | "medium" | "high";
  leadershipImpression: "low" | "medium" | "high";
  resumeProfessionalism: "low" | "medium" | "high";
  clarityScore: number;
  detailFeedback: string;
  strengths: string[];
  concerns: string[];
};

export type IndustryCheck = {
  industry: string;
  checks: Array<{
    name: string;
    passed: boolean;
    importance: "critical" | "important" | "nice-to-have";
    details: string;
  }>;
};

export type AtsWarning = {
  type: "missing_section" | "empty_section" | "weak_content" | "missing_field" | "formatting" | "keyword" | "experience" | "education";
  severity: "critical" | "warning" | "info";
  section: ExpandendSectionKey;
  message: string;
  suggestion: string;
};

export type AtsRecommendation = {
  priority: "P0" | "P1" | "P2";
  category: "content" | "formatting" | "keywords" | "sections" | "experience" | "skills" | "education" | "projects";
  title: string;
  description: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
};

// ── Enhanced AtsAnalysisReport ─────────────────────────────────

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
  previousOverallScore?: number;
  verdict?: string;
  summary: string;
  analyzedAt?: string;
  recruiterImpression?: RecruiterImpression;
  strengths?: string[];
  weaknesses?: string[];
  priorityFixes?: string[] | AtsPriorityFix[];
  formattingFixes?: AtsFormattingFix[];
  categoryScores?: AtsCategoryScores;
  formatIssues?: AtsFormatIssue[];
  contentImprovements?: AtsContentImprovement[];
  sectionAnalysis?: AtsSectionAnalysis[];

  // ── Enhanced fields ──
  sectionWiseAnalysis?: SectionWiseAnalysis[];
  experienceAnalysis?: ExperienceAnalysis;
  projectsAnalysis?: ProjectAnalysis;
  skillsAnalysis?: SkillsAnalysis;
  roleMatchAnalysis?: RoleMatchAnalysis;
  keywordDensity?: KeywordDensity[];
  contentQualityAnalysis?: ContentQualityAnalysis;
  recruiterFeedback?: RecruiterFeedback;
  industryChecks?: IndustryCheck[];
  warnings?: AtsWarning[];
  recommendations?: AtsRecommendation[];
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

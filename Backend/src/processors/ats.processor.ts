import type { AtsAnalysisJobData } from "../../../shared/src/jobs";
import { clampScore, compactText, createSuggestionId, sliceText, type AiSuggestion, type AtsActionPlanItem, type AtsAnalysisReport, type AtsFormattingCheck, type AtsScoreBreakdown, type AtsSectionAudit, type AtsSectionKey, type AtsSectionSuggestions, type AtsKeywordPlacement, type RecruiterImpression, type AtsKeywordAnalysis, type AtsCategoryScores, type AtsFormatIssue, type AtsContentImprovement, type AtsSectionAnalysis, type ClickToApply, type SectionWiseAnalysis, type SectionScoreDetail, type ExpandendSectionKey, type ExperienceAnalysis, type BulletAnalysis, type ProjectAnalysis, type SkillsAnalysis, type SkillCategorization, type RoleMatchAnalysis, type KeywordDensity, type ContentQualityAnalysis, type RecruiterFeedback, type IndustryCheck, type AtsWarning, type AtsRecommendation } from "../../../shared/src/ai";
import { logger } from "../observability";
import AtsAnalysis from "../models/AtsAnalysis";
import Resume from "../models/Resume";
import { analyzeGrammarIssues } from "./grammarAnalysis.processor";
import { analyzeKeywordMatch } from "./jdMatch.processor";
import { env } from "../config/env";
import { buildEnhancedAtsUserPrompt, ENHANCED_ATS_SYSTEM_PROMPT, isOptimizedPromptAvailable } from "../utils/atsPromptTemplates";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const WEAK_VERBS = ["worked on", "helped", "responsible for", "was part of", "was involved in", "did", "made", "got", "was", "were"];

const QUANTIFICATION_PATTERNS = [/user[s]?/i, /customer[s]?/i, /client[s]?/i, /team[s]?/i, /project[s]?/i, /feature[s]?/i, /system[s]?/i, /service[s]?/i, /application[s]?/i, /api[s]?/i, /request[s]?/i, /revenue/i, /budget/i, /cost/i, /time/i, /performance/i, /efficiency/i, /speed/i, /accuracy/i];

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla|throughput|requests)\b/i.test(text);

const LEADERSHIP_INDICATORS = new Set([
  "led", "managed", "mentored", "directed", "oversaw", "coordinated", "chaired", "spearheaded", "headed", "supervised",
  "drove", "guided", "orchestrated", "established", "founded", "pioneered", "initiated", "launched", "championed",
  "defined", "shaped", "governed", "presided", "conducted", "organized",
]);

const BUSINESS_IMPACT_TERMS = [
  "revenue", "cost", "savings", "efficiency", "productivity", "growth", "profit", "margin", "roi",
  "kpi", "sla", "throughput", "conversion", "retention", "acquisition", "reduction", "improvement",
];

const PASSIVE_PATTERNS = [
  /\bwas\s+\w+ed\b/i, /\bwere\s+\w+ed\b/i, /\bhas been\s+\w+ed\b/i, /\bhave been\s+\w+ed\b/i,
  /\bhad been\s+\w+ed\b/i, /\bis being\s+\w+ed\b/i, /\bare being\s+\w+ed\b/i,
];

const GENERIC_PHRASES = [
  "responsible for", "duties included", "tasks included", "worked on", "helped with",
  "was responsible", "were responsible", "duties include", "tasks include", "job duties",
  "in charge of", "handled", "dealt with", "performed duties",
];

const TUTORIAL_INDICATORS = [
  "tutorial", "course project", "learning", "hello world", "academic project", "assignment",
  "class project", "following along", "learned", "beginner", "simple app", "basic",
  "introductory", "sample", "demo project", "follow along",
];

const OUTDATED_TECHNOLOGIES = new Set([
  "jquery", "angularjs", "angular.js", "backbone", "backbone.js", "coffeescript", "grunt",
  "bower", "ie8", "ie9", "vb6", "classic asp", "flash", "actionscript", "prototype.js",
  "dojo", "mootools", "yui", "knockout", "knockout.js", "mustache", "handlebars",
]);

const MODERN_ALTERNATIVES: Array<{ old: string; modern: string }> = [
  { old: "jquery", modern: "React/Vue modern DOM APIs" },
  { old: "angularjs", modern: "Angular 2+" },
  { old: "backbone", modern: "React/Vue" },
  { old: "coffeescript", modern: "TypeScript" },
  { old: "grunt", modern: "Vite/Webpack" },
  { old: "bower", modern: "npm/yarn" },
  { old: "flash", modern: "HTML5/CSS3/Canvas" },
  { old: "knockout", modern: "React/Vue" },
  { old: "mustache", modern: "React/JSX" },
];

const SECTION_LABELS: Record<string, string> = {
  summary: "Professional Summary",
  header: "Header",
  contact_info: "Contact Information",
  achievements: "Achievements",
  interests: "Interests",
  links: "Links",
  portfolio: "Portfolio",
  publications: "Publications",
  volunteer: "Volunteer",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
};
const INDUSTRY_CHECKS_MAP: Record<string, Omit<IndustryCheck, "industry">> = {
  "software-engineering": {
    checks: [
      { name: "Programming languages mentioned", passed: false, importance: "critical", details: "List relevant languages (Python, Java, TypeScript, etc.)" },
      { name: "Frameworks and libraries", passed: false, importance: "critical", details: "Mention frameworks relevant to the role (React, Spring, Django, etc.)" },
      { name: "System design indicators", passed: false, importance: "important", details: "Show understanding of architecture and scalability" },
      { name: "CI/CD experience", passed: false, importance: "important", details: "Include CI/CD tools experience (Jenkins, GitHub Actions, etc.)" },
      { name: "Testing practices", passed: false, importance: "important", details: "Mention unit, integration, or E2E testing experience" },
      { name: "Version control", passed: false, importance: "critical", details: "Git experience is expected" },
      { name: "Agile/Scrum experience", passed: false, importance: "nice-to-have", details: "Mention agile methodology experience" },
    ],
  },
  "data-science": {
    checks: [
      { name: "Machine learning frameworks", passed: false, importance: "critical", details: "List ML frameworks (TensorFlow, PyTorch, scikit-learn, etc.)" },
      { name: "Statistical analysis", passed: false, importance: "critical", details: "Show statistical methodology knowledge" },
      { name: "Data visualization", passed: false, importance: "important", details: "Mention visualization tools (Tableau, matplotlib, etc.)" },
      { name: "SQL proficiency", passed: false, importance: "critical", details: "SQL is fundamental for data roles" },
      { name: "Big data tools", passed: false, importance: "important", details: "Spark, Hadoop, or similar big data experience" },
      { name: "Python/R proficiency", passed: false, importance: "critical", details: "Python or R is essential for data science" },
    ],
  },
  "product-management": {
    checks: [
      { name: "Product metrics defined", passed: false, importance: "critical", details: "Show experience with product KPIs and metrics" },
      { name: "Stakeholder management", passed: false, importance: "critical", details: "Demonstrate cross-functional collaboration" },
      { name: "Agile/Scrum", passed: false, importance: "critical", details: "Agile methodology experience expected" },
      { name: "Roadmap planning", passed: false, importance: "important", details: "Show product roadmap experience" },
      { name: "User research", passed: false, importance: "important", details: "Mention user research or customer discovery" },
      { name: "A/B testing", passed: false, importance: "nice-to-have", details: "Experience with experimentation" },
    ],
  },
  "devops": {
    checks: [
      { name: "Cloud platforms", passed: false, importance: "critical", details: "AWS, GCP, or Azure experience" },
      { name: "Containerization", passed: false, importance: "critical", details: "Docker and Kubernetes experience" },
      { name: "Infrastructure as Code", passed: false, importance: "critical", details: "Terraform, Pulumi, or CloudFormation" },
      { name: "CI/CD pipelines", passed: false, importance: "critical", details: "Show CI/CD implementation experience" },
      { name: "Monitoring & observability", passed: false, importance: "important", details: "Prometheus, Grafana, Datadog, etc." },
      { name: "Linux administration", passed: false, importance: "important", details: "Linux system administration skills" },
    ],
  },
  "design": {
    checks: [
      { name: "Design tools proficiency", passed: false, importance: "critical", details: "Figma, Sketch, or Adobe XD experience" },
      { name: "UX research methods", passed: false, importance: "important", details: "User research and usability testing" },
      { name: "Prototyping", passed: false, importance: "critical", details: "Interactive prototyping experience" },
      { name: "Design systems", passed: false, importance: "important", details: "Design system creation or maintenance" },
      { name: "Portfolio presence", passed: false, importance: "critical", details: "Portfolio link is essential for design roles" },
    ],
  },
};

type AiAtsEnhancement = {
  grade?: AtsAnalysisReport["grade"];
  overallScore?: number;
  sectionScores?: Partial<AtsScoreBreakdown>;
  jdKeywords: string[];
  rewriteSuggestions: AiSuggestion[];
  perSectionSuggestions: AtsSectionSuggestions;
  keywordGaps: string[];
  verdict?: string;
  quickWins: string[];
  actionPlan: AtsActionPlanItem[];
  sectionAudit: AtsSectionAudit[];
  estimatedScoreAfterFixes?: number;
  keywordPlacement: AtsKeywordPlacement[];
  questionsForUser: string[];
  categoryScores?: AtsCategoryScores;
  formatIssues?: AtsFormatIssue[];
  contentImprovements?: AtsContentImprovement[];
  sectionAnalysis?: AtsSectionAnalysis[];
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

const SECTION_KEYS: AtsSectionKey[] = ["summary", "experience", "skills", "education", "projects", "certifications", "languages"];

const normalizeImpact = (value: unknown): AiSuggestion["impact"] => {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
};

const normalizeSectionKey = (section: string): AtsSectionKey | null => {
  if (SECTION_KEYS.includes(section as AtsSectionKey)) return section as AtsSectionKey;
  return null;
};

const normalizeSectionAuditSection = (section: unknown): AtsSectionAudit["section"] => {
  if (typeof section !== "string") return "experience";
  if (section === "contact_info" || section === "achievements" || section === "volunteer") return section;
  return normalizeSectionKey(section) ?? "experience";
};

const normalizeSectionAuditStatus = (status: unknown): AtsSectionAudit["status"] => {
  if (status === "present" || status === "missing" || status === "empty" || status === "weak") return status;
  return "weak";
};

const normalizeActionPlanPriority = (priority: unknown): AtsActionPlanItem["priority"] => {
  if (priority === "P0" || priority === "P1" || priority === "P2") return priority;
  return "P1";
};

const normalizeScoreValue = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clampScore(numeric) : undefined;
};

const normalizeKeywordPlacement = (value: unknown): AtsKeywordPlacement[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        keyword: compactText(record.keyword),
        placeIn: Array.isArray(record.place_in)
          ? record.place_in.filter((entry) => typeof entry === "string").map((entry) => entry as AtsKeywordPlacement["placeIn"][number])
          : Array.isArray(record.placeIn)
            ? record.placeIn.filter((entry) => typeof entry === "string").map((entry) => entry as AtsKeywordPlacement["placeIn"][number])
            : [],
        exampleUsage: compactText(record.example_usage) || compactText(record.exampleUsage),
      };
    })
    .filter((item) => Boolean(item.keyword));
};

const asStringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
  : [];

const getNested = (value: unknown, key: string) => {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
};

const toSectionFromArea = (area: string): AtsSectionKey => {
  const normalized = compactText(area).toLowerCase();
  if (normalized.includes("summary")) return "summary";
  if (normalized.includes("experience")) return "experience";
  if (normalized.includes("skills")) return "skills";
  if (normalized.includes("education")) return "education";
  if (normalized.includes("project")) return "projects";
  if (normalized.includes("certification")) return "certifications";
  if (normalized.includes("language")) return "languages";
  return "experience";
};

const sectionPathForKey = (section: AtsSectionKey) => section === "summary" ? "personalInfo.summary" : `sections.${section}`;

const providerIsConfigured = () => {
  if (env.AI_PROVIDER === "openai") return Boolean(env.OPENAI_API_KEY);
  if (env.AI_PROVIDER === "gemini") return Boolean(env.GEMINI_API_KEY);
  if (env.AI_PROVIDER === "openrouter") return Boolean(env.OPENROUTER_API_KEY);
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY || env.OPENROUTER_API_KEY);
};

type AiProviderName = "openai" | "gemini" | "openrouter";

const getProviderOrder = (): AiProviderName[] => {
  const configured: AiProviderName[] = [];
  if (env.GEMINI_API_KEY) configured.push("gemini");
  if (env.OPENAI_API_KEY) configured.push("openai");
  if (env.OPENROUTER_API_KEY) configured.push("openrouter");
  if (env.AI_PROVIDER === "openai") {
    return env.OPENAI_API_KEY ? ["openai", ...configured.filter((p) => p !== "openai")] : configured;
  }
  if (env.AI_PROVIDER === "gemini") {
    return env.GEMINI_API_KEY ? ["gemini", ...configured.filter((p) => p !== "gemini")] : configured;
  }
  if (env.AI_PROVIDER === "openrouter") {
    return env.OPENROUTER_API_KEY ? ["openrouter", ...configured.filter((p) => p !== "openrouter")] : configured;
  }
  return configured;
};

const withTimeout = async <T>(timeoutMs: number, operation: (signal: AbortSignal) => Promise<T>) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseJsonFromModel = (raw: string) => {
  const cleaned = String(raw ?? "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned || "{}") as Record<string, unknown>;
};

const callOpenAIJson = async (systemPrompt: string, userPrompt: string, signal: AbortSignal) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    signal,
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
};

const callOpenRouterJson = async (systemPrompt: string, userPrompt: string, signal: AbortSignal) => {
  const baseUrl = env.OPENROUTER_BASE_URL.replace(/\/+$/, "");
  const models = [env.OPENROUTER_MODEL, ...env.OPENROUTER_FALLBACK_MODELS];
  let lastError: unknown;
  for (const model of models) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://resume-builder-project-3h9o.vercel.app",
          "X-Title": "Resume Builder",
        },
        signal,
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (response.ok) {
        const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        return json.choices?.[0]?.message?.content ?? "{}";
      }
      const body = await response.text().catch(() => "");
      if (response.status === 429 || response.status === 503) {
        lastError = new Error(`OpenRouter rate limited on ${model}: ${response.status} ${body.slice(0, 200)}`);
        continue;
      }
      throw new Error(`OpenRouter request failed with status ${response.status}: ${body.slice(0, 200)}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("All OpenRouter models exhausted");
};

const callGeminiJson = async (systemPrompt: string, userPrompt: string, signal: AbortSignal) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }
  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
};
const normalizeSectionWiseAnalysis = (value: unknown): SectionWiseAnalysis[] => {
  const raw = (Array.isArray(value) ? value :
    Array.isArray((value as Record<string, unknown> | undefined)?.sectionWiseAnalysis) ? (value as Record<string, unknown>).sectionWiseAnalysis :
    Array.isArray((value as Record<string, unknown> | undefined)?.section_wise_analysis) ? (value as Record<string, unknown>).section_wise_analysis : []) as unknown[];
  return raw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    const scoresRaw = (record.scores ?? record.score) as Record<string, unknown> | undefined;
    const scores: SectionScoreDetail = {
      atsScore: clampScore(Number((scoresRaw?.atsScore ?? scoresRaw?.ats_score ?? scoresRaw?.ats ?? 0))),
      qualityScore: clampScore(Number((scoresRaw?.qualityScore ?? scoresRaw?.quality_score ?? scoresRaw?.quality ?? 0))),
      completenessScore: clampScore(Number((scoresRaw?.completenessScore ?? scoresRaw?.completeness_score ?? scoresRaw?.completeness ?? 0))),
      keywordRelevanceScore: clampScore(Number((scoresRaw?.keywordRelevanceScore ?? scoresRaw?.keyword_relevance_score ?? scoresRaw?.keywordRelevance ?? 0))),
      recruiterEffectivenessScore: clampScore(Number((scoresRaw?.recruiterEffectivenessScore ?? scoresRaw?.recruiter_effectiveness_score ?? scoresRaw?.recruiterEffectiveness ?? 0))),
    };
    return {
      section: compactText(record.section) as ExpandendSectionKey,
      label: compactText(record.label) || SECTION_LABELS[compactText(record.section)] || compactText(record.section),
      scores,
      isPresent: Boolean(record.isPresent ?? record.is_present ?? true),
      isEmpty: Boolean(record.isEmpty ?? record.is_empty ?? false),
      isPlaceholder: Boolean(record.isPlaceholder ?? record.is_placeholder ?? false),
      wordCount: Number(record.wordCount ?? record.word_count ?? 0),
      bulletCount: record.bulletCount !== undefined ? Number(record.bulletCount) : record.bullet_count !== undefined ? Number(record.bullet_count) : undefined,
      strengths: asStringArray(record.strengths),
      weaknesses: asStringArray(record.weaknesses),
      suggestions: asStringArray(record.suggestions),
      missingElements: asStringArray(record.missingElements ?? record.missing_elements),
    } as SectionWiseAnalysis;
  });
};

const normalizeExperienceAnalysis = (value: unknown): ExperienceAnalysis | undefined => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const bulletRaw = record.bulletAnalyses ?? record.bullet_analyses ?? record.bulletAnalysis ?? record.bullet_analysis;
  const bulletAnalyses: BulletAnalysis[] = Array.isArray(bulletRaw)
    ? bulletRaw.filter((b: unknown) => b && typeof b === "object").map((b: unknown) => {
        const br = b as Record<string, unknown>;
        return {
          text: compactText(br.text),
          hasStrongVerb: Boolean(br.hasStrongVerb ?? br.has_strong_verb ?? false),
          hasMetric: Boolean(br.hasMetric ?? br.has_metric ?? false),
          hasLeadershipIndicator: Boolean(br.hasLeadershipIndicator ?? br.has_leadership_indicator ?? false),
          hasBusinessImpact: Boolean(br.hasBusinessImpact ?? br.has_business_impact ?? false),
          isGeneric: Boolean(br.isGeneric ?? br.is_generic ?? false),
          isPassive: Boolean(br.isPassive ?? br.is_passive ?? false),
          suggestedImprovement: compactText(br.suggestedImprovement ?? br.suggested_improvement ?? ""),
        } as BulletAnalysis;
      })
    : [];
  return {
    entryCount: Number(record.entryCount ?? record.entry_count ?? 0),
    totalBullets: Number(record.totalBullets ?? record.total_bullets ?? 0),
    strongVerbRatio: Number(record.strongVerbRatio ?? record.strong_verb_ratio ?? 0),
    quantifiedRatio: Number(record.quantifiedRatio ?? record.quantified_ratio ?? 0),
    leadershipRatio: Number(record.leadershipRatio ?? record.leadership_ratio ?? 0),
    genericBulletCount: Number(record.genericBulletCount ?? record.generic_bullet_count ?? 0),
    passiveVoiceCount: Number(record.passiveVoiceCount ?? record.passive_voice_count ?? 0),
    averageBulletLength: Number(record.averageBulletLength ?? record.average_bullet_length ?? 0),
    bulletAnalyses,
    topActionVerbs: asStringArray(record.topActionVerbs ?? record.top_action_verbs),
    weakVerbsDetected: asStringArray(record.weakVerbsDetected ?? record.weak_verbs_detected),
    missingElements: asStringArray(record.missingElements ?? record.missing_elements),
    suggestions: asStringArray(record.suggestions),
  } as ExperienceAnalysis;
};

const normalizeProjectsAnalysis = (value: unknown): ProjectAnalysis | undefined => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    entryCount: Number(record.entryCount ?? record.entry_count ?? 0),
    hasLinks: Boolean(record.hasLinks ?? record.has_links ?? false),
    hasDeploymentLinks: Boolean(record.hasDeploymentLinks ?? record.has_deployment_links ?? false),
    hasGithubLinks: Boolean(record.hasGithubLinks ?? record.has_github_links ?? false),
    technicalDepthScore: clampScore(Number(record.technicalDepthScore ?? record.technical_depth_score ?? 0)),
    hasMeasurableImpact: Boolean(record.hasMeasurableImpact ?? record.has_measurable_impact ?? false),
    isTutorialLevel: Boolean(record.isTutorialLevel ?? record.is_tutorial_level ?? false),
    technologiesUsed: asStringArray(record.technologiesUsed ?? record.technologies_used),
    missingElements: asStringArray(record.missingElements ?? record.missing_elements),
    suggestions: asStringArray(record.suggestions),
  } as ProjectAnalysis;
};

const normalizeSkillsAnalysis = (value: unknown): SkillsAnalysis | undefined => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const catRaw = record.categorized ?? record.categories;
  const categorized: SkillCategorization[] = Array.isArray(catRaw)
    ? catRaw.filter((c: unknown) => c && typeof c === "object").map((c: unknown) => {
        const cr = c as Record<string, unknown>;
        return {
          category: compactText(cr.category),
          skills: asStringArray(cr.skills),
          relevance: (cr.relevance === "high" || cr.relevance === "medium" || cr.relevance === "low") ? cr.relevance : "medium",
          isOutdated: Boolean(cr.isOutdated ?? cr.is_outdated ?? false),
          suggestions: asStringArray(cr.suggestions),
        } as SkillCategorization;
      })
    : [];
  const modernAltRaw = record.modernAlternatives ?? record.modern_alternatives;
  const modernAlternatives: Array<{ old: string; modern: string }> = Array.isArray(modernAltRaw)
    ? modernAltRaw.filter((m: unknown) => m && typeof m === "object").map((m: unknown) => {
        const mr = m as Record<string, unknown>;
        return { old: compactText(mr.old), modern: compactText(mr.modern) };
      })
    : [];
  return {
    totalSkills: Number(record.totalSkills ?? record.total_skills ?? 0),
    categorized,
    redundantSkills: asStringArray(record.redundantSkills ?? record.redundant_skills),
    outdatedTechnologies: asStringArray(record.outdatedTechnologies ?? record.outdated_technologies),
    modernAlternatives,
    missingCriticalSkills: asStringArray(record.missingCriticalSkills ?? record.missing_critical_skills),
    categorizationScore: clampScore(Number(record.categorizationScore ?? record.categorization_score ?? 0)),
    suggestions: asStringArray(record.suggestions),
  } as SkillsAnalysis;
};
const normalizeRoleMatchAnalysis = (value: unknown): RoleMatchAnalysis | undefined => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const elm = record.experienceLevelMatch ?? record.experience_level_match;
  return {
    roleTitle: compactText(record.roleTitle ?? record.role_title ?? ""),
    matchPercentage: clampScore(Number(record.matchPercentage ?? record.match_percentage ?? 0)),
    matchedKeywords: asStringArray(record.matchedKeywords ?? record.matched_keywords),
    missingKeywords: asStringArray(record.missingKeywords ?? record.missing_keywords),
    weakKeywords: asStringArray(record.weakKeywords ?? record.weak_keywords),
    experienceLevelMatch: (elm === "junior" || elm === "mid" || elm === "senior" || elm === "lead" || elm === "executive") ? elm : "mid",
    suggestedRoles: asStringArray(record.suggestedRoles ?? record.suggested_roles),
    industryFit: compactText(record.industryFit ?? record.industry_fit ?? ""),
    suggestions: asStringArray(record.suggestions),
  } as RoleMatchAnalysis;
};

const normalizeKeywordDensity = (value: unknown): KeywordDensity[] => {
  const raw = (Array.isArray(value) ? value :
    Array.isArray((value as Record<string, unknown> | undefined)?.keywordDensity) ? (value as Record<string, unknown>).keywordDensity :
    Array.isArray((value as Record<string, unknown> | undefined)?.keyword_density) ? (value as Record<string, unknown>).keyword_density : []) as unknown[];
  return raw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    return { keyword: compactText(record.keyword), count: Number(record.count ?? 0), density: Number(record.density ?? 0), suggestedMinCount: Number(record.suggestedMinCount ?? record.suggested_min_count ?? 0), status: (record.status === "good" || record.status === "low" || record.status === "overused") ? record.status : "good" } as KeywordDensity;
  });
};

const normalizeContentQualityAnalysis = (value: unknown): ContentQualityAnalysis | undefined => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const oq = record.overallQuality ?? record.overall_quality;
  return {
    overallQuality: (oq === "excellent" || oq === "good" || oq === "average" || oq === "poor") ? oq : "average",
    clarityScore: clampScore(Number(record.clarityScore ?? record.clarity_score ?? 0)),
    concisenessScore: clampScore(Number(record.concisenessScore ?? record.conciseness_score ?? 0)),
    impactScore: clampScore(Number(record.impactScore ?? record.impact_score ?? 0)),
    professionalismScore: clampScore(Number(record.professionalismScore ?? record.professionalism_score ?? 0)),
    grammarQuality: clampScore(Number(record.grammarQuality ?? record.grammar_quality ?? 0)),
    issues: asStringArray(record.issues),
    suggestions: asStringArray(record.suggestions),
  } as ContentQualityAnalysis;
};

const normalizeRecruiterFeedback = (value: unknown): RecruiterFeedback | undefined => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const tc = record.technicalCredibility ?? record.technical_credibility;
  const li = record.leadershipImpression ?? record.leadership_impression;
  const rp = record.resumeProfessionalism ?? record.resume_professionalism;
  return {
    firstImpression: compactText(record.firstImpression ?? record.first_impression ?? ""),
    shortlistingProbability: clampScore(Number(record.shortlistingProbability ?? record.shortlisting_probability ?? 0)),
    technicalCredibility: (tc === "low" || tc === "medium" || tc === "high") ? tc : "medium",
    leadershipImpression: (li === "low" || li === "medium" || li === "high") ? li : "medium",
    resumeProfessionalism: (rp === "low" || rp === "medium" || rp === "high") ? rp : "medium",
    clarityScore: clampScore(Number(record.clarityScore ?? record.clarity_score ?? 0)),
    detailFeedback: compactText(record.detailFeedback ?? record.detail_feedback ?? ""),
    strengths: asStringArray(record.strengths),
    concerns: asStringArray(record.concerns),
  } as RecruiterFeedback;
};

const normalizeIndustryChecks = (value: unknown): IndustryCheck[] => {
  const raw = (Array.isArray(value) ? value :
    Array.isArray((value as Record<string, unknown> | undefined)?.industryChecks) ? (value as Record<string, unknown>).industryChecks :
    Array.isArray((value as Record<string, unknown> | undefined)?.industry_checks) ? (value as Record<string, unknown>).industry_checks : []) as unknown[];
  return raw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    const checksRaw = record.checks;
    return {
      industry: compactText(record.industry),
      checks: Array.isArray(checksRaw) ? checksRaw.filter((c: unknown) => c && typeof c === "object").map((c: unknown) => {
        const cr = c as Record<string, unknown>;
        const imp = cr.importance;
        return { name: compactText(cr.name), passed: Boolean(cr.passed), importance: (imp === "critical" || imp === "important" || imp === "nice-to-have") ? imp : "important", details: compactText(cr.details) };
      }) : [],
    } as IndustryCheck;
  });
};

const normalizeWarnings = (value: unknown): AtsWarning[] => {
  const raw = (Array.isArray(value) ? value :
    Array.isArray((value as Record<string, unknown> | undefined)?.warnings) ? (value as Record<string, unknown>).warnings : []) as unknown[];
  return raw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    const t = record.type;
    const sv = record.severity;
    return { type: (t === "missing_section" || t === "empty_section" || t === "weak_content" || t === "missing_field" || t === "formatting" || t === "keyword" || t === "experience" || t === "education") ? t : "weak_content", severity: (sv === "critical" || sv === "warning" || sv === "info") ? sv : "warning", section: compactText(record.section) as ExpandendSectionKey, message: compactText(record.message), suggestion: compactText(record.suggestion) } as AtsWarning;
  });
};

const normalizeRecommendations = (value: unknown): AtsRecommendation[] => {
  const raw = (Array.isArray(value) ? value :
    Array.isArray((value as Record<string, unknown> | undefined)?.recommendations) ? (value as Record<string, unknown>).recommendations : []) as unknown[];
  return raw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    const p = record.priority;
    const cat = record.category;
    return { priority: (p === "P0" || p === "P1" || p === "P2") ? p : "P1", category: (cat === "content" || cat === "formatting" || cat === "keywords" || cat === "sections" || cat === "experience" || cat === "skills" || cat === "education" || cat === "projects") ? cat : "content", title: compactText(record.title), description: compactText(record.description), expectedImpact: compactText(record.expectedImpact ?? record.expected_impact ?? ""), effort: (record.effort === "low" || record.effort === "medium" || record.effort === "high") ? record.effort : "medium" } as AtsRecommendation;
  });
};
const normalizeEnhancement = (value: Record<string, unknown>): AiAtsEnhancement => {
  const keywordAnalysis = (getNested(value, "keyword_analysis") ?? getNested(value, "keywordAnalysis")) as Record<string, unknown> | undefined;
  const jdKeywordBuckets = getNested(keywordAnalysis, "jd_keywords") as Record<string, unknown> | undefined;
  const jdKeywords = Array.from(new Set([
    ...asStringArray(value.jdKeywords), ...asStringArray(getNested(value, "jd_keywords")),
    ...asStringArray(getNested(jdKeywordBuckets, "hard_skills")), ...asStringArray(getNested(jdKeywordBuckets, "tools_technologies")),
    ...asStringArray(getNested(jdKeywordBuckets, "industry_terms")), ...asStringArray(getNested(jdKeywordBuckets, "action_verbs")),
  ]));
  const rawRewriteSuggestions = (Array.isArray(value.rewriteSuggestions) ? value.rewriteSuggestions : []).concat(Array.isArray(value.rewrite_suggestions) ? value.rewrite_suggestions : []);
  const rewriteSuggestions: AiSuggestion[] = rawRewriteSuggestions.filter((item) => item && typeof item === "object").map((item, index) => {
    const record = item as Record<string, unknown>;
    const section = toSectionFromArea(compactText(record.area));
    const suggestionText = compactText(record.suggestionText) || compactText(record.after) || compactText(record.after_text) || compactText(record.example_improved);
    const originalText = compactText(record.originalText) || compactText(record.before) || compactText(record.before_text);
    const reason = compactText(record.reason) || compactText(record.why_it_hurts_ats) || compactText(record.what_to_add_or_fix) || "ATS improvement suggestion";
    const scoreDelta = Number.isFinite(Number(record.scoreDelta)) ? Number(record.scoreDelta) : Number.isFinite(Number(record.expected_score_gain)) ? Number(record.expected_score_gain) : undefined;
    return {
      id: typeof record.id === "string" && compactText(record.id) ? record.id : createSuggestionId("ai-ats", index),
      originalText, suggestionText, reason,
      impact: normalizeImpact(record.impact ?? (Number(record.expected_score_gain) >= 8 ? "high" : Number(record.expected_score_gain) >= 4 ? "medium" : "low")),
      path: typeof record.path === "string" && compactText(record.path) ? compactText(record.path) : sectionPathForKey(section),
      ...(scoreDelta !== undefined ? { scoreDelta } : {}),
      ...(Number(record.expected_score_gain) > 0 ? { atsImpact: `+${Number(record.expected_score_gain)}` } : { atsImpact: undefined }),
    };
  }).filter((item) => Boolean(item.suggestionText));

  const perSectionSuggestions = SECTION_KEYS.reduce<AtsSectionSuggestions>((accumulator, section) => {
    const candidateObject = (value.perSectionSuggestions && typeof value.perSectionSuggestions === "object" ? value.perSectionSuggestions : (value.per_section_suggestions && typeof value.per_section_suggestions === "object" ? value.per_section_suggestions : undefined)) as Record<string, unknown> | undefined;
    const rawSuggestions = candidateObject ? candidateObject[section] : undefined;
    const items = Array.isArray(rawSuggestions) ? rawSuggestions.filter((item) => typeof item === "string").map((item, index) => ({ id: createSuggestionId(`section-${section}`, index), originalText: "", suggestionText: compactText(item), reason: `${section} improvement suggestion`, impact: "medium" as const, path: sectionPathForKey(section) })).filter((item) => Boolean(item.suggestionText)) : [];
    if (items.length > 0) accumulator[section] = items;
    return accumulator;
  }, {});

  const sectionScores = value.section_scores && typeof value.section_scores === "object" ? {
    summary: normalizeScoreValue((value.section_scores as Record<string, unknown>).summary),
    experience: normalizeScoreValue((value.section_scores as Record<string, unknown>).experience),
    skills: normalizeScoreValue((value.section_scores as Record<string, unknown>).skills),
    education: normalizeScoreValue((value.section_scores as Record<string, unknown>).education),
    formatting: normalizeScoreValue((value.section_scores as Record<string, unknown>).formatting),
    projects: normalizeScoreValue((value.section_scores as Record<string, unknown>).projects),
  } : undefined;

  const overallScore = Number.isFinite(Number(value.overall_score)) ? clampScore(Number(value.overall_score)) : undefined;
  const sectionAudit = Array.isArray(value.section_audit) ? value.section_audit.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    const fix = (record.fix && typeof record.fix === "object") ? (record.fix as Record<string, unknown>) : {};
    return { section: normalizeSectionAuditSection(record.section), status: normalizeSectionAuditStatus(record.status), fix: { why: compactText(fix.why), keywordsToInclude: Array.isArray(fix.keywords_to_include) ? fix.keywords_to_include.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean) : Array.isArray(fix.keywordsToInclude) ? fix.keywordsToInclude.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean) : [], copyPasteTemplate: compactText(fix.copy_paste_template) || compactText(fix.copyPasteTemplate), example: compactText(fix.example), expectedScoreGain: Number(fix.expected_score_gain ?? fix.expectedScoreGain ?? 0) } } as AtsSectionAudit;
  }).filter((item) => Boolean(item.fix.why || item.fix.copyPasteTemplate || item.fix.example)) : [];

  sectionAudit.forEach((auditItem, index) => {
    const section = normalizeSectionKey(String(auditItem.section));
    if (!section) return;
    const suggestions = perSectionSuggestions[section] ?? [];
    const suggestionText = compactText(auditItem.fix.copyPasteTemplate) || compactText(auditItem.fix.example) || compactText(auditItem.fix.why);
    if (suggestionText) {
      suggestions.push({ id: createSuggestionId(`audit-${section}`, index), originalText: "", suggestionText, reason: auditItem.fix.why || `${section} improvement suggestion`, impact: normalizeImpact(auditItem.status === "missing" || auditItem.status === "empty" ? "high" : "medium"), path: sectionPathForKey(section) });
      perSectionSuggestions[section] = suggestions;
    }
  });

  const copyPasteSnippets = (getNested(value, "copy_paste_snippets") ?? getNested(value, "copyPasteSnippets")) as Record<string, unknown> | undefined;
  const summaryOptions = asStringArray(getNested(copyPasteSnippets, "summary_options")).concat(asStringArray(getNested(copyPasteSnippets, "summaryOptions")));
  if (summaryOptions.length > 0) {
    const existing = perSectionSuggestions.summary ?? [];
    summaryOptions.slice(0, 3).forEach((item, index) => { existing.push({ id: createSuggestionId("snippet-summary", index), originalText: "", suggestionText: item, reason: "Use this ATS-optimized summary option", impact: "medium", path: "personalInfo.summary" }); });
    perSectionSuggestions.summary = existing;
  }
  const skillsSectionSnippet = compactText(getNested(copyPasteSnippets, "skills_section") ?? getNested(copyPasteSnippets, "skillsSection"));
  if (skillsSectionSnippet) {
    const existing = perSectionSuggestions.skills ?? [];
    existing.push({ id: createSuggestionId("snippet-skills", existing.length), originalText: "", suggestionText: skillsSectionSnippet, reason: "Add ATS-friendly skills grouping", impact: "medium", path: "sections.skills" });
    perSectionSuggestions.skills = existing;
  }

  const actionPlan = Array.isArray(value.action_plan) ? value.action_plan.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    return { priority: normalizeActionPlanPriority(record.priority), action: compactText(record.action), whyItIncreasesScore: compactText(record.why_it_increases_score) || compactText(record.whyItIncreasesScore), howToDo: Array.isArray(record.how_to_do) ? record.how_to_do.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean) : Array.isArray(record.howToDo) ? record.howToDo.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean) : [], expectedScoreGain: Number(record.expected_score_gain ?? record.expectedScoreGain ?? 0) } as AtsActionPlanItem;
  }).filter((item) => Boolean(item.action || item.whyItIncreasesScore)) : [];

  const quickWins = Array.isArray(value.quick_wins) ? value.quick_wins.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean) : Array.isArray(value.quickWins) ? value.quickWins.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean) : [];
  const estimatedScoreAfterFixes = Number.isFinite(Number(value.estimated_score_after_fixes ?? value.estimatedScoreAfterFixes)) ? clampScore(Number(value.estimated_score_after_fixes ?? value.estimatedScoreAfterFixes)) : undefined;
  const keywordPlacement = normalizeKeywordPlacement(value.keyword_placement ?? value.keywordPlacement);

  const keywordGaps = Array.from(new Set([
    ...asStringArray(value.keywordGaps), ...asStringArray(value.keyword_gaps),
    ...asStringArray(getNested(keywordAnalysis, "missing_keywords")), ...asStringArray(getNested(keywordAnalysis, "missingKeywords")),
  ]));

  const verdict = compactText(value.verdict) || compactText(value.summary) || asStringArray(getNested(getNested(value, "diagnosis"), "top_problems")).slice(0, 2).join(" ");
  const grade = typeof value.grade === "string" ? compactText(value.grade) : "";
  const questionsForUser = Array.isArray(value.questionsForUser) ? value.questionsForUser.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean) : Array.isArray(value.questions_for_user) ? value.questions_for_user.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean) : [];

  const topLevelMissingKeywords = Array.isArray(value.missingKeywords) ? value.missingKeywords.filter((item) => item && typeof item === "object") : Array.isArray(value.missing_keywords) ? value.missing_keywords.filter((item) => item && typeof item === "object") : [];
  if (topLevelMissingKeywords.length > 0) {
    topLevelMissingKeywords.forEach((item) => { const record = item as Record<string, unknown>; const kw = compactText(record.keyword); if (kw && !keywordGaps.includes(kw)) keywordGaps.push(kw); });
  }

  const categoryScoresRaw = (value.categoryScores ?? value.category_scores) as Record<string, unknown> | undefined;
  const categoryScores: AtsCategoryScores | undefined = categoryScoresRaw && typeof categoryScoresRaw === "object" ? {
    keywordMatch: clampScore(Number(categoryScoresRaw.keywordMatch ?? categoryScoresRaw.keyword_match ?? 0)),
    parsing: clampScore(Number(categoryScoresRaw.parsing ?? 0)),
    contentQuality: clampScore(Number(categoryScoresRaw.contentQuality ?? categoryScoresRaw.content_quality ?? 0)),
    experienceRelevance: clampScore(Number(categoryScoresRaw.experienceRelevance ?? categoryScoresRaw.experience_relevance ?? 0)),
    formatting: clampScore(Number(categoryScoresRaw.formatting ?? 0)),
  } : undefined;

  const formatIssuesRaw = (value.formatIssues ?? value.format_issues) as unknown[];
  const formatIssues: AtsFormatIssue[] = Array.isArray(formatIssuesRaw) ? formatIssuesRaw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    const cta = record.clickToApply as Record<string, unknown> | undefined;
    return { id: compactText(record.id) || createSuggestionId("fmt", formatIssuesRaw.indexOf(item)), severity: record.severity === "high" || record.severity === "medium" || record.severity === "low" ? record.severity : "medium", section: compactText(record.section) || "", problem: compactText(record.problem) || "", reason: compactText(record.reason) || "", fixSuggestion: compactText(record.fixSuggestion) || compactText(record.fix_suggestion) || "", startIndex: Number(record.startIndex ?? record.start_index ?? -1), endIndex: Number(record.endIndex ?? record.end_index ?? -1), ...(cta && typeof cta === "object" && compactText(cta.targetText) ? { clickToApply: { type: (cta.type === "insert" || cta.type === "remove" ? cta.type : "replace") as ClickToApply["type"], targetText: compactText(cta.targetText), replacementText: compactText(cta.replacementText) } } : {}) } as AtsFormatIssue;
  }) : [];

  const contentImprovementsRaw = (value.contentImprovements ?? value.content_improvements) as unknown[];
  if (Array.isArray(contentImprovementsRaw)) {
    contentImprovementsRaw.filter((item) => item && typeof item === "object").forEach((item, index) => {
      const record = item as Record<string, unknown>;
      const original = compactText(record.original);
      const improved = compactText(record.improved);
      const cta = record.clickToApply as Record<string, unknown> | undefined;
      if (improved && original) {
        const existingIndex = rewriteSuggestions.findIndex((s) => s.originalText === original);
        if (existingIndex === -1) {
          rewriteSuggestions.push({ id: compactText(record.id) || createSuggestionId("ci", index), originalText: original, suggestionText: improved, reason: compactText(record.reason) || "Content improvement", impact: normalizeImpact(Number(record.atsGain) >= 8 ? "high" : Number(record.atsGain) >= 4 ? "medium" : "low"), path: sectionPathForKey(compactText(record.section) as AtsSectionKey), scoreDelta: Number(record.atsGain ?? 0) || undefined, ...(cta && typeof cta === "object" && compactText(cta.targetText) ? { clickToApply: { type: "replace" as const, targetText: compactText(cta.targetText), replacementText: compactText(cta.replacementText) } } : {}) });
        }
      }
    });
  }

  const sectionAnalysisRaw = (value.sectionAnalysis ?? value.section_analysis) as unknown[];
  const sectionAnalysis: AtsSectionAnalysis[] = Array.isArray(sectionAnalysisRaw) ? sectionAnalysisRaw.filter((item) => item && typeof item === "object").map((item) => {
    const record = item as Record<string, unknown>;
    return { section: compactText(record.section) || "", score: clampScore(Number(record.score ?? 0)), issues: asStringArray(record.issues), recommendations: asStringArray(record.recommendations) } as AtsSectionAnalysis;
  }) : [];

  return {
    grade: grade === "poor" || grade === "average" || grade === "good" || grade === "excellent" ? grade : undefined,
    overallScore, sectionScores, jdKeywords: jdKeywords.slice(0, 30), rewriteSuggestions: rewriteSuggestions.slice(0, 12),
    perSectionSuggestions, keywordGaps: keywordGaps.slice(0, 3), verdict: verdict || undefined,
    quickWins: quickWins.slice(0, 5), actionPlan: actionPlan.slice(0, 6), sectionAudit: sectionAudit.slice(0, 10),
    estimatedScoreAfterFixes, keywordPlacement: keywordPlacement.slice(0, 12), questionsForUser: questionsForUser.slice(0, 5),
    categoryScores, formatIssues: formatIssues.slice(0, 8), contentImprovements: [], sectionAnalysis: sectionAnalysis.slice(0, 10),
    sectionWiseAnalysis: normalizeSectionWiseAnalysis(value.sectionWiseAnalysis ?? value.section_wise_analysis ?? value),
    experienceAnalysis: normalizeExperienceAnalysis(value.experienceAnalysis ?? value.experience_analysis),
    projectsAnalysis: normalizeProjectsAnalysis(value.projectsAnalysis ?? value.projects_analysis),
    skillsAnalysis: normalizeSkillsAnalysis(value.skillsAnalysis ?? value.skills_analysis),
    roleMatchAnalysis: normalizeRoleMatchAnalysis(value.roleMatchAnalysis ?? value.role_match_analysis),
    keywordDensity: normalizeKeywordDensity(value.keywordDensity ?? value.keyword_density ?? []),
    contentQualityAnalysis: normalizeContentQualityAnalysis(value.contentQualityAnalysis ?? value.content_quality_analysis),
    recruiterFeedback: normalizeRecruiterFeedback(value.recruiterFeedback ?? value.recruiter_feedback),
    industryChecks: normalizeIndustryChecks(value.industryChecks ?? value.industry_checks ?? []),
    warnings: normalizeWarnings(value.warnings ?? []), recommendations: normalizeRecommendations(value.recommendations ?? []),
  };
};
const cloneSuggestion = (suggestion: AiSuggestion, fallbackIdPrefix: string, index: number): AiSuggestion => ({
  id: suggestion.id || createSuggestionId(fallbackIdPrefix, index),
  originalText: suggestion.originalText,
  suggestionText: suggestion.suggestionText,
  reason: suggestion.reason,
  impact: suggestion.impact,
  path: suggestion.path,
});

const buildResumeSnippetForAi = (resume: Record<string, unknown>) => {
  const sections = getSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  const experienceLines = sections.experience.flatMap((entry) => {
    const header = [compactText(entry.role), compactText(entry.company)].filter(Boolean).join(" - ");
    const bullets = Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => `- ${compactText(bullet)}`).filter((bullet) => bullet !== "-") : [];
    return [header, ...bullets].filter(Boolean);
  });
  const skillsLines = sections.skills.flatMap((entry) => {
    const category = compactText(entry.category);
    const items = Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)).filter(Boolean) : [];
    if (!category && items.length === 0) return [];
    return [`${category || "Skills"}: ${items.join(", ")}`.trim()];
  });
  const projectLines = sections.projects.flatMap((entry) => {
    const name = compactText(entry.name);
    const tech = compactText(entry.tech);
    const bullets = Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => `- ${compactText(bullet)}`).filter((bullet) => bullet !== "-") : [];
    return [`${name}${tech ? ` (${tech})` : ""}`.trim(), ...bullets].filter(Boolean);
  });
  const parts = [
    `NAME: ${compactText(personal.name)}`, `EMAIL: ${compactText(personal.email)}`,
    `SUMMARY: ${sections.summary}`, "EXPERIENCE:", ...experienceLines,
    "SKILLS:", ...skillsLines, "PROJECTS:", ...projectLines,
  ].filter(Boolean).join("\n");
  return sliceText(parts, 9000);
};

const enhanceWithAi = async (job: { id: string; data: AtsAnalysisJobData }, base: AtsAnalysisReport): Promise<{ report: AtsAnalysisReport; aiUsed: boolean }> => {
  if (!providerIsConfigured()) return { report: base, aiUsed: false };
  const resumeSnippet = buildResumeSnippetForAi(job.data.resume);
  const jobDescription = sliceText(job.data.jobDescription, 6000);
  const targetRole = compactText(job.data.jobTitle);
  const systemPrompt = ENHANCED_ATS_SYSTEM_PROMPT;
  const userPrompt = [buildEnhancedAtsUserPrompt(resumeSnippet, jobDescription), `TARGET ROLE: ${targetRole}`, `EXISTING KEYWORDS: ${job.data.keywords.join(", ")}`, `PREVIOUS SCORE: ${job.data.previousOverallScore ?? "none"}`].join("\n\n");
  const providers = getProviderOrder();
  if (providers.length === 0) return { report: base, aiUsed: false };
  const baseTimeout = env.AI_REQUEST_TIMEOUT_MS;
  const openrouterTimeout = Math.max(baseTimeout, 30000);
  let lastError: unknown;
  for (const provider of providers) {
    const timeoutMs = provider === "openrouter" ? openrouterTimeout : baseTimeout;
    try {
      const raw = await withTimeout(timeoutMs, async (signal) => {
        if (provider === "openai") return await callOpenAIJson(systemPrompt, userPrompt, signal);
        if (provider === "openrouter") return await callOpenRouterJson(systemPrompt, userPrompt, signal);
        return await callGeminiJson(systemPrompt, userPrompt, signal);
      });
      const parsed = parseJsonFromModel(raw);
      const enhancement = normalizeEnhancement(parsed);
      const mergedKeywords = Array.from(new Set([...(base.targetKeywords ?? []), ...job.data.keywords, ...enhancement.jdKeywords].map((kw) => compactText(kw)).filter(Boolean)));
      const keywordResult = analyzeKeywordMatch(job.data.resume, mergedKeywords, job.data.jobDescription);
      const sectionScores = buildSectionScores(job.data.resume, keywordResult.matchScore);
      const suggestionById = new Map<string, AiSuggestion>();
      (base.rewriteSuggestions ?? []).forEach((suggestion) => { if (suggestion?.id) suggestionById.set(suggestion.id, suggestion); });
      enhancement.rewriteSuggestions.forEach((suggestion) => { if (suggestion?.id) suggestionById.set(suggestion.id, suggestion); });
      const perSectionSuggestions: AtsSectionSuggestions = {};
      SECTION_KEYS.forEach((section) => {
        const baseSuggestions = (base.perSectionSuggestions?.[section] ?? []).map((suggestion, index) => cloneSuggestion(suggestion, `base-section-${section}`, index));
        const aiSuggestions = (enhancement.perSectionSuggestions?.[section] ?? []).map((suggestion, index) => cloneSuggestion(suggestion, `ai-section-${section}`, index));
        const merged = [...baseSuggestions, ...aiSuggestions];
        if (merged.length > 0) { perSectionSuggestions[section] = merged.slice(0, 10); merged.forEach((suggestion) => { if (suggestion.id) suggestionById.set(suggestion.id, suggestion); }); }
      });
      const hasAnySuggestions = Object.values(perSectionSuggestions).some((items) => (items?.length ?? 0) > 0);
      if (!hasAnySuggestions) {
        const keywordGapsForFallback = (enhancement.keywordGaps.length > 0 ? enhancement.keywordGaps : keywordResult.analysis.missingKeywords).slice(0, 3);
        perSectionSuggestions.summary = [{ id: createSuggestionId("fallback-summary", 0), originalText: "", suggestionText: `Add a 3-4 line summary tailored to ${targetRole || "the target role"} and naturally include keywords like ${keywordGapsForFallback.join(", ") || "role, impact, and core tools"}.`, reason: "A targeted summary improves ATS matching quickly.", impact: "high", path: "personalInfo.summary" }];
        const hasExperience = getSections(job.data.resume).experience.length > 0;
        perSectionSuggestions.experience = hasExperience ? [{ id: createSuggestionId("fallback-experience", 0), originalText: "", suggestionText: "Rewrite weak bullets with action verb + task + measurable result. Include one metric in each of your top 3 bullets.", reason: "Result-oriented bullets improve both ATS and recruiter scans.", impact: "high", path: "sections.experience" }] : [{ id: createSuggestionId("fallback-experience", 0), originalText: "", suggestionText: `Add a dedicated Experience section with at least 2-3 entries. For each role, include your title, company, dates, and 3-5 bullet points with measurable achievements. Mention keywords like ${keywordGapsForFallback.join(", ") || "your relevant technologies and tools"}.`, reason: "An experience section is critical for ATS � most systems filter candidates by experience.", impact: "high", path: "sections.experience" }];
        perSectionSuggestions.skills = [{ id: createSuggestionId("fallback-skills", 0), originalText: "", suggestionText: `Create grouped skills sections (Languages, Frameworks, Tools) and add missing keywords: ${keywordGapsForFallback.join(", ") || "job-specific tools"}.`, reason: "Structured skills and missing keywords increase match score.", impact: "medium", path: "sections.skills" }];
      }
      const rewriteSuggestions: AiSuggestion[] = Array.from(suggestionById.values()).slice(0, 20);
      const rawKeywordGaps = enhancement.keywordGaps.length > 0 ? enhancement.keywordGaps : keywordResult.analysis.missingKeywords.slice(0, 3);
      const keywordGaps = rawKeywordGaps.map((k: string | { keyword: string }) => typeof k === "string" ? k : k.keyword);
      const verdict = enhancement.verdict || buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords);
      const overallScore = clampScore(enhancement.overallScore ?? sectionScores.overall);
      const mergedSectionScores: AtsScoreBreakdown = { summary: enhancement.sectionScores?.summary ?? sectionScores.summary, experience: enhancement.sectionScores?.experience ?? sectionScores.experience, skills: enhancement.sectionScores?.skills ?? sectionScores.skills, education: enhancement.sectionScores?.education ?? sectionScores.education, formatting: enhancement.sectionScores?.formatting ?? sectionScores.formatting, projects: enhancement.sectionScores?.projects ?? sectionScores.projects };
      const prevScore = job.data.previousOverallScore;
      const report: AtsAnalysisReport = {
        ...base, ...(prevScore != null ? { previousOverallScore: Number(prevScore) } : {}),
        isOptimizedPrompt: isOptimizedPromptAvailable, aiUsed: true, grade: enhancement.grade, targetKeywords: mergedKeywords, matchScore: keywordResult.matchScore,
        keywordAnalysis: keywordResult.analysis, sectionScores: mergedSectionScores, overallScore,
        rewriteSuggestions, perSectionSuggestions, sectionAudit: enhancement.sectionAudit,
        actionPlan: enhancement.actionPlan, quickWins: enhancement.quickWins,
        estimatedScoreAfterFixes: enhancement.estimatedScoreAfterFixes, questionsForUser: enhancement.questionsForUser,
        keywordPlacement: enhancement.keywordPlacement, keywordGaps, verdict,
        summary: buildReportSummary(job.data.jobTitle, overallScore, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
        ...(enhancement.categoryScores ? { categoryScores: enhancement.categoryScores } : {}),
        ...(enhancement.formatIssues?.length ? { formatIssues: enhancement.formatIssues } : {}),
        ...(enhancement.contentImprovements?.length ? { contentImprovements: enhancement.contentImprovements } : {}),
        ...(enhancement.sectionAnalysis?.length ? { sectionAnalysis: enhancement.sectionAnalysis } : {}),
        ...(enhancement.sectionWiseAnalysis?.length ? { sectionWiseAnalysis: enhancement.sectionWiseAnalysis } : {}),
        ...(enhancement.experienceAnalysis ? { experienceAnalysis: enhancement.experienceAnalysis } : {}),
        ...(enhancement.projectsAnalysis ? { projectsAnalysis: enhancement.projectsAnalysis } : {}),
        ...(enhancement.skillsAnalysis ? { skillsAnalysis: enhancement.skillsAnalysis } : {}),
        ...(enhancement.roleMatchAnalysis ? { roleMatchAnalysis: enhancement.roleMatchAnalysis } : {}),
        ...(enhancement.keywordDensity?.length ? { keywordDensity: enhancement.keywordDensity } : {}),
        ...(enhancement.contentQualityAnalysis ? { contentQualityAnalysis: enhancement.contentQualityAnalysis } : {}),
        ...(enhancement.recruiterFeedback ? { recruiterFeedback: enhancement.recruiterFeedback } : {}),
        ...(enhancement.industryChecks?.length ? { industryChecks: enhancement.industryChecks } : {}),
        ...(enhancement.warnings?.length ? { warnings: enhancement.warnings } : {}),
        ...(enhancement.recommendations?.length ? { recommendations: enhancement.recommendations } : {}),
      };
      logger.info({ jobId: job.id, provider }, "ATS AI enhancement applied");
      return { report, aiUsed: true };
    } catch (error) {
      lastError = error;
      logger.warn({ error, jobId: job.id, provider }, "ATS AI enhancement failed; trying next provider if available");
    }
  }
  logger.warn({ error: lastError, jobId: job.id }, "ATS AI enhancement unavailable; using heuristic report");
  return { report: base, aiUsed: false };
};

const getSections = (resume: Record<string, unknown>) => ({
  summary: compactText((resume.personalInfo as Record<string, unknown> | undefined)?.summary),
  experience: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.experience) ? (resume.sections as Record<string, unknown>).experience as Array<Record<string, unknown>> : [],
  skills: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.skills) ? (resume.sections as Record<string, unknown>).skills as Array<Record<string, unknown>> : [],
  education: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.education) ? (resume.sections as Record<string, unknown>).education as Array<Record<string, unknown>> : [],
  projects: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.projects) ? (resume.sections as Record<string, unknown>).projects as Array<Record<string, unknown>> : [],
});
const buildFormattingChecks = (resume: Record<string, unknown>): AtsFormattingCheck[] => {
  const sections = getSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  return [
    { id: "contact-info", label: "Contact information present", passed: Boolean(compactText(personal.name) && compactText(personal.email)), score: Boolean(compactText(personal.name) && compactText(personal.email)) ? 100 : 40, reason: "A clear name and email improve ATS parsing." },
    { id: "summary-length", label: "Summary length is balanced", passed: sections.summary.length >= 80 && sections.summary.length <= 500, score: sections.summary.length === 0 ? 20 : sections.summary.length < 80 ? 45 : sections.summary.length > 500 ? 65 : 100, reason: "A concise but substantive summary helps recruiters scan quickly." },
    { id: "core-sections", label: "Core sections are populated", passed: sections.experience.length > 0 && sections.skills.length > 0, score: clampScore((sections.experience.length > 0 ? 55 : 20) + (sections.skills.length > 0 ? 45 : 20)), reason: "Experience and skills are the core ATS signals." },
    { id: "project-presence", label: "Project or experience depth", passed: sections.projects.length > 0 || sections.experience.length > 1, score: clampScore((sections.projects.length > 0 ? 60 : 30) + Math.min(sections.experience.length * 10, 40)), reason: "Projects or multiple roles improve context and depth." },
  ];
};

const buildSectionScores = (resume: Record<string, unknown>, keywordMatchScore: number) => {
  const sections = getSections(resume);
  const summaryScore = clampScore((sections.summary.length / 180) * 100);
  const experienceBullets = sections.experience.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const strongBullets = experienceBullets.filter((bullet) => ACTION_VERBS.has(bullet.split(/\s+/)[0]?.toLowerCase() ?? "") && hasMetric(bullet)).length;
  const experienceScore = experienceBullets.length === 0 ? 25 : clampScore((strongBullets / Math.max(1, experienceBullets.length)) * 100);
  const skillsCount = sections.skills.reduce((count, entry) => count + (Array.isArray(entry.items) ? entry.items.length : 0), 0);
  const skillsScore = clampScore((sections.skills.length > 0 ? 45 : 0) + Math.min(skillsCount * 4, 55));
  const educationScore = sections.education.length > 0 ? 80 : 45;
  const projectsScore = sections.projects.length > 0 ? clampScore(50 + sections.projects.length * 10) : 30;
  const formattingScore = clampScore(buildFormattingChecks(resume).reduce((sum, check) => sum + (check.passed ? check.score : Math.max(20, check.score - 20)), 0) / 4);
  const overall = clampScore(summaryScore * 0.16 + experienceScore * 0.28 + skillsScore * 0.2 + educationScore * 0.08 + projectsScore * 0.08 + formattingScore * 0.12 + keywordMatchScore * 0.08);
  return { summary: summaryScore, experience: experienceScore, skills: skillsScore, education: educationScore, formatting: formattingScore, projects: projectsScore, overall };
};
const buildSectionWiseAnalysis = (resume: Record<string, unknown>, keywordResult: ReturnType<typeof analyzeKeywordMatch>): SectionWiseAnalysis[] => {
  const sections = getSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  const missingKeywords = keywordResult.analysis.missingKeywords.map((k) => typeof k === "string" ? k : k.keyword);
  const matchedKeywords = keywordResult.analysis.matchedKeywords;
  const results: SectionWiseAnalysis[] = [];

  const summaryWords = sections.summary.split(/\s+/).filter(Boolean).length;
  const summaryKeywordMatch = matchedKeywords.filter((kw) => sections.summary.toLowerCase().includes(kw.toLowerCase())).length;
  const summaryAts = sections.summary.length === 0 ? 0 : clampScore(Math.min(sections.summary.length / 3, 60) + (summaryKeywordMatch * 10));
  const summaryQuality = sections.summary.length === 0 ? 0 : clampScore(sections.summary.length >= 80 ? 80 : 40);
  const summaryCompleteness = sections.summary.length >= 80 ? 90 : sections.summary.length > 0 ? 50 : 0;
  const summaryKeywordRel = clampScore(summaryKeywordMatch * 25);
  const summaryRecruiter = sections.summary.length === 0 ? 0 : clampScore(sections.summary.length >= 80 && sections.summary.length <= 500 ? 85 : 50);
  results.push({ section: "summary" as ExpandendSectionKey, label: SECTION_LABELS.summary, scores: { atsScore: summaryAts, qualityScore: summaryQuality, completenessScore: summaryCompleteness, keywordRelevanceScore: summaryKeywordRel, recruiterEffectivenessScore: summaryRecruiter }, isPresent: sections.summary.length > 0, isEmpty: sections.summary.length === 0, isPlaceholder: sections.summary.length > 0 && sections.summary.length < 30, wordCount: summaryWords, strengths: sections.summary.length >= 120 ? ["Well-written summary with good length"] : [], weaknesses: sections.summary.length < 80 ? ["Summary is too short or missing"] : sections.summary.length > 500 ? ["Summary may be too verbose"] : [], suggestions: sections.summary.length < 80 ? ["Expand summary to 3-4 lines highlighting core strengths and keywords"] : [], missingElements: sections.summary.length === 0 ? ["Professional summary"] : summaryKeywordMatch < 2 ? ["Role-relevant keywords in summary"] : [] });

  const experienceBullets = sections.experience.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const expBulletsWithAction = experienceBullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0]?.toLowerCase() ?? "")).length;
  const expBulletsWithMetric = experienceBullets.filter((b) => hasMetric(b)).length;
  const expWordCount = experienceBullets.reduce((sum, b) => sum + b.split(/\s+/).filter(Boolean).length, 0);
  const expMissingKws = missingKeywords.filter((kw) => !sections.experience.some((e) => JSON.stringify(e).toLowerCase().includes(kw.toLowerCase()))).length;
  const expAts = sections.experience.length === 0 ? 0 : clampScore((expBulletsWithAction / Math.max(1, experienceBullets.length)) * 40 + (expBulletsWithMetric / Math.max(1, experienceBullets.length)) * 40 + 20);
  const expQuality = clampScore((expBulletsWithAction / Math.max(1, experienceBullets.length)) * 50 + (expBulletsWithMetric / Math.max(1, experienceBullets.length)) * 50);
  const expCompleteness = sections.experience.length > 0 ? clampScore(40 + sections.experience.length * 20 + Math.min(experienceBullets.length * 5, 20)) : 0;
  const expKeywordRel = clampScore(Math.max(0, 100 - expMissingKws * 20));
  const expRecruiter = clampScore((expBulletsWithMetric / Math.max(1, experienceBullets.length)) * 40 + (expBulletsWithAction / Math.max(1, experienceBullets.length)) * 40 + (sections.experience.length > 1 ? 20 : 0));
  results.push({ section: "experience" as ExpandendSectionKey, label: SECTION_LABELS.experience, scores: { atsScore: expAts, qualityScore: expQuality, completenessScore: expCompleteness, keywordRelevanceScore: expKeywordRel, recruiterEffectivenessScore: expRecruiter }, isPresent: sections.experience.length > 0, isEmpty: sections.experience.length === 0, isPlaceholder: sections.experience.some((e) => !Array.isArray(e.bullets) || e.bullets.length === 0), wordCount: expWordCount, bulletCount: experienceBullets.length, strengths: expBulletsWithAction >= experienceBullets.length * 0.6 ? ["Strong use of action verbs across bullets"] : expBulletsWithMetric >= 2 ? ["Multiple quantified achievements"] : [], weaknesses: expBulletsWithAction < experienceBullets.length * 0.3 && experienceBullets.length > 0 ? ["Most bullets lack strong action verbs"] : expBulletsWithMetric === 0 && experienceBullets.length > 0 ? ["No quantified metrics found in bullets"] : [], suggestions: expBulletsWithAction < experienceBullets.length * 0.5 ? ["Start bullets with strong action verbs like 'Built', 'Led', 'Optimized'"] : expBulletsWithMetric === 0 ? ["Add metrics to at least 50% of bullets to show impact"] : [], missingElements: sections.experience.length === 0 ? ["Experience section"] : expBulletsWithMetric === 0 ? ["Quantified metrics"] : [] });

  const skillItems = sections.skills.flatMap((entry) => Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)).filter(Boolean) : []);
  const skillsKeywordMatch = matchedKeywords.filter((kw) => skillItems.some((s) => s.toLowerCase().includes(kw.toLowerCase()))).length;
  const skillsMissing = missingKeywords.filter((kw) => !skillItems.some((s) => s.toLowerCase().includes(kw.toLowerCase()))).length;
  const skillsAts = sections.skills.length === 0 ? 10 : clampScore(Math.min(skillItems.length * 3, 50) + (skillsKeywordMatch / Math.max(1, matchedKeywords.length)) * 50);
  const skillsQuality = clampScore(sections.skills.length > 0 ? Math.min(skillItems.length * 4, 80) + 20 : 0);
  const skillsCompleteness = sections.skills.length > 0 ? clampScore(50 + sections.skills.length * 15) : 0;
  const skillsKeywordRel = clampScore(Math.max(0, 100 - skillsMissing * 15));
  const skillsRecruiter = clampScore(Math.min(skillItems.length * 5, 50) + (sections.skills.length > 1 ? 30 : 10) + (skillsKeywordMatch > 0 ? 20 : 0));
  results.push({ section: "skills" as ExpandendSectionKey, label: SECTION_LABELS.skills, scores: { atsScore: skillsAts, qualityScore: skillsQuality, completenessScore: skillsCompleteness, keywordRelevanceScore: skillsKeywordRel, recruiterEffectivenessScore: skillsRecruiter }, isPresent: sections.skills.length > 0, isEmpty: sections.skills.length === 0 || skillItems.length === 0, isPlaceholder: sections.skills.length > 0 && skillItems.length < 3, wordCount: skillItems.length, bulletCount: skillItems.length, strengths: skillItems.length >= 15 ? ["Comprehensive skills coverage with good breadth"] : sections.skills.length > 1 ? ["Well-organized skills by category"] : [], weaknesses: skillItems.length < 10 && sections.skills.length > 0 ? ["Skills section could be more comprehensive"] : sections.skills.length === 1 ? ["Skills could benefit from categorization"] : skillItems.length === 0 ? ["No skills listed"] : [], suggestions: skillsMissing > 0 ? [`Add missing keywords: ${missingKeywords.slice(0, 5).join(", ")}`] : sections.skills.length <= 1 ? ["Group skills by category (Languages, Frameworks, Tools)"] : [], missingElements: sections.skills.length === 0 ? ["Skills section"] : skillsMissing > 3 ? [`${skillsMissing} missing role-relevant keywords`] : [] });

  const eduComplete = sections.education.filter((e) => compactText(e.degree) && compactText(e.institution)).length;
  const eduWordCount = sections.education.reduce((sum, e) => sum + compactText(e.degree).split(/\s+/).filter(Boolean).length + compactText(e.institution).split(/\s+/).filter(Boolean).length, 0);
  results.push({ section: "education" as ExpandendSectionKey, label: SECTION_LABELS.education, scores: { atsScore: sections.education.length > 0 ? 80 : 30, qualityScore: sections.education.length > 0 ? clampScore(eduComplete / Math.max(1, sections.education.length) * 100) : 0, completenessScore: sections.education.length > 0 ? clampScore(eduComplete / Math.max(1, sections.education.length) * 100) : 0, keywordRelevanceScore: sections.education.length > 0 ? 70 : 0, recruiterEffectivenessScore: sections.education.length > 0 ? 75 : 30 }, isPresent: sections.education.length > 0, isEmpty: sections.education.length === 0, isPlaceholder: sections.education.length > 0 && eduComplete < sections.education.length, wordCount: eduWordCount, strengths: sections.education.length > 0 ? ["Education section present"] : [], weaknesses: sections.education.length === 0 ? ["No education section"] : eduComplete < sections.education.length ? ["Some entries missing degree or institution"] : [], suggestions: sections.education.length === 0 ? ["Add your education details including degree, institution, and graduation year"] : [], missingElements: sections.education.length === 0 ? ["Education section"] : [] });

  const projectBullets = sections.projects.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const projectWordCount = sections.projects.reduce((sum, p) => sum + compactText(p.name).split(/\s+/).filter(Boolean).length + compactText(p.tech).split(/\s+/).filter(Boolean).length, 0) + projectBullets.reduce((sum, b) => sum + b.split(/\s+/).filter(Boolean).length, 0);
  const hasProjectLinks = sections.projects.some((p) => compactText(p.links) || compactText(p.link) || compactText(p.github) || compactText(p.deployment) || compactText(p.url));
  results.push({ section: "projects" as ExpandendSectionKey, label: SECTION_LABELS.projects, scores: { atsScore: sections.projects.length > 0 ? clampScore(50 + sections.projects.length * 15 + (hasProjectLinks ? 10 : 0)) : 20, qualityScore: sections.projects.length > 0 ? clampScore(Math.min(projectBullets.length * 15, 70) + (hasProjectLinks ? 20 : 0) + 10) : 0, completenessScore: sections.projects.length > 0 ? clampScore(sections.projects.length * 25) : 0, keywordRelevanceScore: sections.projects.length > 0 ? 65 : 0, recruiterEffectivenessScore: sections.projects.length > 0 ? clampScore(40 + Math.min(projectBullets.length * 10, 30) + (hasProjectLinks ? 20 : 0)) : 20 }, isPresent: sections.projects.length > 0, isEmpty: sections.projects.length === 0, isPlaceholder: sections.projects.some((p) => (!Array.isArray(p.bullets) || p.bullets.length === 0) && !compactText(p.links) && !compactText(p.github)), wordCount: projectWordCount, bulletCount: projectBullets.length, strengths: hasProjectLinks ? ["Projects include links for validation"] : sections.projects.length >= 2 ? ["Multiple projects demonstrating range"] : [], weaknesses: sections.projects.length === 0 ? ["No projects section"] : projectBullets.length === 0 ? ["Projects lack descriptive bullets"] : [], suggestions: sections.projects.length === 0 ? ["Add relevant projects with tech stack, links, and impact"] : !hasProjectLinks ? ["Add links (GitHub, deployment) to projects for credibility"] : [], missingElements: sections.projects.length === 0 ? ["Projects"] : !hasProjectLinks ? ["Project links"] : [] });

  return results;
};
const buildExperienceAnalysis = (resume: Record<string, unknown>): ExperienceAnalysis => {
  const sections = getSections(resume);
  const allBullets = sections.experience.flatMap((entry) => (Array.isArray(entry.bullets) ? entry.bullets as string[] : []).map((bullet) => ({ bullet: compactText(bullet), entry }))).filter((b) => b.bullet.length > 0);
  const bulletAnalyses: BulletAnalysis[] = allBullets.map(({ bullet, entry }) => {
    const firstWord = bullet.split(/\s+/)[0]?.toLowerCase() ?? "";
    return { text: bullet, hasStrongVerb: ACTION_VERBS.has(firstWord), hasMetric: hasMetric(bullet), hasLeadershipIndicator: LEADERSHIP_INDICATORS.has(firstWord) || Array.from(LEADERSHIP_INDICATORS).some((v) => bullet.toLowerCase().includes(v)), hasBusinessImpact: BUSINESS_IMPACT_TERMS.some((t) => bullet.toLowerCase().includes(t)), isGeneric: GENERIC_PHRASES.some((p) => bullet.toLowerCase().includes(p)), isPassive: PASSIVE_PATTERNS.some((p) => p.test(bullet)), suggestedImprovement: (GENERIC_PHRASES.some((p) => bullet.toLowerCase().startsWith(p)) ? replaceWeakVerb(bullet) : "") || (ACTION_VERBS.has(firstWord) && !hasMetric(bullet) ? suggestQuantification(bullet) : "") || "" } as BulletAnalysis;
  });
  const strongVerbCount = bulletAnalyses.filter((b) => b.hasStrongVerb).length;
  const quantifiedCount = bulletAnalyses.filter((b) => b.hasMetric).length;
  const leadershipCount = bulletAnalyses.filter((b) => b.hasLeadershipIndicator).length;
  const genericCount = bulletAnalyses.filter((b) => b.isGeneric).length;
  const passiveCount = bulletAnalyses.filter((b) => b.isPassive).length;
  const totalBullets = bulletAnalyses.length;
  const avgBulletLength = totalBullets > 0 ? Math.round(bulletAnalyses.reduce((sum, b) => sum + b.text.split(/\s+/).filter(Boolean).length, 0) / totalBullets * 10) / 10 : 0;
  const verbFrequency = new Map<string, number>();
  allBullets.forEach(({ bullet }) => { const first = bullet.split(/\s+/)[0]?.toLowerCase() ?? ""; if (ACTION_VERBS.has(first)) verbFrequency.set(first, (verbFrequency.get(first) ?? 0) + 1); });
  const weakVerbsDetected = allBullets.map(({ bullet }) => WEAK_VERBS.find((w) => bullet.toLowerCase().startsWith(w))).filter((w): w is string => Boolean(w)).filter((v, i, arr) => arr.indexOf(v) === i);
  const topActionVerbs = Array.from(verbFrequency.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([verb]) => verb);
  const missingElements: string[] = [];
  if (sections.experience.length === 0) missingElements.push("Experience section");
  if (totalBullets === 0 && sections.experience.length > 0) missingElements.push("Bullet points under experience entries");
  if (strongVerbCount < 3) missingElements.push("Strong action verbs in bullets");
  if (quantifiedCount < 2) missingElements.push("Quantified metrics in bullets");
  const suggestions: string[] = [];
  if (strongVerbCount < totalBullets * 0.5) suggestions.push("Start more bullets with strong action verbs");
  if (quantifiedCount < totalBullets * 0.3) suggestions.push("Add measurable outcomes to bullets (%, $, time saved)");
  if (genericCount > 0) suggestions.push(`Replace ${genericCount} generic bullet(s) with achievement-focused content`);
  if (passiveCount > 0) suggestions.push(`Rewrite ${passiveCount} passive voice bullet(s) for stronger impact`);
  if (avgBulletLength < 10 && totalBullets > 0) suggestions.push("Expand bullets to include more context and detail");
  return { entryCount: sections.experience.length, totalBullets, strongVerbRatio: totalBullets > 0 ? Math.round(strongVerbCount / totalBullets * 100) / 100 : 0, quantifiedRatio: totalBullets > 0 ? Math.round(quantifiedCount / totalBullets * 100) / 100 : 0, leadershipRatio: totalBullets > 0 ? Math.round(leadershipCount / totalBullets * 100) / 100 : 0, genericBulletCount: genericCount, passiveVoiceCount: passiveCount, averageBulletLength: avgBulletLength, bulletAnalyses, topActionVerbs, weakVerbsDetected, missingElements, suggestions } as ExperienceAnalysis;
};

const buildProjectsAnalysis = (resume: Record<string, unknown>): ProjectAnalysis => {
  const sections = getSections(resume);
  const projects = sections.projects;
  const technologiesUsed = Array.from(new Set(projects.flatMap((p) => { const tech = compactText(p.tech); if (!tech) return []; return tech.split(/[,;/\s]+/).map((t) => t.trim()).filter(Boolean); })));
  const hasLinks = projects.some((p) => Boolean(compactText(p.link) || compactText(p.links) || compactText(p.url)));
  const hasDeploymentLinks = projects.some((p) => Boolean(compactText(p.deployment) || compactText(p.deploymentUrl) || compactText(p.deployment_url)));
  const hasGithubLinks = projects.some((p) => Boolean(compactText(p.github) || compactText(p.githubUrl) || compactText(p.github_url)));
  const allProjectText = projects.flatMap((p) => [compactText(p.name), compactText(p.description), ...(Array.isArray(p.bullets) ? p.bullets.map((b: unknown) => compactText(b)) : [])]).filter(Boolean).join(" ").toLowerCase();
  const isTutorialLevel = TUTORIAL_INDICATORS.some((ind) => allProjectText.includes(ind));
  const hasMeasurableImpact = projects.some((p) => { const bullets = Array.isArray(p.bullets) ? p.bullets.map((b: unknown) => compactText(b)).filter(Boolean) : []; return bullets.some((b) => hasMetric(b) || BUSINESS_IMPACT_TERMS.some((t) => b.toLowerCase().includes(t))); });
  const techDepthScore = clampScore((hasLinks ? 15 : 0) + (hasDeploymentLinks ? 15 : 0) + (hasGithubLinks ? 10 : 0) + (hasMeasurableImpact ? 20 : 0) + (isTutorialLevel ? -20 : 10) + Math.min(technologiesUsed.length * 5, 20) + Math.min(projects.length * 5, 20));
  const missingElements: string[] = [];
  if (projects.length === 0) missingElements.push("Projects section");
  if (!hasLinks) missingElements.push("Project links (GitHub, live demo)");
  if (!hasMeasurableImpact && projects.length > 0) missingElements.push("Measurable impact description");
  const suggestions: string[] = [];
  if (projects.length === 0) suggestions.push("Add relevant projects with tech stack and impact");
  if (!hasLinks) suggestions.push("Include GitHub or deployment links for each project");
  if (isTutorialLevel) suggestions.push("Emphasize original contributions and real-world impact over tutorial-following");
  if (!hasMeasurableImpact && projects.length > 0) suggestions.push("Add metrics showing project adoption, performance, or user impact");
  return { entryCount: projects.length, hasLinks, hasDeploymentLinks, hasGithubLinks, technicalDepthScore: techDepthScore, hasMeasurableImpact, isTutorialLevel, technologiesUsed, missingElements, suggestions } as ProjectAnalysis;
};

const buildSkillsAnalysis = (resume: Record<string, unknown>, targetKeywords: string[]): SkillsAnalysis => {
  const sections = getSections(resume);
  const allSkills = sections.skills.flatMap((entry) => Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)).filter(Boolean) : []);
  const uniqueSkills = Array.from(new Set(allSkills.map((s) => s.toLowerCase()))).map((s) => allSkills.find((skill) => skill.toLowerCase() === s) || s);
  const categorized: SkillCategorization[] = sections.skills.map((entry) => {
    const category = compactText(entry.category) || "General";
    const items = Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)).filter(Boolean) : [];
    const outdatedInCategory = items.filter((skill) => OUTDATED_TECHNOLOGIES.has(skill.toLowerCase()));
    const hasTargetMatch = targetKeywords.some((kw) => items.some((skill) => skill.toLowerCase().includes(kw.toLowerCase())));
    return { category, skills: items, relevance: hasTargetMatch ? "high" : items.length > 0 ? "medium" : "low", isOutdated: outdatedInCategory.length > 0, suggestions: outdatedInCategory.length > 0 ? outdatedInCategory.map((skill) => { const alt = MODERN_ALTERNATIVES.find((m) => skill.toLowerCase().includes(m.old)); return alt ? `Consider replacing ${skill} with ${alt.modern}` : `Review if ${skill} is still relevant`; }) : [] } as SkillCategorization;
  });
  const duplicateSkillMap = new Map<string, number>();
  allSkills.forEach((s) => { const lower = s.toLowerCase(); duplicateSkillMap.set(lower, (duplicateSkillMap.get(lower) ?? 0) + 1); });
  const redundantSkills = Array.from(duplicateSkillMap.entries()).filter(([_, count]) => count > 1).map(([lower]) => uniqueSkills.find((s) => s.toLowerCase() === lower) || lower);
  const outdatedTechnologies = uniqueSkills.filter((s) => OUTDATED_TECHNOLOGIES.has(s.toLowerCase()));
  const modernAlternatives = outdatedTechnologies.map((old) => MODERN_ALTERNATIVES.find((m) => old.toLowerCase().includes(m.old))).filter((m): m is { old: string; modern: string } => Boolean(m)).filter((m, i, arr) => arr.findIndex((x) => x.old === m.old) === i);
  const missingCriticalSkills = targetKeywords.filter((kw) => !uniqueSkills.some((s) => s.toLowerCase().includes(kw.toLowerCase()))).slice(0, 10);
  const catScore = clampScore((categorized.length > 0 ? 30 : 0) + Math.min(uniqueSkills.length * 2, 30) + (outdatedTechnologies.length === 0 ? 20 : 0) + Math.max(0, 20 - missingCriticalSkills.length * 3));
  const suggestions: string[] = [];
  if (uniqueSkills.length < 10) suggestions.push("Expand skills section with more relevant technologies");
  if (outdatedTechnologies.length > 0) suggestions.push(`Replace outdated technologies: ${outdatedTechnologies.join(", ")}`);
  if (missingCriticalSkills.length > 0) suggestions.push(`Add critical missing skills: ${missingCriticalSkills.slice(0, 5).join(", ")}`);
  if (redundantSkills.length > 0) suggestions.push(`Remove redundant skill listings (${redundantSkills.length} duplicates found)`);
  if (categorized.length <= 1 && uniqueSkills.length > 5) suggestions.push("Group skills into categories for better ATS parsing");
  return { totalSkills: uniqueSkills.length, categorized, redundantSkills, outdatedTechnologies, modernAlternatives, missingCriticalSkills, categorizationScore: catScore, suggestions } as SkillsAnalysis;
};
const buildRoleMatchAnalysis = (resume: Record<string, unknown>, jobTitle: string | undefined, targetKeywords: string[], keywordResult: ReturnType<typeof analyzeKeywordMatch>): RoleMatchAnalysis | undefined => {
  const sections = getSections(resume);
  const allText = [sections.summary, ...sections.experience.flatMap((e) => [compactText(e.role), compactText(e.company), ...(Array.isArray(e.bullets) ? e.bullets.map((b: unknown) => compactText(b)) : [])]), ...sections.skills.flatMap((entry) => Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)) : []), ...sections.projects.flatMap((p) => [compactText(p.name), compactText(p.description), ...(Array.isArray(p.bullets) ? p.bullets.map((b: unknown) => compactText(b)) : [])])].filter(Boolean).join(" ").toLowerCase();
  const title = compactText(jobTitle) || "Unknown Role";
  const matchedKeywords = keywordResult.analysis.matchedKeywords;
  const missingKeywords = keywordResult.analysis.missingKeywords.map((k) => typeof k === "string" ? k : k.keyword);
  const weakKeywords = keywordResult.analysis.weakKeywords;
  const matchPercentage = keywordResult.matchScore;
  const allRoleTitles = sections.experience.map((e) => compactText(e.role)).filter(Boolean);
  const allTitleText = allRoleTitles.join(" ").toLowerCase();
  const seniorityLevels: Array<{ level: "junior" | "mid" | "senior" | "lead" | "executive"; terms: string[] }> = [
    { level: "junior", terms: ["junior", "jr", "associate", "entry", "intern", "graduate", "fresher"] },
    { level: "mid", terms: ["mid", "intermediate", "developer", "engineer", "analyst"] },
    { level: "senior", terms: ["senior", "sr", "staff", "principal", "lead", "tech lead", "team lead"] },
    { level: "lead", terms: ["lead", "manager", "head", "director", "vp", "vice president"] },
    { level: "executive", terms: ["executive", "cto", "ceo", "coo", "chief", "svp"] },
  ];
  let experienceLevelMatch: "junior" | "mid" | "senior" | "lead" | "executive" = "mid";
  for (const { level, terms } of seniorityLevels) { if (terms.some((t) => allTitleText.includes(t))) { experienceLevelMatch = level; break; } }
  const industryKeywords: Record<string, string[]> = { "Software Engineering": ["software", "engineering", "developer", "full-stack", "backend", "frontend", "api", "microservice", "cloud", "saas"], "Data Science": ["data", "machine learning", "ai", "analytics", "statistics", "deep learning", "nlp", "ml"], "Product Management": ["product", "pm", "roadmap", "stakeholder", "agile", "backlog", "user story"], "DevOps": ["devops", "infrastructure", "deployment", "ci/cd", "kubernetes", "docker", "terraform"], "Design": ["design", "ux", "ui", "figma", "sketch", "prototype", "user research"] };
  let industryFit = "General";
  const titleLower = title.toLowerCase();
  for (const [industry, keywords] of Object.entries(industryKeywords)) { if (keywords.some((k) => titleLower.includes(k))) { industryFit = industry; break; } }
  return { roleTitle: title, matchPercentage, matchedKeywords: matchedKeywords.slice(0, 20), missingKeywords: missingKeywords.slice(0, 10), weakKeywords: weakKeywords.slice(0, 10), experienceLevelMatch, suggestedRoles: [], industryFit, suggestions: [...(matchPercentage < 60 ? [`Keyword match is ${matchPercentage}% � consider adding more role-specific keywords`] : []), ...(missingKeywords.length > 0 ? [`Add missing keywords: ${missingKeywords.slice(0, 5).join(", ")}`] : [])] } as RoleMatchAnalysis;
};

const buildKeywordDensity = (resume: Record<string, unknown>, targetKeywords: string[], matchScore: number): KeywordDensity[] => {
  const sections = getSections(resume);
  const allText = [sections.summary, ...sections.experience.flatMap((e) => [compactText(e.role), ...(Array.isArray(e.bullets) ? e.bullets.map((b: unknown) => compactText(b)) : [])]), ...sections.skills.flatMap((entry) => Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)) : []), ...sections.projects.flatMap((p) => [compactText(p.description), ...(Array.isArray(p.bullets) ? p.bullets.map((b: unknown) => compactText(b)) : [])])].filter(Boolean).join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const avgKeywordCount = Math.max(1, Math.round(targetKeywords.length * (matchScore / 100) / 2));
  return targetKeywords.map((keyword) => {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const count = (allText.match(regex) || []).length;
    const density = wordCount > 0 ? Math.round((count / wordCount) * 1000) / 10 : 0;
    const suggestedMin = Math.max(1, Math.round(avgKeywordCount * 0.3 * (matchScore > 70 ? 1.5 : 1)));
    let status: "good" | "low" | "overused";
    if (count === 0) status = "low";
    else if (count >= suggestedMin * 4) status = "overused";
    else if (count >= suggestedMin) status = "good";
    else status = "low";
    return { keyword, count, density, suggestedMinCount: suggestedMin, status } as KeywordDensity;
  });
};

const buildContentQualityAnalysis = (resume: Record<string, unknown>, grammarIssues: ReturnType<typeof analyzeGrammarIssues>): ContentQualityAnalysis => {
  const sections = getSections(resume);
  const allBullets = sections.experience.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const allText = [sections.summary, ...allBullets, ...sections.projects.flatMap((p) => Array.isArray(p.bullets) ? p.bullets.map((b: unknown) => compactText(b)) : [])].filter(Boolean).join(" ");
  const totalSentences = allText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const avgSentenceLength = totalSentences > 0 ? Math.round(allText.split(/\s+/).filter(Boolean).length / totalSentences * 10) / 10 : 0;
  const bulletsWithVerb = allBullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0]?.toLowerCase() ?? "")).length;
  const bulletsWithMetric = allBullets.filter((b) => hasMetric(b)).length;
  const totalBullets = allBullets.length;
  const passiveBullets = allBullets.filter((b) => PASSIVE_PATTERNS.some((p) => p.test(b))).length;
  const genericBullets = allBullets.filter((b) => GENERIC_PHRASES.some((p) => b.toLowerCase().includes(p))).length;
  const clarityScore = clampScore((sections.summary.length > 0 ? 20 : 0) + (totalBullets > 0 ? 20 : 0) + Math.max(0, 30 - passiveBullets * 5) + (avgSentenceLength >= 10 && avgSentenceLength <= 25 ? 20 : avgSentenceLength > 0 ? 10 : 0) + (totalSentences > 0 ? 10 : 0));
  const concisenessScore = clampScore(Math.max(0, 40 - genericBullets * 5) + Math.max(0, 30 - (avgSentenceLength > 25 ? avgSentenceLength - 25 : 0) * 2) + (totalBullets > 0 ? 30 : 0));
  const impactScore = clampScore((bulletsWithVerb / Math.max(1, totalBullets)) * 40 + (bulletsWithMetric / Math.max(1, totalBullets)) * 40 + (sections.experience.length > 1 ? 20 : 0));
  const professionalismScore = clampScore((sections.education.length > 0 ? 20 : 0) + Math.max(0, 40 - grammarIssues.length * 3) + (genericBullets === 0 ? 20 : 10) + (passiveBullets === 0 ? 20 : 10));
  const grammarQuality = clampScore(Math.max(0, 100 - grammarIssues.length * 8));
  const issues: string[] = [];
  if (passiveBullets > 0) issues.push(`${passiveBullets} bullet(s) use passive voice`);
  if (genericBullets > 0) issues.push(`${genericBullets} bullet(s) contain generic phrases`);
  if (grammarIssues.length > 0) issues.push(`${grammarIssues.length} grammar issue(s) detected`);
  if (avgSentenceLength > 25) issues.push("Sentences are longer than recommended (aim for 15-20 words)");
  if (sections.summary.length === 0) issues.push("Missing professional summary");
  const suggestions: string[] = [];
  if (passiveBullets > 0) suggestions.push("Rewrite passive voice bullets for stronger impact");
  if (genericBullets > 0) suggestions.push("Replace generic descriptions with specific achievements");
  if (grammarIssues.length > 0) suggestions.push("Fix identified grammar issues for professionalism");
  if (bulletsWithVerb < totalBullets * 0.5) suggestions.push("Start more bullets with strong action verbs");
  if (bulletsWithMetric < totalBullets * 0.3) suggestions.push("Add more quantifiable metrics to demonstrate impact");
  const avgScore = (clarityScore + concisenessScore + impactScore + professionalismScore + grammarQuality) / 5;
  const overallQuality: "excellent" | "good" | "average" | "poor" = avgScore >= 80 ? "excellent" : avgScore >= 60 ? "good" : avgScore >= 40 ? "average" : "poor";
  return { overallQuality, clarityScore, concisenessScore, impactScore, professionalismScore, grammarQuality, issues: issues.slice(0, 8), suggestions: suggestions.slice(0, 5) } as ContentQualityAnalysis;
};
const buildRecruiterFeedback = (resume: Record<string, unknown>, overallScore: number, matchScore: number, sectionScores: AtsScoreBreakdown): RecruiterFeedback => {
  const sections = getSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  const experienceBullets = sections.experience.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const metricBullets = experienceBullets.filter((b) => hasMetric(b));
  const actionVerbBullets = experienceBullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0]?.toLowerCase() ?? ""));
  const leadershipBullets = experienceBullets.filter((b) => Array.from(LEADERSHIP_INDICATORS).some((v) => b.toLowerCase().includes(v)));
  const hasSummary = sections.summary.length > 80;
  const hasMetrics = metricBullets.length >= 2;
  const hasActionVerbs = actionVerbBullets.length >= 3;
  const hasLeadership = leadershipBullets.length >= 2;
  const hasProjects = sections.projects.length > 0;
  const hasEducation = sections.education.length > 0;
  const hasName = Boolean(compactText(personal.name));
  const hasEmail = Boolean(compactText(personal.email));
  const hasLinks = sections.projects.some((p) => compactText(p.links) || compactText(p.github) || compactText(p.url));
  const strengths: string[] = [];
  if (hasMetrics && hasActionVerbs) strengths.push("Strong achievement-oriented bullets");
  if (hasLeadership) strengths.push("Demonstrated leadership experience");
  if (hasSummary) strengths.push("Well-written professional summary");
  if (hasProjects && hasLinks) strengths.push("Projects with verifiable links");
  if (hasEducation) strengths.push("Education credentials present");
  if (sectionScores.formatting >= 80) strengths.push("ATS-friendly formatting");
  const concerns: string[] = [];
  if (!hasSummary) concerns.push("Missing professional summary");
  if (!hasMetrics) concerns.push("Lacks quantified outcomes");
  if (!hasActionVerbs) concerns.push("Weak action verbs");
  if (!hasLeadership && sections.experience.length > 1) concerns.push("Limited leadership indicators");
  if (!hasProjects) concerns.push("No projects section");
  if (!hasEducation) concerns.push("No education section");
  if (matchScore < 50) concerns.push("Poor keyword alignment with target role");
  const probabilityBase = overallScore * 0.5 + matchScore * 0.25 + (hasMetrics ? 10 : 0) + (hasActionVerbs ? 5 : 0) + (hasLeadership ? 5 : 0) + (hasSummary ? 5 : 0);
  const shortlistingProbability = clampScore(Math.round(probabilityBase));
  const tcScore = (hasActionVerbs ? 1 : 0) + (hasMetrics ? 1 : 0) + (hasProjects ? 1 : 0) + (hasLinks ? 1 : 0);
  const technicalCredibility: "low" | "medium" | "high" = tcScore >= 3 ? "high" : tcScore >= 2 ? "medium" : "low";
  const liScore = (hasLeadership ? 2 : 0) + (sections.experience.length > 1 ? 1 : 0) + (hasSummary ? 1 : 0);
  const leadershipImpression: "low" | "medium" | "high" = liScore >= 3 ? "high" : liScore >= 2 ? "medium" : "low";
  const rpScore = (hasName && hasEmail ? 1 : 0) + (hasEducation ? 1 : 0) + (sectionScores.formatting >= 70 ? 1 : 0) + (concerns.length <= 2 ? 1 : 0);
  const resumeProfessionalism: "low" | "medium" | "high" = rpScore >= 3 ? "high" : rpScore >= 2 ? "medium" : "low";
  let firstImpression = "";
  if (overallScore >= 80 && hasMetrics && hasActionVerbs) firstImpression = "Strong profile with measurable achievements and clear career progression";
  else if (overallScore >= 60 && hasActionVerbs) firstImpression = "Solid foundation but lacks quantified outcomes to stand out";
  else if (overallScore >= 40) firstImpression = "Decent structure but needs stronger action verbs and measurable results";
  else firstImpression = "Requires significant improvement in content, formatting, and keyword alignment";
  if (!hasSummary) firstImpression += ". Missing professional summary";
  if (!hasMetrics) firstImpression += ". Consider adding metrics to highlight impact";
  if (!hasActionVerbs) firstImpression += ". Use stronger action verbs";
  return { firstImpression, shortlistingProbability, technicalCredibility, leadershipImpression, resumeProfessionalism, clarityScore: sectionScores.summary || sectionScores.experience > 0 ? clampScore((sectionScores.summary + sectionScores.experience) / 2) : 50, detailFeedback: concerns.slice(0, 3).join("; ") || "No major concerns detected", strengths: strengths.slice(0, 5), concerns: concerns.slice(0, 5) } as RecruiterFeedback;
};

const buildIndustryChecks = (resume: Record<string, unknown>, jobTitle: string | undefined): IndustryCheck[] => {
  const sections = getSections(resume);
  const allText = [sections.summary, ...sections.experience.flatMap((e) => [compactText(e.role), ...(Array.isArray(e.bullets) ? e.bullets.map((b: unknown) => compactText(b)) : [])]), ...sections.skills.flatMap((entry) => Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)) : []), ...sections.projects.flatMap((p) => [compactText(p.name), compactText(p.description), ...(Array.isArray(p.bullets) ? p.bullets.map((b: unknown) => compactText(b)) : [])])].filter(Boolean).join(" ").toLowerCase();
  const title = compactText(jobTitle || "").toLowerCase();
  const detectedIndustries: string[] = [];
  const industryMappings: Record<string, string[]> = { "software-engineering": ["software", "engineering", "developer", "full-stack", "backend", "frontend"], "data-science": ["data", "machine learning", "ai", "analytics", "statistics"], "product-management": ["product manager", "pm", "product owner"], "devops": ["devops", "sre", "infrastructure", "platform"], "design": ["designer", "ux", "ui", "figma"] };
  for (const [industry, terms] of Object.entries(industryMappings)) { if (terms.some((t) => title.includes(t) || allText.includes(t))) detectedIndustries.push(industry); }
  const industries = detectedIndustries.length > 0 ? detectedIndustries : ["software-engineering"];
  return industries.map((industry) => {
    const template = INDUSTRY_CHECKS_MAP[industry];
    if (!template) return { industry, checks: [] };
    const checks = template.checks.map((check) => ({ ...check, passed: typeof check.details === "string" && Array.isArray(allText) ? false : check.passed }));
    return { industry, checks };
  });
};

const buildWarnings = (resume: Record<string, unknown>, sectionScores: AtsScoreBreakdown, keywordAnalysis: AtsKeywordAnalysis): AtsWarning[] => {
  const sections = getSections(resume);
  const warnings: AtsWarning[] = [];
  if (sections.summary.length === 0) warnings.push({ type: "missing_section", severity: "critical", section: "summary", message: "Professional summary is missing", suggestion: "Add a 3-4 line professional summary highlighting your core strengths and career goals" });
  else if (sections.summary.length < 80) warnings.push({ type: "weak_content", severity: "warning", section: "summary", message: "Summary is too short to be effective", suggestion: "Expand your summary to at least 80 characters with role-relevant keywords" });
  if (sections.experience.length === 0) warnings.push({ type: "missing_section", severity: "critical", section: "experience", message: "Experience section is missing", suggestion: "Add your work experience with bullet points highlighting achievements" });
  else if (sections.experience.some((e) => !Array.isArray(e.bullets) || e.bullets.length === 0)) warnings.push({ type: "empty_section", severity: "warning", section: "experience", message: "Some experience entries have no bullet points", suggestion: "Add 3-5 bullet points for each role with measurable achievements" });
  if (sections.skills.length === 0) warnings.push({ type: "missing_section", severity: "critical", section: "skills", message: "Skills section is missing", suggestion: "Add a skills section grouped by category (Languages, Frameworks, Tools)" });
  if (sections.education.length === 0) warnings.push({ type: "missing_section", severity: "warning", section: "education", message: "Education section is missing", suggestion: "Add your educational background" });
  if (sections.projects.length === 0) warnings.push({ type: "missing_section", severity: "info", section: "projects", message: "Projects section is missing", suggestion: "Consider adding relevant projects to demonstrate practical skills" });
  if (keywordAnalysis.missingKeywords.length >= 5) warnings.push({ type: "keyword", severity: "warning", section: "skills", message: `${keywordAnalysis.missingKeywords.length} important keywords are missing`, suggestion: `Add these keywords: ${keywordAnalysis.missingKeywords.slice(0, 5).map((k) => typeof k === "string" ? k : k.keyword).join(", ")}` });
  if (sectionScores.formatting < 60) warnings.push({ type: "formatting", severity: "warning", section: "header", message: "Formatting may hinder ATS parsing", suggestion: "Use standard section headings and avoid tables/columns" });
  return warnings;
};

const buildRecommendations = (warnings: AtsWarning[], sectionScores: AtsScoreBreakdown): AtsRecommendation[] => {
  const recommendations: AtsRecommendation[] = [];
  const criticalWarnings = warnings.filter((w) => w.severity === "critical");
  const warningWarnings = warnings.filter((w) => w.severity === "warning");
  criticalWarnings.forEach((w) => {
    recommendations.push({ priority: "P0", category: (w.type === "missing_section" || w.type === "empty_section") ? "sections" : w.type === "keyword" ? "keywords" : "content", title: `Add missing ${w.section} section`, description: w.suggestion, expectedImpact: "High � critical for ATS parsing", effort: "medium" });
  });
  warningWarnings.slice(0, 3).forEach((w) => {
    recommendations.push({ priority: "P1", category: w.type === "formatting" ? "formatting" : w.type === "keyword" ? "keywords" : "content", title: `Improve ${w.section} section`, description: w.suggestion, expectedImpact: "Medium � improves recruiter impression", effort: "low" });
  });
  if (sectionScores.experience < 50) recommendations.push({ priority: "P1", category: "experience", title: "Strengthen experience bullets", description: "Add action verbs, metrics, and measurable outcomes to your experience bullet points", expectedImpact: "+15-20 points", effort: "medium" });
  if (sectionScores.skills < 50) recommendations.push({ priority: "P1", category: "skills", title: "Improve skills organization", description: "Group skills by category and add more role-relevant technologies", expectedImpact: "+10-15 points", effort: "low" });
  if (sectionScores.summary < 50) recommendations.push({ priority: "P2", category: "content", title: "Rewrite professional summary", description: "Craft a targeted summary with keywords from the job description", expectedImpact: "+5-10 points", effort: "low" });
  if (sectionScores.projects < 50) recommendations.push({ priority: "P2", category: "projects", title: "Add project details and links", description: "Include GitHub/deployment links and measurable impact for each project", expectedImpact: "+5-10 points", effort: "medium" });
  return recommendations.slice(0, 8);
};
const buildRewriteSuggestions = (resume: Record<string, unknown>, grammarIssues: ReturnType<typeof analyzeGrammarIssues>) => {
  const sections = getSections(resume);
  const summary = sections.summary;
  const suggestions: AtsAnalysisReport["rewriteSuggestions"] = [];
  if (summary.length < 120) {
    suggestions.push({
      id: createSuggestionId("summary", 0), originalText: summary,
      suggestionText: `${summary} Focus on quantified outcomes, core strengths, and role-relevant keywords.`.trim(),
      reason: "The summary is too short to carry ATS value on its own.", impact: "high", priority: "critical", atsImpact: "+8", scoreDelta: 8, path: "personalInfo.summary",
    });
  }
  grammarIssues.slice(0, 10).forEach((issue, index) => {
    const delta = issue.severity === "high" ? 5 : 2;
    suggestions.push({
      id: createSuggestionId("rewrite", index + 1), originalText: issue.originalText,
      suggestionText: issue.suggestionText, reason: issue.reason, impact: issue.severity,
      priority: issue.severity === "high" ? "high" : "medium", atsImpact: `+${delta}`, scoreDelta: delta, path: issue.path,
    });
  });
  const allBullets = sections.experience.flatMap((entry, entryIdx) =>
    (Array.isArray(entry.bullets) ? entry.bullets as string[] : []).map((bullet, bulletIdx) => ({ bullet, entryIdx, bulletIdx, role: compactText(entry.role), company: compactText(entry.company) }))
  );
  allBullets.forEach(({ bullet, entryIdx, bulletIdx, role, company }) => {
    const hasWeakVerb = WEAK_VERBS.some((w) => bullet.toLowerCase().startsWith(w));
    const hasMetricVal = hasMetric(bullet);
    const hasActionVerbVal = ACTION_VERBS.has(bullet.split(/\s+/)[0]?.toLowerCase() ?? "");
    if (hasWeakVerb) {
      const improved = replaceWeakVerb(bullet);
      if (improved !== bullet) {
        suggestions.push({
          id: createSuggestionId(`verb-${entryIdx}-${bulletIdx}`, suggestions.length), originalText: bullet,
          suggestionText: improved, reason: "Replace weak verb with strong action verb for better ATS and recruiter impact",
          impact: "high", priority: "high", atsImpact: "+6", scoreDelta: 6, path: "sections.experience",
        });
      }
    }
    if (hasActionVerbVal && !hasMetricVal) {
      const quantified = suggestQuantification(bullet);
      if (quantified && quantified !== bullet) {
        suggestions.push({
          id: createSuggestionId(`quant-${entryIdx}-${bulletIdx}`, suggestions.length), originalText: bullet,
          suggestionText: quantified, reason: "Add measurable impact to increase recruiter confidence and ATS score",
          impact: "high", priority: "high", atsImpact: "+7", scoreDelta: 7, path: "sections.experience",
        });
      }
    }
  });
  return suggestions.slice(0, 30);
};

const buildReportSummary = (jobTitle: string | undefined, overall: number, matchScore: number, missingKeywords: Array<{ keyword: string }> | string[]) => {
  const title = compactText(jobTitle) || "resume";
  const mk = missingKeywords.map((k) => typeof k === "string" ? k : k.keyword);
  return `${title} scored ${overall}/100 with a ${matchScore}% keyword match.${mk.length > 0 ? ` Missing keywords: ${mk.slice(0, 6).join(", ")}.` : ""}`;
};

const getActionVerb = (text: string): string => { const first = text.split(/\s+/)[0]?.toLowerCase() ?? ""; if (ACTION_VERBS.has(first)) return first; return ""; };
const getQuantification = (text: string): string => { if (hasMetric(text)) return text; const matched = QUANTIFICATION_PATTERNS.find((p) => p.test(text)); if (!matched) return ""; return text; };

const suggestQuantification = (bullet: string): string => {
  if (hasMetric(bullet)) return "";
  const firstWord = bullet.split(/\s+/)[0] ?? "";
  const rest = bullet.slice(firstWord.length).trim();
  const lower = bullet.toLowerCase();
  if (lower.includes("users") || lower.includes("customers") || lower.includes("clients")) return `${firstWord} ${rest}, impacting X+ users`;
  if (lower.includes("api") || lower.includes("service") || lower.includes("system")) return `${firstWord} ${rest}, reducing latency by X%`;
  if (lower.includes("team") || lower.includes("project")) return `${firstWord} ${rest}, delivering X% ahead of schedule`;
  if (lower.includes("feature") || lower.includes("application")) return `${firstWord} ${rest}, adopted by X users`;
  if (lower.includes("revenue") || lower.includes("budget")) return `${firstWord} ${rest}, achieving $X in savings`;
  if (lower.includes("time") || lower.includes("process")) return `${firstWord} ${rest}, reducing processing time by X%`;
  return `${firstWord} ${rest}, improving efficiency by X%`;
};

const replaceWeakVerb = (bullet: string): string => {
  const lower = bullet.toLowerCase();
  for (const weak of WEAK_VERBS) {
    if (lower.startsWith(weak)) {
      const rest = bullet.slice(weak.length).trim();
      const suggestions: Record<string, string[]> = {
        "worked on": ["Developed", "Built", "Engineered", "Implemented"],
        "helped": ["Enabled", "Facilitated", "Contributed to", "Supported"],
        "responsible for": ["Led", "Managed", "Owned", "Drove"],
        "was part of": ["Collaborated on", "Contributed to", "Participated in"],
        "was involved in": ["Contributed to", "Participated in", "Supported"],
        "did": ["Executed", "Performed", "Delivered", "Completed"],
        "made": ["Created", "Built", "Developed", "Produced"],
        "got": ["Achieved", "Secured", "Obtained", "Delivered"],
        "was": ["Served as", "Acted as", "Worked as"],
        "were": ["Served as", "Acted as", "Worked as"],
      };
      const replacements = suggestions[weak] ?? ["Developed", "Built"];
      return `${replacements[0]} ${rest}`;
    }
  }
  return bullet;
};

const simulateRecruiter = (resume: Record<string, unknown>, overallScore: number, matchScore: number): RecruiterImpression => {
  const sections = getSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  const experienceBullets = sections.experience.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const metricBullets = experienceBullets.filter((b) => hasMetric(b));
  const actionVerbBullets = experienceBullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0]?.toLowerCase() ?? ""));
  const hasSummary = sections.summary.length > 80;
  const hasMetrics = metricBullets.length >= 2;
  const hasActionVerbs = actionVerbBullets.length >= 3;
  const hasProjects = sections.projects.length > 0;
  const hasEducation = sections.education.length > 0;
  const hasName = Boolean(compactText(personal.name));
  const hasEmail = Boolean(compactText(personal.email));
  const positives = [hasSummary, hasMetrics, hasActionVerbs, hasProjects, hasEducation, hasName, hasEmail].filter(Boolean).length;
  const totalChecks = 7;
  const confidenceRatio = positives / totalChecks;
  let confidenceLevel: "low" | "medium" | "high";
  if (confidenceRatio >= 0.7) confidenceLevel = "high";
  else if (confidenceRatio >= 0.4) confidenceLevel = "medium";
  else confidenceLevel = "low";
  const probabilityBase = overallScore * 0.6 + matchScore * 0.2 + confidenceRatio * 20;
  const interviewProbability = clampScore(Math.round(probabilityBase));
  let firstImpression = "";
  if (overallScore >= 80 && hasMetrics && hasActionVerbs) firstImpression = "Strong profile with measurable achievements and clear career progression";
  else if (overallScore >= 60 && hasActionVerbs) firstImpression = "Solid foundation but lacks quantified outcomes to stand out";
  else if (overallScore >= 40) firstImpression = "Decent structure but needs stronger action verbs and measurable results";
  else firstImpression = "Requires significant improvement in content, formatting, and keyword alignment";
  if (!hasSummary) firstImpression += ". Missing professional summary";
  if (!hasMetrics) firstImpression += ". Consider adding metrics to highlight impact";
  if (!hasActionVerbs) firstImpression += ". Use stronger action verbs";
  return { firstImpression, confidenceLevel, interviewProbability };
};

const extractStrengths = (sectionScores: AtsScoreBreakdown, keywordAnalysis: AtsKeywordAnalysis): string[] => {
  const s: string[] = [];
  if (sectionScores.experience >= 75) s.push("Strong experience section with measurable achievements");
  if (sectionScores.skills >= 70) s.push("Well-structured skills section with good keyword coverage");
  if (sectionScores.summary >= 70) s.push("Concise and targeted professional summary");
  if (sectionScores.education >= 80) s.push("Complete education section");
  if (sectionScores.projects >= 70) s.push("Meaningful project section demonstrating practical application");
  if (sectionScores.formatting >= 80) s.push("Clean formatting optimized for ATS parsing");
  if (keywordAnalysis.matchedKeywords.length >= 10) s.push("Strong keyword alignment with target role");
  return s.slice(0, 5);
};

const extractWeaknesses = (sectionScores: AtsScoreBreakdown, keywordAnalysis: AtsKeywordAnalysis): string[] => {
  const w: string[] = [];
  if (sectionScores.experience < 50) w.push("Experience bullets lack metrics and action verbs");
  if (sectionScores.skills < 50) w.push("Skills section needs better organization and keyword variety");
  if (sectionScores.summary < 50) w.push("Summary is missing or too generic");
  if (sectionScores.projects < 50) w.push("Projects section is missing or underdeveloped");
  if (keywordAnalysis.missingKeywords.length >= 5) w.push(`Missing ${keywordAnalysis.missingKeywords.length} important role-specific keywords`);
  if (sectionScores.formatting < 60) w.push("Formatting issues may impact ATS parsing");
  return w.slice(0, 5);
};

const buildPriorityFixes = (sectionAudit: AtsSectionAudit[] | undefined, keywordGaps: string[]): string[] => {
  if (!sectionAudit || sectionAudit.length === 0) return keywordGaps.slice(0, 3).map((k) => `Add missing keyword: ${k}`);
  return sectionAudit.filter((a) => a.status === "missing" || a.status === "empty").slice(0, 3).map((a) => `Fix ${a.section}: ${a.fix.why}`).concat(keywordGaps.slice(0, 2).map((k) => `Add missing keyword: ${k}`)).slice(0, 5);
};
const buildAtsReport = (job: { id: string; data: AtsAnalysisJobData }): AtsAnalysisReport => {
  const reportType = job.data.reportType ?? (job.data.jobDescription ? "job-description-match" : "resume-analysis");
  const keywords = Array.from(new Set((job.data.keywords.length > 0 ? job.data.keywords : []).map((keyword) => compactText(keyword)).filter(Boolean)));
  const keywordResult = analyzeKeywordMatch(job.data.resume, keywords, job.data.jobDescription);
  const grammarIssues = analyzeGrammarIssues(job.data.resume);
  const sectionScores = buildSectionScores(job.data.resume, keywordResult.matchScore);
  const formattingChecks = buildFormattingChecks(job.data.resume);
  const rewriteSuggestions = buildRewriteSuggestions(job.data.resume, grammarIssues);
  const keywordGaps = keywordResult.analysis.missingKeywords.slice(0, 3).map((k) => typeof k === "string" ? k : k.keyword);
  const strengths = extractStrengths(sectionScores, keywordResult.analysis);
  const weaknesses = extractWeaknesses(sectionScores, keywordResult.analysis);
  const priorityFixes = buildPriorityFixes(undefined, keywordResult.analysis.missingKeywords.map((k) => typeof k === "string" ? k : k.keyword));
  const recruiterImpression = simulateRecruiter(job.data.resume, sectionScores.overall, keywordResult.matchScore);
  const sectionWiseAnalysis = buildSectionWiseAnalysis(job.data.resume, keywordResult);
  const experienceAnalysis = buildExperienceAnalysis(job.data.resume);
  const projectsAnalysis = buildProjectsAnalysis(job.data.resume);
  const skillsAnalysis = buildSkillsAnalysis(job.data.resume, keywords);
  const roleMatchAnalysis = buildRoleMatchAnalysis(job.data.resume, job.data.jobTitle, keywords, keywordResult);
  const keywordDensity = buildKeywordDensity(job.data.resume, keywords, keywordResult.matchScore);
  const contentQualityAnalysis = buildContentQualityAnalysis(job.data.resume, grammarIssues);
  const recruiterFeedback = buildRecruiterFeedback(job.data.resume, sectionScores.overall, keywordResult.matchScore, sectionScores);
  const industryChecks = buildIndustryChecks(job.data.resume, job.data.jobTitle);
  const warnings = buildWarnings(job.data.resume, sectionScores, keywordResult.analysis);
  const recommendations = buildRecommendations(warnings, sectionScores);

  return {
    jobId: job.id, resumeId: job.data.resumeId, status: "completed", reportType,
    jobTitle: compactText(job.data.jobTitle), jobDescription: compactText(job.data.jobDescription),
    targetKeywords: keywords, overallScore: sectionScores.overall, matchScore: keywordResult.matchScore,
    sectionScores, keywordAnalysis: keywordResult.analysis, grammarIssues, formattingChecks,
    rewriteSuggestions, keywordGaps, recruiterImpression, strengths, weaknesses, priorityFixes,
    isOptimizedPrompt: isOptimizedPromptAvailable, aiUsed: false,
    verdict: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
    summary: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
    analyzedAt: new Date().toISOString(),
    sectionWiseAnalysis, experienceAnalysis, projectsAnalysis, skillsAnalysis, roleMatchAnalysis,
    keywordDensity, contentQualityAnalysis, recruiterFeedback, industryChecks, warnings, recommendations,
  };
};

export const processAtsAnalysisJob = async (job: { id: string; data: AtsAnalysisJobData }) => {
  try {
    const baseReport = buildAtsReport(job);
    const { report } = await enhanceWithAi(job, baseReport);

    if (report.keywordAnalysis?.missingKeywords) {
      report.keywordAnalysis.missingKeywords = report.keywordAnalysis.missingKeywords.map((k) =>
        typeof k === "string" ? { keyword: k, importance: "important" as const, reason: `Missing ${k} � add to skills or experience section` } : k
      );
    }

    const saved = await AtsAnalysis.findOneAndUpdate(
      { jobId: job.id, userId: job.data.userId },
      {
        jobId: job.id, resumeId: job.data.resumeId, userId: job.data.userId, status: "completed",
        reportType: report.reportType, jobTitle: report.jobTitle ?? "", jobDescription: report.jobDescription ?? "",
        targetKeywords: report.targetKeywords, previousOverallScore: job.data.previousOverallScore ?? undefined,
        overallScore: report.overallScore, matchScore: report.matchScore, sectionScores: report.sectionScores,
        keywordAnalysis: report.keywordAnalysis, grammarIssues: report.grammarIssues, formattingChecks: report.formattingChecks,
        rewriteSuggestions: report.rewriteSuggestions, perSectionSuggestions: report.perSectionSuggestions ?? undefined,
        sectionAudit: report.sectionAudit ?? [], actionPlan: report.actionPlan ?? [], quickWins: report.quickWins ?? [],
        estimatedScoreAfterFixes: report.estimatedScoreAfterFixes, questionsForUser: report.questionsForUser ?? [],
        keywordPlacement: report.keywordPlacement ?? [], formattingFixes: report.formattingFixes ?? [],
        keywordGaps: report.keywordGaps ?? [], verdict: report.verdict ?? "", summary: report.summary,
        analyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()), lastError: "",
        categoryScores: report.categoryScores ?? undefined, formatIssues: report.formatIssues ?? undefined,
        contentImprovements: report.contentImprovements ?? undefined, sectionAnalysis: report.sectionAnalysis ?? undefined,
        sectionWiseAnalysis: report.sectionWiseAnalysis ?? undefined, experienceAnalysis: report.experienceAnalysis ?? undefined,
        projectsAnalysis: report.projectsAnalysis ?? undefined, skillsAnalysis: report.skillsAnalysis ?? undefined,
        roleMatchAnalysis: report.roleMatchAnalysis ?? undefined, keywordDensity: report.keywordDensity ?? undefined,
        contentQualityAnalysis: report.contentQualityAnalysis ?? undefined, recruiterFeedback: report.recruiterFeedback ?? undefined,
        industryChecks: report.industryChecks ?? undefined, warnings: report.warnings ?? undefined,
        recommendations: report.recommendations ?? undefined,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await Resume.findOneAndUpdate(
      { _id: job.data.resumeId, userId: job.data.userId },
      { atsScore: report.overallScore, atsStatus: report.status, atsAnalyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()), latestAtsAnalysis: report },
      { returnDocument: "after" },
    ).catch((saveError: unknown) => {
      logger.warn({ saveError, jobId: job.data.analysisId, resumeId: job.data.resumeId }, "Failed to persist resume ATS score");
    });

    logger.info({ jobId: job.data.analysisId, resumeId: job.data.resumeId }, "ATS analysis job completed");
    return saved?.toObject() ?? report;
  } catch (error) {
    await AtsAnalysis.findOneAndUpdate(
      { jobId: job.id, userId: job.data.userId },
      { jobId: job.id, resumeId: job.data.resumeId, userId: job.data.userId, status: "failed", lastError: error instanceof Error ? error.message : String(error) },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).catch((saveError) => { logger.warn({ saveError, jobId: job.data.analysisId }, "Failed to persist ATS failure state"); });
    logger.error({ error, jobId: job.data.analysisId, resumeId: job.data.resumeId }, "ATS analysis job failed");
    throw error;
  }
};

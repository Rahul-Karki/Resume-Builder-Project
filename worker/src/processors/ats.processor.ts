import type { Job } from "bullmq";
import type { AtsAnalysisJobData } from "../../../shared/src/bullmq";
import { clampScore, compactText, createSuggestionId, sliceText, type AiSuggestion, type AtsActionPlanItem, type AtsAnalysisReport, type AtsFormattingCheck, type AtsScoreBreakdown, type AtsSectionAudit, type AtsSectionKey, type AtsSectionSuggestions, type AtsKeywordPlacement } from "../../../shared/src/ai";
import { logger } from "../observability";
import AtsAnalysis from "../models/AtsAnalysis";
import mongoose from "mongoose";
import { analyzeGrammarIssues } from "./grammarAnalysis.processor";
import { analyzeKeywordMatch } from "./jdMatch.processor";
import { env } from "../config/env";
import { buildEnhancedAtsUserPrompt, ENHANCED_ATS_SYSTEM_PROMPT } from "../utils/atsPromptTemplates";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla|throughput|requests)\b/i.test(text);

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
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY);
};

type AiProviderName = "openai" | "gemini";

const getProviderOrder = (): AiProviderName[] => {
  const configured: AiProviderName[] = [];
  if (env.GEMINI_API_KEY) configured.push("gemini");
  if (env.OPENAI_API_KEY) configured.push("openai");

  if (env.AI_PROVIDER === "openai") {
    return env.OPENAI_API_KEY ? ["openai", ...configured.filter((p) => p !== "openai")] : configured;
  }

  if (env.AI_PROVIDER === "gemini") {
    return env.GEMINI_API_KEY ? ["gemini", ...configured.filter((p) => p !== "gemini")] : configured;
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
      temperature: 0.2,
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
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
};

const normalizeEnhancement = (value: Record<string, unknown>): AiAtsEnhancement => {
  const keywordAnalysis = (getNested(value, "keyword_analysis") ?? getNested(value, "keywordAnalysis")) as Record<string, unknown> | undefined;
  const jdKeywordBuckets = getNested(keywordAnalysis, "jd_keywords") as Record<string, unknown> | undefined;

  const jdKeywords = Array.from(new Set([
    ...asStringArray(value.jdKeywords),
    ...asStringArray(getNested(value, "jd_keywords")),
    ...asStringArray(getNested(jdKeywordBuckets, "hard_skills")),
    ...asStringArray(getNested(jdKeywordBuckets, "tools_technologies")),
    ...asStringArray(getNested(jdKeywordBuckets, "industry_terms")),
    ...asStringArray(getNested(jdKeywordBuckets, "action_verbs")),
  ]));

  const rawRewriteSuggestions = (Array.isArray(value.rewriteSuggestions) ? value.rewriteSuggestions : [])
    .concat(Array.isArray(value.rewrite_suggestions) ? value.rewrite_suggestions : []);

  const rewriteSuggestions: AiSuggestion[] = rawRewriteSuggestions
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const section = toSectionFromArea(compactText(record.area));
      const suggestionText = compactText(record.suggestionText)
        || compactText(record.after)
        || compactText(record.after_text)
        || compactText(record.example_improved);
      const originalText = compactText(record.originalText)
        || compactText(record.before)
        || compactText(record.before_text);
      const reason = compactText(record.reason)
        || compactText(record.why_it_hurts_ats)
        || compactText(record.what_to_add_or_fix)
        || "ATS improvement suggestion";
      return {
        id: typeof record.id === "string" && compactText(record.id) ? record.id : createSuggestionId("ai-ats", index),
        originalText,
        suggestionText,
        reason,
        impact: normalizeImpact(record.impact ?? (Number(record.expected_score_gain) >= 8 ? "high" : Number(record.expected_score_gain) >= 4 ? "medium" : "low")),
        path: typeof record.path === "string" && compactText(record.path) ? compactText(record.path) : sectionPathForKey(section),
      };
    })
    .filter((item) => Boolean(item.suggestionText));

  const perSectionSuggestions = SECTION_KEYS.reduce<AtsSectionSuggestions>((accumulator, section) => {
    const candidateObject = (value.perSectionSuggestions && typeof value.perSectionSuggestions === "object"
      ? value.perSectionSuggestions
      : (value.per_section_suggestions && typeof value.per_section_suggestions === "object" ? value.per_section_suggestions : undefined)) as Record<string, unknown> | undefined;

    const rawSuggestions = candidateObject ? candidateObject[section] : undefined;

    const items = Array.isArray(rawSuggestions)
      ? rawSuggestions
          .filter((item) => typeof item === "string")
          .map((item, index) => ({
            id: createSuggestionId(`section-${section}`, index),
            originalText: "",
            suggestionText: compactText(item),
            reason: `${section} improvement suggestion`,
            impact: "medium" as const,
            path: sectionPathForKey(section),
          }))
          .filter((item) => Boolean(item.suggestionText))
      : [];

    if (items.length > 0) {
      accumulator[section] = items;
    }

    return accumulator;
  }, {});

  const sectionScores = value.section_scores && typeof value.section_scores === "object"
    ? {
      summary: normalizeScoreValue((value.section_scores as Record<string, unknown>).summary),
      experience: normalizeScoreValue((value.section_scores as Record<string, unknown>).experience),
      skills: normalizeScoreValue((value.section_scores as Record<string, unknown>).skills),
      education: normalizeScoreValue((value.section_scores as Record<string, unknown>).education),
      formatting: normalizeScoreValue((value.section_scores as Record<string, unknown>).formatting),
      projects: normalizeScoreValue((value.section_scores as Record<string, unknown>).projects),
    }
    : undefined;

  const overallScore = Number.isFinite(Number(value.overall_score)) ? clampScore(Number(value.overall_score)) : undefined;

  const sectionAudit = Array.isArray(value.section_audit)
    ? value.section_audit
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const record = item as Record<string, unknown>;
        const fix = (record.fix && typeof record.fix === "object") ? (record.fix as Record<string, unknown>) : {};
        return {
          section: normalizeSectionAuditSection(record.section),
          status: normalizeSectionAuditStatus(record.status),
          fix: {
            why: compactText(fix.why),
            keywordsToInclude: Array.isArray(fix.keywords_to_include)
              ? fix.keywords_to_include.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean)
              : Array.isArray(fix.keywordsToInclude)
                ? fix.keywordsToInclude.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean)
                : [],
            copyPasteTemplate: compactText(fix.copy_paste_template) || compactText(fix.copyPasteTemplate),
            example: compactText(fix.example),
            expectedScoreGain: Number(fix.expected_score_gain ?? fix.expectedScoreGain ?? 0),
          },
        } as AtsSectionAudit;
      })
      .filter((item) => Boolean(item.fix.why || item.fix.copyPasteTemplate || item.fix.example))
    : [];

  sectionAudit.forEach((auditItem, index) => {
    const section = normalizeSectionKey(String(auditItem.section));
    if (!section) return;

    const suggestions = perSectionSuggestions[section] ?? [];
    const suggestionText = compactText(auditItem.fix.copyPasteTemplate)
      || compactText(auditItem.fix.example)
      || compactText(auditItem.fix.why);

    if (suggestionText) {
      suggestions.push({
        id: createSuggestionId(`audit-${section}`, index),
        originalText: "",
        suggestionText,
        reason: auditItem.fix.why || `${section} improvement suggestion`,
        impact: normalizeImpact(auditItem.status === "missing" || auditItem.status === "empty" ? "high" : "medium"),
        path: sectionPathForKey(section),
      });
      perSectionSuggestions[section] = suggestions;
    }
  });

  const copyPasteSnippets = (getNested(value, "copy_paste_snippets") ?? getNested(value, "copyPasteSnippets")) as Record<string, unknown> | undefined;
  const summaryOptions = asStringArray(getNested(copyPasteSnippets, "summary_options")).concat(asStringArray(getNested(copyPasteSnippets, "summaryOptions")));
  if (summaryOptions.length > 0) {
    const existing = perSectionSuggestions.summary ?? [];
    summaryOptions.slice(0, 3).forEach((item, index) => {
      existing.push({
        id: createSuggestionId("snippet-summary", index),
        originalText: "",
        suggestionText: item,
        reason: "Use this ATS-optimized summary option",
        impact: "medium",
        path: "personalInfo.summary",
      });
    });
    perSectionSuggestions.summary = existing;
  }

  const skillsSectionSnippet = compactText(getNested(copyPasteSnippets, "skills_section") ?? getNested(copyPasteSnippets, "skillsSection"));
  if (skillsSectionSnippet) {
    const existing = perSectionSuggestions.skills ?? [];
    existing.push({
      id: createSuggestionId("snippet-skills", existing.length),
      originalText: "",
      suggestionText: skillsSectionSnippet,
      reason: "Add ATS-friendly skills grouping",
      impact: "medium",
      path: "sections.skills",
    });
    perSectionSuggestions.skills = existing;
  }

  const actionPlan = Array.isArray(value.action_plan)
    ? value.action_plan
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          priority: normalizeActionPlanPriority(record.priority),
          action: compactText(record.action),
          whyItIncreasesScore: compactText(record.why_it_increases_score) || compactText(record.whyItIncreasesScore),
          howToDo: Array.isArray(record.how_to_do)
            ? record.how_to_do.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean)
            : Array.isArray(record.howToDo)
              ? record.howToDo.filter((entry) => typeof entry === "string").map((entry) => compactText(entry)).filter(Boolean)
              : [],
          expectedScoreGain: Number(record.expected_score_gain ?? record.expectedScoreGain ?? 0),
        } as AtsActionPlanItem;
      })
      .filter((item) => Boolean(item.action || item.whyItIncreasesScore))
    : [];

  const quickWins = Array.isArray(value.quick_wins)
    ? value.quick_wins.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
    : Array.isArray(value.quickWins)
      ? value.quickWins.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
      : [];

  const estimatedScoreAfterFixes = Number.isFinite(Number(value.estimated_score_after_fixes ?? value.estimatedScoreAfterFixes))
    ? clampScore(Number(value.estimated_score_after_fixes ?? value.estimatedScoreAfterFixes))
    : undefined;

  const keywordPlacement = normalizeKeywordPlacement(value.keyword_placement ?? value.keywordPlacement);
  const keywordGaps = Array.from(new Set([
    ...asStringArray(value.keywordGaps),
    ...asStringArray(value.keyword_gaps),
    ...asStringArray(getNested(keywordAnalysis, "missing_keywords")),
    ...asStringArray(getNested(keywordAnalysis, "missingKeywords")),
  ]));

  const verdict = compactText(value.verdict)
    || compactText(value.summary)
    || asStringArray(getNested(getNested(value, "diagnosis"), "top_problems")).slice(0, 2).join(" ");

  const grade = typeof value.grade === "string" ? compactText(value.grade) : "";

  const questionsForUser = Array.isArray(value.questionsForUser)
    ? value.questionsForUser.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
    : Array.isArray(value.questions_for_user)
      ? value.questions_for_user.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
      : [];

  return {
    grade: grade === "poor" || grade === "average" || grade === "good" || grade === "excellent" ? grade : undefined,
    overallScore,
    sectionScores,
    jdKeywords: jdKeywords.slice(0, 30),
    rewriteSuggestions: rewriteSuggestions.slice(0, 12),
    perSectionSuggestions,
    keywordGaps: keywordGaps.slice(0, 3),
    verdict: verdict || undefined,
    quickWins: quickWins.slice(0, 5),
    actionPlan: actionPlan.slice(0, 6),
    sectionAudit: sectionAudit.slice(0, 10),
    estimatedScoreAfterFixes,
    keywordPlacement: keywordPlacement.slice(0, 12),
    questionsForUser: questionsForUser.slice(0, 5),
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
    `NAME: ${compactText(personal.name)}`,
    `EMAIL: ${compactText(personal.email)}`,
    `SUMMARY: ${sections.summary}`,
    "EXPERIENCE:",
    ...experienceLines,
    "SKILLS:",
    ...skillsLines,
    "PROJECTS:",
    ...projectLines,
  ].filter(Boolean).join("\n");

  return sliceText(parts, 9000);
};

const enhanceWithAi = async (job: Job<AtsAnalysisJobData>, base: AtsAnalysisReport): Promise<{ report: AtsAnalysisReport; aiUsed: boolean }> => {
  if (!providerIsConfigured()) return { report: base, aiUsed: false };

  const resumeSnippet = buildResumeSnippetForAi(job.data.resume);
  const jobDescription = sliceText(job.data.jobDescription, 6000);
  const targetRole = compactText(job.data.jobTitle);

  const systemPrompt = ENHANCED_ATS_SYSTEM_PROMPT;
  const userPrompt = [
    buildEnhancedAtsUserPrompt(resumeSnippet, jobDescription),
    `TARGET ROLE: ${targetRole}`,
    `EXISTING KEYWORDS: ${job.data.keywords.join(", ")}`,
    `PREVIOUS SCORE: ${job.data.previousOverallScore ?? "none"}`,
  ].join("\n\n");

  const providers = getProviderOrder();
  if (providers.length === 0) return { report: base, aiUsed: false };

  const timeoutMs = 15000;
  let lastError: unknown;

  for (const provider of providers) {
    try {
      const raw = await withTimeout(timeoutMs, async (signal) => {
        return provider === "openai"
          ? await callOpenAIJson(systemPrompt, userPrompt, signal)
          : await callGeminiJson(systemPrompt, userPrompt, signal);
      });

      const parsed = parseJsonFromModel(raw);
      const enhancement = normalizeEnhancement(parsed);

      const mergedKeywords = Array.from(new Set([
        ...(base.targetKeywords ?? []),
        ...job.data.keywords,
        ...enhancement.jdKeywords,
      ].map((kw) => compactText(kw)).filter(Boolean)));

      const keywordResult = analyzeKeywordMatch(job.data.resume, mergedKeywords, job.data.jobDescription);
      const sectionScores = buildSectionScores(job.data.resume, keywordResult.matchScore);
      const suggestionById = new Map<string, AiSuggestion>();
      (base.rewriteSuggestions ?? []).forEach((suggestion) => {
        if (suggestion?.id) suggestionById.set(suggestion.id, suggestion);
      });
      enhancement.rewriteSuggestions.forEach((suggestion) => {
        if (suggestion?.id) suggestionById.set(suggestion.id, suggestion);
      });
      const perSectionSuggestions: AtsSectionSuggestions = {};
      SECTION_KEYS.forEach((section) => {
        const baseSuggestions = (base.perSectionSuggestions?.[section] ?? []).map((suggestion, index) => cloneSuggestion(suggestion, `base-section-${section}`, index));
        const aiSuggestions = (enhancement.perSectionSuggestions?.[section] ?? []).map((suggestion, index) => cloneSuggestion(suggestion, `ai-section-${section}`, index));
        const merged = [...baseSuggestions, ...aiSuggestions];
        if (merged.length > 0) {
          perSectionSuggestions[section] = merged.slice(0, 10);
          merged.forEach((suggestion) => {
            if (suggestion.id) suggestionById.set(suggestion.id, suggestion);
          });
        }
      });

      const hasAnySuggestions = Object.values(perSectionSuggestions).some((items) => (items?.length ?? 0) > 0);
      if (!hasAnySuggestions) {
        const keywordGapsForFallback = (enhancement.keywordGaps.length > 0 ? enhancement.keywordGaps : keywordResult.analysis.missingKeywords).slice(0, 3);

        perSectionSuggestions.summary = [{
          id: createSuggestionId("fallback-summary", 0),
          originalText: "",
          suggestionText: `Add a 3-4 line summary tailored to ${targetRole || "the target role"} and naturally include keywords like ${keywordGapsForFallback.join(", ") || "role, impact, and core tools"}.`,
          reason: "A targeted summary improves ATS matching quickly.",
          impact: "high",
          path: "personalInfo.summary",
        }];

        perSectionSuggestions.experience = [{
          id: createSuggestionId("fallback-experience", 0),
          originalText: "",
          suggestionText: "Rewrite weak bullets with action verb + task + measurable result. Include one metric in each of your top 3 bullets.",
          reason: "Result-oriented bullets improve both ATS and recruiter scans.",
          impact: "high",
          path: "sections.experience",
        }];

        perSectionSuggestions.skills = [{
          id: createSuggestionId("fallback-skills", 0),
          originalText: "",
          suggestionText: `Create grouped skills sections (Languages, Frameworks, Tools) and add missing keywords: ${keywordGapsForFallback.join(", ") || "job-specific tools"}.`,
          reason: "Structured skills and missing keywords increase match score.",
          impact: "medium",
          path: "sections.skills",
        }];
      }

      const rewriteSuggestions: AiSuggestion[] = Array.from(suggestionById.values()).slice(0, 20);
      const keywordGaps = enhancement.keywordGaps.length > 0 ? enhancement.keywordGaps : keywordResult.analysis.missingKeywords.slice(0, 3);
      const verdict = enhancement.verdict || buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords);
      const overallScore = clampScore(enhancement.overallScore ?? sectionScores.overall);
      const mergedSectionScores: AtsScoreBreakdown = {
        summary: enhancement.sectionScores?.summary ?? sectionScores.summary,
        experience: enhancement.sectionScores?.experience ?? sectionScores.experience,
        skills: enhancement.sectionScores?.skills ?? sectionScores.skills,
        education: enhancement.sectionScores?.education ?? sectionScores.education,
        formatting: enhancement.sectionScores?.formatting ?? sectionScores.formatting,
        projects: enhancement.sectionScores?.projects ?? sectionScores.projects,
      };

      const prevScore = job.data.previousOverallScore;
      const report: AtsAnalysisReport = {
        ...base,
        ...(prevScore != null ? { previousOverallScore: Number(prevScore) } : {}),
        grade: enhancement.grade,
        targetKeywords: mergedKeywords,
        matchScore: keywordResult.matchScore,
        keywordAnalysis: keywordResult.analysis,
        sectionScores: mergedSectionScores,
        overallScore,
        rewriteSuggestions,
        perSectionSuggestions,
        sectionAudit: enhancement.sectionAudit,
        actionPlan: enhancement.actionPlan,
        quickWins: enhancement.quickWins,
        estimatedScoreAfterFixes: enhancement.estimatedScoreAfterFixes,
        questionsForUser: enhancement.questionsForUser,
        keywordPlacement: enhancement.keywordPlacement,
        keywordGaps,
        verdict,
        summary: buildReportSummary(job.data.jobTitle, overallScore, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
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
  experience: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.experience)
    ? (resume.sections as Record<string, unknown>).experience as Array<Record<string, unknown>>
    : [],
  skills: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.skills)
    ? (resume.sections as Record<string, unknown>).skills as Array<Record<string, unknown>>
    : [],
  education: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.education)
    ? (resume.sections as Record<string, unknown>).education as Array<Record<string, unknown>>
    : [],
  projects: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.projects)
    ? (resume.sections as Record<string, unknown>).projects as Array<Record<string, unknown>>
    : [],
});

const buildFormattingChecks = (resume: Record<string, unknown>): AtsFormattingCheck[] => {
  const sections = getSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};

  return [
    {
      id: "contact-info",
      label: "Contact information present",
      passed: Boolean(compactText(personal.name) && compactText(personal.email)),
      score: Boolean(compactText(personal.name) && compactText(personal.email)) ? 100 : 40,
      reason: "A clear name and email improve ATS parsing.",
    },
    {
      id: "summary-length",
      label: "Summary length is balanced",
      passed: sections.summary.length >= 80 && sections.summary.length <= 500,
      score: sections.summary.length === 0 ? 20 : sections.summary.length < 80 ? 45 : sections.summary.length > 500 ? 65 : 100,
      reason: "A concise but substantive summary helps recruiters scan quickly.",
    },
    {
      id: "core-sections",
      label: "Core sections are populated",
      passed: sections.experience.length > 0 && sections.skills.length > 0,
      score: clampScore((sections.experience.length > 0 ? 55 : 20) + (sections.skills.length > 0 ? 45 : 20)),
      reason: "Experience and skills are the core ATS signals.",
    },
    {
      id: "project-presence",
      label: "Project or experience depth",
      passed: sections.projects.length > 0 || sections.experience.length > 1,
      score: clampScore((sections.projects.length > 0 ? 60 : 30) + Math.min(sections.experience.length * 10, 40)),
      reason: "Projects or multiple roles improve context and depth.",
    },
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

  const overall = clampScore(
    summaryScore * 0.16
      + experienceScore * 0.28
      + skillsScore * 0.2
      + educationScore * 0.08
      + projectsScore * 0.08
      + formattingScore * 0.12
      + keywordMatchScore * 0.08,
  );

  return {
    summary: summaryScore,
    experience: experienceScore,
    skills: skillsScore,
    education: educationScore,
    formatting: formattingScore,
    projects: projectsScore,
    overall,
  };
};

const buildRewriteSuggestions = (resume: Record<string, unknown>, grammarIssues: ReturnType<typeof analyzeGrammarIssues>) => {
  const sections = getSections(resume);
  const summary = sections.summary;
  const suggestions: AtsAnalysisReport["rewriteSuggestions"] = [];

  if (summary.length < 120) {
    suggestions.push({
      id: createSuggestionId("summary", 0),
      originalText: summary,
      suggestionText: `${summary} Focus on quantified outcomes, core strengths, and role-relevant keywords.`.trim(),
      reason: "The summary is too short to carry ATS value on its own.",
      impact: "high",
      path: "personalInfo.summary",
    });
  }

  grammarIssues.slice(0, 10).forEach((issue, index) => {
    suggestions.push({
      id: createSuggestionId("rewrite", index + 1),
      originalText: issue.originalText,
      suggestionText: issue.suggestionText,
      reason: issue.reason,
      impact: issue.severity,
      path: issue.path,
    });
  });

  return suggestions.slice(0, 20);
};

const buildReportSummary = (jobTitle: string | undefined, overall: number, matchScore: number, missingKeywords: string[]) => {
  const title = compactText(jobTitle) || "resume";
  return `${title} scored ${overall}/100 with a ${matchScore}% keyword match.${missingKeywords.length > 0 ? ` Missing keywords: ${missingKeywords.slice(0, 6).join(", ")}.` : ""}`;
};

const buildAtsReport = (job: Job<AtsAnalysisJobData>): AtsAnalysisReport => {
  const reportType = job.data.reportType ?? (job.data.jobDescription ? "job-description-match" : "resume-analysis");
  const keywords = Array.from(new Set((job.data.keywords.length > 0 ? job.data.keywords : []).map((keyword) => compactText(keyword)).filter(Boolean)));
  const keywordResult = analyzeKeywordMatch(job.data.resume, keywords, job.data.jobDescription);
  const grammarIssues = analyzeGrammarIssues(job.data.resume);
  const sectionScores = buildSectionScores(job.data.resume, keywordResult.matchScore);
  const formattingChecks = buildFormattingChecks(job.data.resume);
  const rewriteSuggestions = buildRewriteSuggestions(job.data.resume, grammarIssues);
  const keywordGaps = keywordResult.analysis.missingKeywords.slice(0, 3);

  return {
    jobId: job.id,
    resumeId: job.data.resumeId,
    status: "completed",
    reportType,
    jobTitle: compactText(job.data.jobTitle),
    jobDescription: compactText(job.data.jobDescription),
    targetKeywords: keywords,
    overallScore: sectionScores.overall,
    matchScore: keywordResult.matchScore,
    sectionScores,
    keywordAnalysis: keywordResult.analysis,
    grammarIssues,
    formattingChecks,
    rewriteSuggestions,
    keywordGaps,
    verdict: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
    summary: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
    analyzedAt: new Date().toISOString(),
  };
};

export const processAtsAnalysisJob = async (job: Job<AtsAnalysisJobData>) => {
  try {
    const baseReport = buildAtsReport(job);
    const { report } = await enhanceWithAi(job, baseReport);

    const saved = await AtsAnalysis.findOneAndUpdate(
      { jobId: job.id, userId: job.data.userId },
      {
        jobId: job.id,
        resumeId: job.data.resumeId,
        userId: job.data.userId,
        status: "completed",
        reportType: report.reportType,
        jobTitle: report.jobTitle ?? "",
        jobDescription: report.jobDescription ?? "",
        targetKeywords: report.targetKeywords,
        previousOverallScore: job.data.previousOverallScore ?? undefined,
        overallScore: report.overallScore,
        matchScore: report.matchScore,
        sectionScores: report.sectionScores,
        keywordAnalysis: report.keywordAnalysis,
        grammarIssues: report.grammarIssues,
        formattingChecks: report.formattingChecks,
        rewriteSuggestions: report.rewriteSuggestions,
        perSectionSuggestions: report.perSectionSuggestions ?? undefined,
        sectionAudit: report.sectionAudit ?? [],
        actionPlan: report.actionPlan ?? [],
        quickWins: report.quickWins ?? [],
        estimatedScoreAfterFixes: report.estimatedScoreAfterFixes,
        questionsForUser: report.questionsForUser ?? [],
        keywordPlacement: report.keywordPlacement ?? [],
        keywordGaps: report.keywordGaps ?? [],
        verdict: report.verdict ?? "",
        summary: report.summary,
        analyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()),
        lastError: "",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    const db = mongoose.connection.db;
    if (!db) {
      logger.warn({ jobId: job.data.analysisId }, "MongoDB not connected; skipping resume ATS score update");
    } else {
    await db.collection("resumes").findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(job.data.resumeId), userId: new mongoose.Types.ObjectId(job.data.userId) },
      {
        $set: {
          atsScore: report.overallScore,
          atsStatus: report.status,
          atsAnalyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()),
          latestAtsAnalysis: report,
        },
      },
    ).catch((saveError: unknown) => {
      logger.warn({ saveError, jobId: job.data.analysisId, resumeId: job.data.resumeId }, "Failed to persist resume ATS score");
    });
    }

    logger.info({ jobId: job.data.analysisId, resumeId: job.data.resumeId }, "ATS analysis job completed");
    return saved?.toObject() ?? report;
  } catch (error) {
    await AtsAnalysis.findOneAndUpdate(
      { jobId: job.id, userId: job.data.userId },
      {
        jobId: job.id,
        resumeId: job.data.resumeId,
        userId: job.data.userId,
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).catch((saveError) => {
      logger.warn({ saveError, jobId: job.data.analysisId }, "Failed to persist ATS failure state");
    });

    logger.error({ error, jobId: job.data.analysisId, resumeId: job.data.resumeId }, "ATS analysis job failed");
    throw error;
  }
};

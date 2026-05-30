import type { AtsAnalysisJobData } from "../../../shared/src/jobs";
import { clampScore, compactText, createSuggestionId, sliceText, type AiSuggestion, type AtsActionPlanItem, type AtsAnalysisReport, type AtsFormattingCheck, type AtsScoreBreakdown, type AtsSectionAudit, type AtsSectionKey, type AtsSectionSuggestions, type AtsKeywordPlacement, type AutoApplyPayload, type RecruiterImpression, type AtsKeywordAnalysis, type AtsCategoryScores, type AtsFormatIssue, type AtsContentImprovement, type AtsSectionAnalysis, type ClickToApply } from "../../../shared/src/ai";
import { logger } from "../observability";
import AtsAnalysis from "../models/AtsAnalysis";
import Resume from "../models/Resume";
import { analyzeGrammarIssues } from "./grammarAnalysis.processor";
import { analyzeKeywordMatch } from "./jdMatch.processor";
import { env } from "../config/env";
import { buildEnhancedAtsUserPrompt, ENHANCED_ATS_SYSTEM_PROMPT } from "../utils/atsPromptTemplates";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const WEAK_VERBS = ["worked on", "helped", "responsible for", "was part of", "was involved in", "did", "made", "got", "was", "were"];

const QUANTIFICATION_PATTERNS = [/user[s]?/i, /customer[s]?/i, /client[s]?/i, /team[s]?/i, /project[s]?/i, /feature[s]?/i, /system[s]?/i, /service[s]?/i, /application[s]?/i, /api[s]?/i, /request[s]?/i, /revenue/i, /budget/i, /cost/i, /time/i, /performance/i, /efficiency/i, /speed/i, /accuracy/i];

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
  /** New v2 fields */
  categoryScores?: AtsCategoryScores;
  formatIssues?: AtsFormatIssue[];
  contentImprovements?: AtsContentImprovement[];
  sectionAnalysis?: AtsSectionAnalysis[];
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
      const autoApplyRaw = (record.auto_apply_payload || record.autoApply) as Record<string, unknown> | undefined;
      const autoApply = autoApplyRaw && typeof autoApplyRaw === "object" ? {
        section: (autoApplyRaw.section || "experience") as AutoApplyPayload["section"],
        type: (autoApplyRaw.type || "bullet_improvement") as AutoApplyPayload["type"],
        field: autoApplyRaw.field as string | undefined,
        index: typeof autoApplyRaw.index === "number" ? autoApplyRaw.index : undefined,
        replaceWith: compactText(autoApplyRaw.replace_with || autoApplyRaw.replaceWith || suggestionText),
        oldText: compactText(autoApplyRaw.old_text || autoApplyRaw.oldText || originalText),
      } : undefined;
      const scoreDelta = Number.isFinite(Number(record.scoreDelta)) ? Number(record.scoreDelta)
        : Number.isFinite(Number(record.expected_score_gain)) ? Number(record.expected_score_gain)
        : undefined;
      return {
        id: typeof record.id === "string" && compactText(record.id) ? record.id : createSuggestionId("ai-ats", index),
        originalText,
        suggestionText,
        reason,
        impact: normalizeImpact(record.impact ?? (Number(record.expected_score_gain) >= 8 ? "high" : Number(record.expected_score_gain) >= 4 ? "medium" : "low")),
        path: typeof record.path === "string" && compactText(record.path) ? compactText(record.path) : sectionPathForKey(section),
        ...(autoApply ? { autoApply } : {}),
        ...(scoreDelta !== undefined ? { scoreDelta } : {}),
        ...(Number(record.expected_score_gain) > 0 ? { atsImpact: `+${Number(record.expected_score_gain)}` } : { atsImpact: undefined }),
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

  // ── New v2 format: top-level missingKeywords ──
  const topLevelMissingKeywords = Array.isArray(value.missingKeywords)
    ? value.missingKeywords.filter((item) => item && typeof item === "object")
    : Array.isArray(value.missing_keywords)
      ? value.missing_keywords.filter((item) => item && typeof item === "object")
      : [];
  if (topLevelMissingKeywords.length > 0) {
    topLevelMissingKeywords.forEach((item) => {
      const record = item as Record<string, unknown>;
      const kw = compactText(record.keyword);
      if (kw && !keywordGaps.includes(kw)) {
        keywordGaps.push(kw);
      }
    });
  }

  // ── New v2 format: categoryScores ──
  const categoryScoresRaw = (value.categoryScores ?? value.category_scores) as Record<string, unknown> | undefined;
  const categoryScores: AtsCategoryScores | undefined = categoryScoresRaw && typeof categoryScoresRaw === "object"
    ? {
        keywordMatch: clampScore(Number(categoryScoresRaw.keywordMatch ?? categoryScoresRaw.keyword_match ?? 0)),
        parsing: clampScore(Number(categoryScoresRaw.parsing ?? 0)),
        contentQuality: clampScore(Number(categoryScoresRaw.contentQuality ?? categoryScoresRaw.content_quality ?? 0)),
        experienceRelevance: clampScore(Number(categoryScoresRaw.experienceRelevance ?? categoryScoresRaw.experience_relevance ?? 0)),
        formatting: clampScore(Number(categoryScoresRaw.formatting ?? 0)),
      }
    : undefined;

  // ── New v2 format: formatIssues ──
  const formatIssuesRaw = (value.formatIssues ?? value.format_issues) as unknown[];
  const formatIssues: AtsFormatIssue[] = Array.isArray(formatIssuesRaw)
    ? formatIssuesRaw.filter((item) => item && typeof item === "object").map((item) => {
        const record = item as Record<string, unknown>;
        const cta = record.clickToApply as Record<string, unknown> | undefined;
        return {
          id: compactText(record.id) || createSuggestionId("fmt", formatIssuesRaw.indexOf(item)),
          severity: record.severity === "high" || record.severity === "medium" || record.severity === "low" ? record.severity : "medium",
          section: compactText(record.section) || "",
          problem: compactText(record.problem) || "",
          reason: compactText(record.reason) || "",
          fixSuggestion: compactText(record.fixSuggestion) || compactText(record.fix_suggestion) || "",
          startIndex: Number(record.startIndex ?? record.start_index ?? -1),
          endIndex: Number(record.endIndex ?? record.end_index ?? -1),
          ...(cta && typeof cta === "object" && compactText(cta.targetText)
            ? { clickToApply: { type: (cta.type === "insert" || cta.type === "remove" ? cta.type : "replace") as ClickToApply["type"], targetText: compactText(cta.targetText), replacementText: compactText(cta.replacementText) } }
            : {}),
        } as AtsFormatIssue;
      })
    : [];

  // ── New v2 format: contentImprovements → rewriteSuggestions ──
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
          rewriteSuggestions.push({
            id: compactText(record.id) || createSuggestionId("ci", index),
            originalText: original,
            suggestionText: improved,
            reason: compactText(record.reason) || "Content improvement",
            impact: normalizeImpact(Number(record.atsGain) >= 8 ? "high" : Number(record.atsGain) >= 4 ? "medium" : "low"),
            path: sectionPathForKey(compactText(record.section) as AtsSectionKey),
            scoreDelta: Number(record.atsGain ?? 0) || undefined,
            ...(cta && typeof cta === "object" && compactText(cta.targetText)
              ? { clickToApply: { type: "replace" as const, targetText: compactText(cta.targetText), replacementText: compactText(cta.replacementText) } }
              : {}),
          });
        }
      }
    });
  }

  // ── New v2 format: sectionAnalysis ──
  const sectionAnalysisRaw = (value.sectionAnalysis ?? value.section_analysis) as unknown[];
  const sectionAnalysis: AtsSectionAnalysis[] = Array.isArray(sectionAnalysisRaw)
    ? sectionAnalysisRaw.filter((item) => item && typeof item === "object").map((item) => {
        const record = item as Record<string, unknown>;
        return {
          section: compactText(record.section) || "",
          score: clampScore(Number(record.score ?? 0)),
          issues: asStringArray(record.issues),
          recommendations: asStringArray(record.recommendations),
        } as AtsSectionAnalysis;
      })
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
    categoryScores,
    formatIssues: formatIssues.slice(0, 8),
    contentImprovements: [],
    sectionAnalysis: sectionAnalysis.slice(0, 10),
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

const enhanceWithAi = async (job: { id: string; data: AtsAnalysisJobData }, base: AtsAnalysisReport): Promise<{ report: AtsAnalysisReport; aiUsed: boolean }> => {
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
        if (provider === "openai") return await callOpenAIJson(systemPrompt, userPrompt, signal);
        if (provider === "openrouter") return await callOpenRouterJson(systemPrompt, userPrompt, signal);
        return await callGeminiJson(systemPrompt, userPrompt, signal);
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

        const hasExperience = getSections(job.data.resume).experience.length > 0;
        perSectionSuggestions.experience = hasExperience
          ? [{
              id: createSuggestionId("fallback-experience", 0),
              originalText: "",
              suggestionText: "Rewrite weak bullets with action verb + task + measurable result. Include one metric in each of your top 3 bullets.",
              reason: "Result-oriented bullets improve both ATS and recruiter scans.",
              impact: "high",
              path: "sections.experience",
            }]
          : [{
              id: createSuggestionId("fallback-experience", 0),
              originalText: "",
              suggestionText: `Add a dedicated Experience section with at least 2-3 entries. For each role, include your title, company, dates, and 3-5 bullet points with measurable achievements. Mention keywords like ${keywordGapsForFallback.join(", ") || "your relevant technologies and tools"}.`,
              reason: "An experience section is critical for ATS — most systems filter candidates by experience.",
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
      const rawKeywordGaps = enhancement.keywordGaps.length > 0 ? enhancement.keywordGaps : keywordResult.analysis.missingKeywords.slice(0, 3);
      const keywordGaps = rawKeywordGaps.map((k: string | { keyword: string }) => typeof k === "string" ? k : k.keyword);
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
        /** New v2 fields */
        ...(enhancement.categoryScores ? { categoryScores: enhancement.categoryScores } : {}),
        ...(enhancement.formatIssues?.length ? { formatIssues: enhancement.formatIssues } : {}),
        ...(enhancement.contentImprovements?.length ? { contentImprovements: enhancement.contentImprovements } : {}),
        ...(enhancement.sectionAnalysis?.length ? { sectionAnalysis: enhancement.sectionAnalysis } : {}),
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
      priority: "critical",
      atsImpact: "+8",
      scoreDelta: 8,
      path: "personalInfo.summary",
      autoApply: { section: "summary", type: "summary_rewrite", replaceWith: `${summary} Focus on quantified outcomes, core strengths, and role-relevant keywords.`.trim(), oldText: summary },
    });
  }

  grammarIssues.slice(0, 10).forEach((issue, index) => {
    const delta = issue.severity === "high" ? 5 : 2;
    suggestions.push({
      id: createSuggestionId("rewrite", index + 1),
      originalText: issue.originalText,
      suggestionText: issue.suggestionText,
      reason: issue.reason,
      impact: issue.severity,
      priority: issue.severity === "high" ? "high" : "medium",
      atsImpact: `+${delta}`,
      scoreDelta: delta,
      path: issue.path,
      autoApply: { section: "experience", type: "grammar_fix", replaceWith: issue.suggestionText, oldText: issue.originalText },
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
          id: createSuggestionId(`verb-${entryIdx}-${bulletIdx}`, suggestions.length),
          originalText: bullet,
          suggestionText: improved,
          reason: `Replace weak verb with strong action verb for better ATS and recruiter impact`,
          impact: "high",
          priority: "high",
          atsImpact: "+6",
          scoreDelta: 6,
          path: `sections.experience`,
          autoApply: { section: "experience", type: "action_verb_improvement", field: "bullets", index: bulletIdx, replaceWith: improved, oldText: bullet },
        });
      }
    }

    if (hasActionVerbVal && !hasMetricVal) {
      const quantified = suggestQuantification(bullet);
      if (quantified && quantified !== bullet) {
        suggestions.push({
          id: createSuggestionId(`quant-${entryIdx}-${bulletIdx}`, suggestions.length),
          originalText: bullet,
          suggestionText: quantified,
          reason: `Add measurable impact to increase recruiter confidence and ATS score`,
          impact: "high",
          priority: "high",
          atsImpact: "+7",
          scoreDelta: 7,
          path: `sections.experience`,
          autoApply: { section: "experience", type: "quantify", field: "bullets", index: bulletIdx, replaceWith: quantified, oldText: bullet },
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

const getActionVerb = (text: string): string => {
  const first = text.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (ACTION_VERBS.has(first)) return first;
  return "";
};

const getQuantification = (text: string): string => {
  if (hasMetric(text)) return text;
  const matched = QUANTIFICATION_PATTERNS.find((p) => p.test(text));
  if (!matched) return "";
  return text;
};

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
  if (overallScore >= 80 && hasMetrics && hasActionVerbs) {
    firstImpression = "Strong profile with measurable achievements and clear career progression";
  } else if (overallScore >= 60 && hasActionVerbs) {
    firstImpression = "Solid foundation but lacks quantified outcomes to stand out";
  } else if (overallScore >= 40) {
    firstImpression = "Decent structure but needs stronger action verbs and measurable results";
  } else {
    firstImpression = "Requires significant improvement in content, formatting, and keyword alignment";
  }

  if (!hasSummary) firstImpression += ". Missing professional summary";
  if (!hasMetrics) firstImpression += ". Consider adding metrics to highlight impact";
  if (!hasActionVerbs) firstImpression += ". Use stronger action verbs";

  return { firstImpression, confidenceLevel, interviewProbability };
};

const buildAutoApplyActions = (resume: Record<string, unknown>, suggestions: AiSuggestion[]): AutoApplyPayload[] => {
  return suggestions
    .filter((s) => s.autoApply)
    .map((s) => s.autoApply!)
    .filter((a) => a.replaceWith && a.oldText && a.replaceWith !== a.oldText)
    .slice(0, 20);
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
  return sectionAudit
    .filter((a) => a.status === "missing" || a.status === "empty")
    .slice(0, 3)
    .map((a) => `Fix ${a.section}: ${a.fix.why}`)
    .concat(keywordGaps.slice(0, 2).map((k) => `Add missing keyword: ${k}`))
    .slice(0, 5);
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
  const autoApplyActions = buildAutoApplyActions(job.data.resume, rewriteSuggestions);

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
    recruiterImpression,
    strengths,
    weaknesses,
    priorityFixes,
    autoApplyActions,
    verdict: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
    summary: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
    analyzedAt: new Date().toISOString(),
  };
};

export const processAtsAnalysisJob = async (job: { id: string; data: AtsAnalysisJobData }) => {
  try {
    const baseReport = buildAtsReport(job);
    const { report } = await enhanceWithAi(job, baseReport);

    if (report.keywordAnalysis?.missingKeywords) {
      report.keywordAnalysis.missingKeywords = report.keywordAnalysis.missingKeywords.map((k) =>
        typeof k === "string" ? { keyword: k, importance: "important" as const, reason: `Missing ${k} — add to skills or experience section` } : k
      );
    }

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
        formattingFixes: report.formattingFixes ?? [],
        keywordGaps: report.keywordGaps ?? [],
        verdict: report.verdict ?? "",
        summary: report.summary,
        analyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()),
        lastError: "",
        /** New v2 format fields */
        categoryScores: report.categoryScores ?? undefined,
        formatIssues: report.formatIssues ?? undefined,
        contentImprovements: report.contentImprovements ?? undefined,
        sectionAnalysis: report.sectionAnalysis ?? undefined,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await Resume.findOneAndUpdate(
      { _id: job.data.resumeId, userId: job.data.userId },
      {
        atsScore: report.overallScore,
        atsStatus: report.status,
        atsAnalyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()),
        latestAtsAnalysis: report,
      },
      { returnDocument: "after" },
    ).catch((saveError: unknown) => {
      logger.warn({ saveError, jobId: job.data.analysisId, resumeId: job.data.resumeId }, "Failed to persist resume ATS score");
    });

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
import type { Job } from "bullmq";
import type { AtsAnalysisJobData } from "../../../shared/src/bullmq";
import { clampScore, compactText, createSuggestionId, sliceText, type AiSuggestion, type AtsAnalysisReport, type AtsFormattingCheck, type AtsSectionKey, type AtsSectionSuggestions } from "../../../shared/src/ai";
import { logger } from "../observability";
import AtsAnalysis from "../models/AtsAnalysis";
import { analyzeGrammarIssues } from "./grammarAnalysis.processor";
import { analyzeKeywordMatch } from "./jdMatch.processor";
import { env } from "../config/env";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla|throughput|requests)\b/i.test(text);

type AiAtsEnhancement = {
  jdKeywords: string[];
  rewriteSuggestions: AiSuggestion[];
  perSectionSuggestions: AtsSectionSuggestions;
  questionsForUser: string[];
};

const SECTION_KEYS: AtsSectionKey[] = ["summary", "experience", "skills", "education", "projects", "certifications", "languages"];

const normalizeImpact = (value: unknown): AiSuggestion["impact"] => {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
};

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
  const jdKeywords = Array.isArray(value.jdKeywords)
    ? value.jdKeywords.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
    : [];

  const rewriteSuggestions: AiSuggestion[] = Array.isArray(value.rewriteSuggestions)
    ? value.rewriteSuggestions
      .filter((item) => item && typeof item === "object")
      .map((item, index) => {
        const record = item as Record<string, unknown>;
        return {
          id: typeof record.id === "string" && compactText(record.id) ? record.id : createSuggestionId("ai-ats", index),
          originalText: compactText(record.originalText),
          suggestionText: compactText(record.suggestionText),
          reason: compactText(record.reason) || "ATS improvement suggestion",
          impact: normalizeImpact(record.impact),
          path: typeof record.path === "string" && compactText(record.path) ? compactText(record.path) : undefined,
        };
      })
      .filter((item) => Boolean(item.suggestionText))
    : [];

  const perSectionSuggestions = SECTION_KEYS.reduce<AtsSectionSuggestions>((accumulator, section) => {
    const rawSuggestions = value.perSectionSuggestions && typeof value.perSectionSuggestions === "object"
      ? (value.perSectionSuggestions as Record<string, unknown>)[section]
      : undefined;

    const items = Array.isArray(rawSuggestions)
      ? rawSuggestions
          .filter((item) => typeof item === "string")
          .map((item, index) => ({
            id: createSuggestionId(`section-${section}`, index),
            originalText: "",
            suggestionText: compactText(item),
            reason: `${section} improvement suggestion`,
            impact: "medium" as const,
            path: section === "summary" ? "personalInfo.summary" : `sections.${section}`,
          }))
          .filter((item) => Boolean(item.suggestionText))
      : [];

    if (items.length > 0) {
      accumulator[section] = items;
    }

    return accumulator;
  }, {});

  const questionsForUser = Array.isArray(value.questionsForUser)
    ? value.questionsForUser.filter((item) => typeof item === "string").map((item) => compactText(item)).filter(Boolean)
    : [];

  return {
    jdKeywords: jdKeywords.slice(0, 30),
    rewriteSuggestions: rewriteSuggestions.slice(0, 12),
    perSectionSuggestions,
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

  const systemPrompt = [
    "You are an ATS resume analyzer and resume-writing coach.",
    "Return JSON only (no markdown).",
    "Hard rules:",
    "- Do NOT invent experience, tools, employers, degrees, or metrics.",
    "- Only suggest keywords if they plausibly fit; if uncertain, ask a question.",
    "- Suggestions should be copy-paste ready and ATS-friendly.",
  ].join("\n");

  const userPrompt = JSON.stringify({
    task: "Extract key JD keywords and propose concrete improvements to increase ATS score.",
    targetRole,
    jobDescription,
    existingKeywords: job.data.keywords,
    previousScore: job.data.previousOverallScore ?? null,
    resumeText: resumeSnippet,
    outputShape: {
      jdKeywords: ["..."],
      rewriteSuggestions: [
        {
          id: "ai-ats-1",
          originalText: "...",
          suggestionText: "...",
          reason: "...",
          impact: "low|medium|high",
          path: "optional"
        },
      ],
      questionsForUser: ["..."],
      perSectionSuggestions: {
        summary: ["..."],
        experience: ["..."],
        skills: ["..."],
        education: ["..."],
        projects: ["..."],
        certifications: ["..."],
        languages: ["..."],
      },
    },
    guidance: [
      "If a section seems missing/empty (e.g., summary too short, no projects, no skills categories), include a rewriteSuggestion that contains a template the user can add.",
      "Return suggestions grouped by section where possible in `perSectionSuggestions` and ensure each `rewriteSuggestions` item includes a `path` that identifies the target field (e.g., personalInfo.summary or sections.experience[0].bullets[1]).",
      "For weak experience bullets, rewrite 1-2 bullets using strong action verbs and JD keywords (without adding new facts).",
      "Provide jdKeywords as 15-30 ATS keywords/phrases from the job description (tools, skills, role terms, methodologies).",
    ],
  });

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

      const rewriteSuggestions: AiSuggestion[] = Array.from(suggestionById.values()).slice(0, 20);

      const report: AtsAnalysisReport = {
        ...base,
        // preserve previous score reported when job was queued
        // (job.data.previousOverallScore is attached by controller when available)
        // store as a plain number field on the persisted document
        ...(job.data.previousOverallScore !== undefined ? { previousOverallScore: job.data.previousOverallScore } : {}),
        targetKeywords: mergedKeywords,
        matchScore: keywordResult.matchScore,
        keywordAnalysis: keywordResult.analysis,
        sectionScores: {
          ...base.sectionScores,
          ...sectionScores,
        },
        overallScore: sectionScores.overall,
        rewriteSuggestions,
        perSectionSuggestions,
        summary: buildReportSummary(job.data.jobTitle, sectionScores.overall, keywordResult.matchScore, keywordResult.analysis.missingKeywords),
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
        summary: report.summary,
        analyzedAt: new Date(report.analyzedAt ?? new Date().toISOString()),
        lastError: "",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

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

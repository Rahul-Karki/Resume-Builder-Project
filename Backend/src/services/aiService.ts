import crypto from "crypto";
import { env } from "../config/env";
import { logger } from "../observability";
import AiUsage from "../models/AiUsage";
import {
  clampScore,
  compactText,
  createSuggestionId,
  normalizeTone,
  sliceText,
  type AiGrammarResult,
  type AiRewriteResult,
  type AiTone,
  type AtsAnalysisReport,
  type AtsFormattingCheck,
  type AtsGrammarFinding,
  type AtsKeywordAnalysis,
  type AtsScoreBreakdown,
} from "../../../shared/src/ai";
import { countOpenAITokens, countGeminiTokens } from "../utils/tokenCounter";

type AiPromptContext = {
  text: string;
  section: string;
  tone?: string;
  context?: string;
  targetRole?: string;
  userId?: string;
  variationSeed?: string;
};

type AtsPromptContext = {
  resume: Record<string, unknown>;
  jobTitle?: string;
  jobDescription?: string;
  keywords: string[];
  tone?: string;
  reportType?: AtsAnalysisReport["reportType"];
  userId?: string;
};

export type StructuredAiMetadata = {
  _tokens?: { input: number; output: number };
  _provider?: "openai" | "gemini" | "none" | "unknown";
  _model?: string;
  _fallback?: boolean;
};

export type StructuredAiResult<T extends Record<string, unknown>> = T & StructuredAiMetadata;

const ACTION_VERBS = [
  "built",
  "designed",
  "led",
  "implemented",
  "optimized",
  "improved",
  "launched",
  "created",
  "managed",
  "delivered",
  "automated",
  "developed",
  "scaled",
  "reduced",
  "increased",
  "collaborated",
  "architected",
  "streamlined",
];

const WEAK_PHRASES = ["worked on", "helped with", "responsible for", "involved in", "assisted with", "did"];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeList = (value: unknown) => String(value ?? "")
  .split(/[\n,]/)
  .map((item) => compactText(item).toLowerCase())
  .filter(Boolean);

const getResumeSections = (resume: Record<string, unknown>) => ({
  summary: compactText((resume.personalInfo as Record<string, unknown> | undefined)?.summary),
  experience: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.experience)
    ? ((resume.sections as Record<string, unknown>).experience as Array<Record<string, unknown>>)
    : [],
  education: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.education)
    ? ((resume.sections as Record<string, unknown>).education as Array<Record<string, unknown>>)
    : [],
  skills: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.skills)
    ? ((resume.sections as Record<string, unknown>).skills as Array<Record<string, unknown>>)
    : [],
  projects: Array.isArray((resume.sections as Record<string, unknown> | undefined)?.projects)
    ? ((resume.sections as Record<string, unknown>).projects as Array<Record<string, unknown>>)
    : [],
});

const actionVerbScore = (text: string) => {
  const firstWord = compactText(text).split(/\s+/)[0]?.toLowerCase() ?? "";
  return ACTION_VERBS.includes(firstWord);
};

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla|throughput|users|requests)\b/i.test(text);

const buildGrammarFallback = (text: string): AiGrammarResult => {
  const issues: AiGrammarResult["issues"] = [];
  const originalText = compactText(text);

  if (!originalText) {
    return { issues, correctedText: "" };
  }

  const typoMap: Array<[RegExp, string, string]> = [
    [/\bexperiance\b/i, "Experience", "Corrected a common spelling error."],
    [/\bmanagment\b/i, "management", "Corrected a common spelling error."],
    [/\bteh\b/i, "the", "Corrected a typo."],
  ];

  let correctedText = originalText;

  typoMap.forEach(([pattern, replacement, reason], index) => {
    if (pattern.test(correctedText)) {
      correctedText = correctedText.replace(pattern, replacement);
      issues.push({
        id: createSuggestionId("grammar", index),
        originalText,
        suggestionText: correctedText,
        reason,
        severity: "medium",
      });
    }
  });

  if (correctedText && correctedText === originalText) {
    const capitalized = correctedText.charAt(0).toUpperCase() + correctedText.slice(1);
    if (capitalized !== correctedText) {
      correctedText = capitalized;
      issues.push({
        id: createSuggestionId("grammar", issues.length),
        originalText,
        suggestionText: correctedText,
        reason: "Improved sentence capitalization.",
        severity: "low",
      });
    }
  }

  return { issues, correctedText };
};

const buildRewriteFallback = (context: AiPromptContext): AiRewriteResult => {
  const text = compactText(context.text);
  const tone = normalizeTone(context.tone);
  const lower = text.toLowerCase();
  const targetRole = compactText(context.targetRole);

  const baseVerb = actionVerbScore(text) ? compactText(text).split(/\s+/)[0] : "Developed";
  const cleanRemainder = text.replace(/^\w+\s+/i, "");
  const focusTail = targetRole ? ` aligned with ${targetRole.toLowerCase()}` : "";

  const tonePhrases: Record<AiTone, string> = {
    professional: "delivered measurable outcomes",
    concise: "improved execution",
    technical: "built scalable systems",
    "leadership-focused": "led cross-functional execution",
  };

  const primaryRewrite = `${baseVerb} ${cleanRemainder || "work"} to ${tonePhrases[tone]}${focusTail}.`.replace(/\s+/g, " ").trim();
  const improvedRewrite = primaryRewrite.replace(/^worked on/i, "Developed");

  const suggestions: AiRewriteResult["suggestions"] = [
    {
      id: createSuggestionId("rewrite", 0),
      originalText: text,
      suggestionText: improvedRewrite,
      reason: "Rewritten with stronger action framing and ATS-friendly wording.",
      impact: "high" as const,
    },
  ];

  if (/worked on|helped with|responsible for/i.test(lower)) {
    suggestions.push({
      id: createSuggestionId("rewrite", 1),
      originalText: text,
      suggestionText: `${tone === "concise" ? "Built" : "Designed"} ${cleanRemainder || "a concrete outcome"} with measurable impact.`,
      reason: "Removes weak phrasing and shifts to an action-first style.",
      impact: "medium",
    });
  }

  return {
    suggestions,
    variations: [
      improvedRewrite,
      `${tone === "technical" ? "Engineered" : "Improved"} ${cleanRemainder || "the workflow"} with measurable outcomes.`,
      `${tone === "leadership-focused" ? "Led" : "Delivered"} ${cleanRemainder || "the work"} with clearer scope and business impact.`,
    ],
    summary: "Suggestion generated from the edited section only.",
  };
};

const buildBulletFallback = (context: AiPromptContext): AiRewriteResult => {
  const text = compactText(context.text);
  const verb = actionVerbScore(text) ? compactText(text).split(/\s+/)[0] : "Built";
  const remainder = text.replace(/^\w+\s+/i, "");
  const tone = normalizeTone(context.tone);
  const quantifier = hasMetric(text) ? "" : tone === "concise" ? " while reducing ambiguity" : " resulting in measurable impact";

  const suggestions: AiRewriteResult["suggestions"] = [
    {
      id: createSuggestionId("bullet", 0),
      originalText: text,
      suggestionText: `${verb} ${remainder || "a stronger result"}${quantifier}.`.replace(/\s+/g, " ").trim(),
      reason: "Strengthens the bullet with an action verb and ATS-friendly impact language.",
      impact: "high",
    },
  ];

  return {
    suggestions,
    variations: [
      `${verb} ${remainder || "the deliverable"} and improved team outcomes.`,
      `${tone === "technical" ? "Architected" : "Built"} ${remainder || "the solution"} with scalable execution.`,
    ],
    summary: "Bullet enhanced for stronger ATS readability.",
  };
};

const providerIsConfigured = () => {
  if (env.AI_PROVIDER === "openai") return Boolean(env.OPENAI_API_KEY);
  if (env.AI_PROVIDER === "gemini") return Boolean(env.GEMINI_API_KEY);
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY);
};

const withTimeout = async <T>(operation: (signal: AbortSignal) => Promise<T>) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const callOpenAI = async (systemPrompt: string, userPrompt: string) => withTimeout(async (signal) => {
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
});

const callGemini = async (systemPrompt: string, userPrompt: string) => withTimeout(async (signal) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
});

type AiProviderName = "openai" | "gemini";

const getProviderOrder = (preferredProvider?: AiProviderName): AiProviderName[] => {
  const configuredProviders: AiProviderName[] = [];

  if (env.GEMINI_API_KEY) {
    configuredProviders.push("gemini");
  }

  if (env.OPENAI_API_KEY) {
    configuredProviders.push("openai");
  }

  if (preferredProvider) {
    return [preferredProvider, ...configuredProviders.filter((provider) => provider !== preferredProvider)];
  }

  if (env.AI_PROVIDER === "openai") {
    return env.OPENAI_API_KEY ? ["openai", ...configuredProviders.filter((provider) => provider !== "openai")] : configuredProviders;
  }

  if (env.AI_PROVIDER === "gemini") {
    return env.GEMINI_API_KEY ? ["gemini", ...configuredProviders.filter((provider) => provider !== "gemini")] : configuredProviders;
  }

  return configuredProviders;
};

const callProvider = async (provider: AiProviderName, systemPrompt: string, userPrompt: string) => {
  const raw = provider === "openai"
    ? await callOpenAI(systemPrompt, userPrompt)
    : await callGemini(systemPrompt, userPrompt);

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const tokenCount = provider === "openai"
    ? countOpenAITokens(systemPrompt, userPrompt, cleaned)
    : countGeminiTokens(systemPrompt, userPrompt, cleaned);

  const model = provider === "openai" ? env.OPENAI_MODEL : env.GEMINI_MODEL;

  return {
    parsed,
    tokenCount,
    model,
  };
};

// Calculate cost in USD based on provider and token usage
const calculateCost = (provider: "openai" | "gemini", model: string, inputTokens: number, outputTokens: number): number => {
  if (provider === "openai") {
    // OpenAI pricing as of 2024
    const isGpt4o = !model.includes("gpt-4o-mini");
    if (isGpt4o) {
      // gpt-4o: $5/M input, $15/M output
      return (inputTokens * 5 / 1_000_000) + (outputTokens * 15 / 1_000_000);
    } else {
      // gpt-4o-mini: $0.15/M input, $0.60/M output
      return (inputTokens * 0.15 / 1_000_000) + (outputTokens * 0.60 / 1_000_000);
    }
  }

  if (provider === "gemini") {
    // Gemini pricing as of 2024
    // gemini-2.0-flash: $0.075/M input, $0.30/M output
    return (inputTokens * 0.075 / 1_000_000) + (outputTokens * 0.30 / 1_000_000);
  }

  return 0;
};

// Log AI usage to database
const logAiUsage = async (
  provider: "openai" | "gemini" | "fallback",
  model: string,
  feature: "grammar" | "rewrite" | "ats-analysis" | "ats-jd-match",
  inputTokens: number,
  outputTokens: number,
  userId?: string,
  isFallback: boolean = false,
  success: boolean = true
) => {
  try {
    if (!userId || userId === "unknown") return; // Skip logging for unauthenticated users

    const costUsd = provider !== "fallback" ? calculateCost(provider, model, inputTokens, outputTokens) : 0;

    await AiUsage.create({
      userId,
      provider,
      modelName: model,
      feature,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd,
      fallback: isFallback,
      success,
    });

    logger.debug(
      {
        userId,
        provider,
        modelName: model,
        feature,
        inputTokens,
        outputTokens,
        costUsd: costUsd.toFixed(6),
      },
      "AI usage logged"
    );
  } catch (error) {
    logger.warn({ error, feature }, "Failed to log AI usage");
  }
};

const runStructuredAi = async <T extends Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string,
  fallback: T,
  provider?: AiProviderName,
  featureName?: "grammar" | "rewrite" | "ats-analysis" | "ats-jd-match",
  userId?: string
): Promise<StructuredAiResult<T>> => {
  const providerOrder = getProviderOrder(provider);
  const feature = featureName ?? "rewrite";

  if (providerOrder.length === 0) {
    await logAiUsage("fallback", "fallback", feature, 0, 0, userId, true, true);
    return {
      ...fallback,
      _tokens: { input: 0, output: 0 },
      _provider: "none",
      _model: "fallback",
      _fallback: true,
    };
  }

  let lastError: unknown;

  for (const selectedProvider of providerOrder) {
    try {
      const { parsed, tokenCount, model } = await callProvider(selectedProvider, systemPrompt, userPrompt);

      await logAiUsage(selectedProvider, model, feature, tokenCount.input, tokenCount.output, userId, false, true);

      return {
        ...parsed as T,
        _tokens: { input: tokenCount.input, output: tokenCount.output },
        _provider: selectedProvider,
        _model: model,
        _fallback: false,
      };
    } catch (error) {
      lastError = error;
      logger.warn({ error, provider: selectedProvider }, "AI provider request failed; trying next provider if available");
      await logAiUsage(selectedProvider, "", feature, 0, 0, userId, false, false);
    }
  }

  const fallbackProvider: AiProviderName = providerOrder[providerOrder.length - 1] ?? (provider || "gemini") as AiProviderName;
  const tokenCount = fallbackProvider === "openai"
    ? countOpenAITokens(systemPrompt, userPrompt, "")
    : countGeminiTokens(systemPrompt, userPrompt, "");

  await logAiUsage(fallbackProvider, "", feature, tokenCount.input, tokenCount.output, userId, true, false);

  logger.warn({ error: lastError, provider: fallbackProvider }, "All AI providers failed; falling back to deterministic suggestions");
  return {
    ...fallback,
    _tokens: { input: tokenCount.input, output: tokenCount.output },
    _provider: fallbackProvider,
    _model: "unknown",
    _fallback: true,
  }
};

export const improveText = async (context: AiPromptContext): Promise<StructuredAiResult<AiRewriteResult>> => {
  const fallback = buildRewriteFallback(context);
  const userPrompt = JSON.stringify({
    task: "Improve a resume section to be clearer, more ATS-friendly, and professionally written WITHOUT adding new facts.",
    tone: normalizeTone(context.tone),
    section: context.section,
    text: sliceText(context.text, 2500),
    context: sliceText(context.context, 1000),
    targetRole: sliceText(context.targetRole, 160),
    variationSeed: sliceText(context.variationSeed, 60),
    outputShape: {
      suggestions: [
        {
          id: "string",
          originalText: "original text exactly as provided",
          suggestionText: "copy-paste-ready rewrite",
          reason: "short explanation of why this is better",
          impact: "low|medium|high",
        },
      ],
      variations: ["2-4 alternate rewrites"],
      summary: "one sentence describing the improvement",
    },
    guidance: [
      "If the text is too generic, make it specific using the role/title/context already present in the input.",
      "If the section is a summary, add role, years of experience if mentioned, 2-4 core skills, and one outcome if present.",
      "If the section is experience or projects, keep the same facts but rewrite with stronger verbs and measurable outcomes.",
      "If the section looks empty or placeholder-like, return a short fill-in template plus a realistic example based on the resume text.",
    ],
  });

  return runStructuredAi<AiRewriteResult>(
    [
      "You are a senior resume writing assistant.",
      "Return JSON only with keys: suggestions (array), variations (array), summary (string).",
      "Each suggestions[i] MUST be an object: {id, originalText, suggestionText, reason, impact}.",
      "Hard rules:",
      "- Do NOT invent experience, tools, employers, degrees, achievements, or numbers.",
      "- Preserve all numbers, dates, company names, job titles, proper nouns, and acronyms unless the user text is clearly wrong (then only fix obvious spelling).",
      "- NEVER modify or rewrite personal identifiers: name, email, phone, location, URLs/links (LinkedIn/GitHub/portfolio), or usernames/handles.",
      "- If the input contains an email/URL/phone, keep it exactly unchanged in suggestionText.",
      "- Keep meaning the same; improve clarity, grammar, and ATS keyword alignment where appropriate.",
      "- Prefer active voice, strong verbs, and concise phrasing.",
      "- If the input is a summary, return the strongest version as suggestionText and make the variations meaningfully different (not just synonym swaps).",
      "- If the input is a weak bullet, include impact, scope, or outcome only when it already exists or can be rephrased from the text.",
      "- Do not include markdown, backticks, or commentary outside JSON.",
      "Quality bar:",
      "- suggestions: 1-3 high-quality alternatives; variations: 2-4 short variants; summary: one sentence describing what improved.",
    ].join("\n"),
    userPrompt,
    fallback,
    undefined,
    "rewrite",
    context.userId,
  );
};

export const checkGrammar = async (context: AiPromptContext): Promise<StructuredAiResult<AiGrammarResult>> => {
  const fallback = buildGrammarFallback(context.text);
  const userPrompt = JSON.stringify({
    task: "Check grammar and spelling in this resume text. Return JSON only. Do not rewrite content beyond grammar/spelling fixes.",
    section: context.section,
    text: sliceText(context.text, 2500),
    context: sliceText(context.context, 1000),
    variationSeed: sliceText(context.variationSeed, 60),
    outputShape: {
      issues: [
        {
          id: "string",
          originalText: "exact problem text",
          suggestionText: "corrected text only",
          reason: "brief grammar/spelling reason",
          severity: "low|medium|high",
        },
      ],
      correctedText: "fully corrected text using only grammar/spelling fixes",
    },
    guidance: [
      "Keep the tone and meaning intact.",
      "If the input is just a short label, single word, email, or URL, return no issues and keep correctedText identical.",
      "Do not over-correct domain terms, company names, acronyms, or code names.",
    ],
  });

  return runStructuredAi<AiGrammarResult>(
    [
      "You are a strict grammar and spelling checker for resumes.",
      "Return JSON only with keys: issues (array), correctedText (string).",
      "Each issues[i] MUST be an object: {id, originalText, suggestionText, reason, severity}.",
      "Hard rules:",
      "- Only fix grammar, spelling, punctuation, and casing. Do NOT change meaning.",
      "- Preserve proper nouns, company names, tech terms, acronyms, and formatting such as bullet-like fragments.",
      "- NEVER change emails, phone numbers, URLs, or usernames/handles. Keep them exactly as-is.",
      "- If the text is just a single word/phrase (e.g., a language name like 'English') or is an email/URL, return issues: [] and correctedText identical.",
      "- Do not add or remove metrics, dates, or claims.",
      "- If nothing is wrong, return issues: [] and correctedText equal to the original text.",
      "- Do not output markdown or non-JSON content.",
    ].join("\n"),
    userPrompt,
    fallback,
    undefined,
    "grammar",
    context.userId,
  );
};

export const enhanceBullet = async (context: AiPromptContext): Promise<StructuredAiResult<AiRewriteResult>> => {
  const fallback = buildBulletFallback(context);
  const userPrompt = JSON.stringify({
    task: "Rewrite a single resume bullet to be stronger, concise, and ATS-friendly WITHOUT adding new facts.",
    tone: normalizeTone(context.tone),
    section: context.section,
    text: sliceText(context.text, 2000),
    context: sliceText(context.context, 1000),
    variationSeed: sliceText(context.variationSeed, 60),
    outputShape: {
      suggestions: [
        {
          id: "string",
          originalText: "exact original bullet",
          suggestionText: "single bullet rewrite",
          reason: "what changed and why it is stronger",
          impact: "low|medium|high",
        },
      ],
      variations: ["2-4 alternate bullets with different emphasis"],
      summary: "one sentence describing the improvement",
    },
    guidance: [
      "Use a strong action verb at the start.",
      "If the original bullet has metrics, preserve them exactly.",
      "If the original bullet lacks metrics, do not invent them; instead strengthen the scope, tools, or outcome already implied.",
      "Prefer one sentence per suggestion and keep it resume-ready.",
    ],
  });

  return runStructuredAi<AiRewriteResult>(
    [
      "You are a senior resume writer.",
      "Return JSON only with keys: suggestions (array), variations (array), summary (string).",
      "Each suggestions[i] MUST be an object: {id, originalText, suggestionText, reason, impact}.",
      "Hard rules:",
      "- Keep it one bullet (no multiple bullets, no paragraphs).",
      "- Do NOT add new tools, metrics, dates, certifications, or achievements not present in the input.",
      "- Preserve all numbers and units exactly (%, $, time, counts).",
      "- Remove weak phrasing (worked on/helped/responsible for) when possible without changing meaning.",
      "- Prefer: Action verb + what + how + measurable impact (only if impact exists in input).",
      "- If the bullet is already strong, make only small improvements for clarity and ATS keywords.",
      "- Do not mention personal contact info; keep any URLs/emails unchanged if present.",
      "- Do not output markdown or non-JSON.",
    ].join("\n"),
    userPrompt,
    fallback,
    undefined,
    "rewrite",
    context.userId,
  );
};

const getSectionText = (resume: Record<string, unknown>) => {
  const sections = getResumeSections(resume);
  const experienceText = sections.experience.flatMap((entry) => [
    compactText(entry.role),
    compactText(entry.company),
    ...(Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []),
    compactText(entry.description),
  ]);
  const projectText = sections.projects.flatMap((entry) => [
    compactText(entry.name),
    ...(Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []),
    compactText(entry.description),
    compactText(entry.tech),
  ]);
  const skillsText = sections.skills.flatMap((entry) => [compactText(entry.category), ...(Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)) : [])]);

  return [sections.summary, ...experienceText, ...projectText, ...skillsText].filter(Boolean).join(" ");
};

const extractKeywords = (resume: Record<string, unknown>, keywords: string[]) => {
  const corpus = getSectionText(resume).toLowerCase();
  const normalized = Array.from(new Set(keywords.map((keyword) => compactText(keyword).toLowerCase()).filter(Boolean)));

  const matchedKeywords = normalized.filter((keyword) => new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(corpus));
  const missingKeywords = normalized.filter((keyword) => !matchedKeywords.includes(keyword));

  const keywordHits = normalized.flatMap((keyword) => corpus.match(new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi")) ?? []);
  const repeatedKeywords = normalized.filter((keyword) => (keywordHits.filter((hit) => hit.toLowerCase() === keyword).length > 1));

  return { matchedKeywords, missingKeywords, repeatedKeywords };
};

const computeSectionScores = (resume: Record<string, unknown>): AtsScoreBreakdown => {
  const sections = getResumeSections(resume);
  const summaryScore = clampScore((sections.summary.length / 180) * 100);

  const experienceBullets = sections.experience.flatMap((entry) => Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []);
  const strongBullets = experienceBullets.filter((bullet) => actionVerbScore(bullet) && hasMetric(bullet)).length;
  const experienceScore = experienceBullets.length === 0 ? 25 : clampScore((strongBullets / Math.max(1, experienceBullets.length)) * 100);

  const skillCount = sections.skills.reduce((count, entry) => count + (Array.isArray(entry.items) ? entry.items.length : 0), 0);
  const skillsScore = clampScore((sections.skills.length > 0 ? 45 : 0) + Math.min(skillCount * 4, 55));

  const educationScore = sections.education.length > 0 ? 80 : 45;
  const projectsScore = sections.projects.length > 0 ? clampScore(50 + sections.projects.length * 10) : 30;

  const hasName = compactText((resume.personalInfo as Record<string, unknown> | undefined)?.name).length > 0;
  const hasEmail = compactText((resume.personalInfo as Record<string, unknown> | undefined)?.email).length > 0;
  const hasPhone = compactText((resume.personalInfo as Record<string, unknown> | undefined)?.phone).length > 0;
  const hasLocation = compactText((resume.personalInfo as Record<string, unknown> | undefined)?.location).length > 0;
  const formattingScore = clampScore((hasName ? 25 : 0) + (hasEmail ? 20 : 0) + (hasPhone ? 15 : 0) + (hasLocation ? 10 : 0) + (sections.summary.length > 60 ? 30 : 10));

  return {
    summary: summaryScore,
    experience: experienceScore,
    skills: skillsScore,
    education: educationScore,
    formatting: formattingScore,
    projects: projectsScore,
  };
};

const computeFormattingChecks = (resume: Record<string, unknown>): AtsFormattingCheck[] => {
  const sections = getResumeSections(resume);
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  const checks: AtsFormattingCheck[] = [
    {
      id: "contact-info",
      label: "Contact information present",
      passed: Boolean(compactText(personal.name) && compactText(personal.email)),
      score: Boolean(compactText(personal.name) && compactText(personal.email)) ? 100 : 40,
      reason: "Recruiters and ATS parsers need a clear name and email.",
    },
    {
      id: "summary-length",
      label: "Summary length is balanced",
      passed: sections.summary.length >= 80 && sections.summary.length <= 500,
      score: sections.summary.length === 0 ? 20 : sections.summary.length < 80 ? 45 : sections.summary.length > 500 ? 65 : 100,
      reason: "A concise but substantive summary improves scanability.",
    },
    {
      id: "section-completeness",
      label: "Core sections present",
      passed: sections.experience.length > 0 && sections.skills.length > 0,
      score: clampScore((sections.experience.length > 0 ? 50 : 15) + (sections.skills.length > 0 ? 50 : 15)),
      reason: "Experience and skills should be populated before applying.",
    },
    {
      id: "resume-density",
      label: "Resume content density",
      passed: (sections.experience.length + sections.projects.length + sections.skills.length) >= 3,
      score: clampScore((sections.experience.length + sections.projects.length + sections.skills.length) * 20),
      reason: "Balanced content distribution helps ATS and recruiter review.",
    },
  ];

  return checks;
};

const buildGrammarFindings = (resume: Record<string, unknown>): AtsGrammarFinding[] => {
  const sections = getResumeSections(resume);
  const findings: AtsGrammarFinding[] = [];

  sections.experience.forEach((entry, expIndex) => {
    const bullets = Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : [];
    bullets.forEach((bullet, bulletIndex) => {
      if (!bullet) return;
      const firstWord = bullet.split(/\s+/)[0]?.toLowerCase() ?? "";
      if (!ACTION_VERBS.includes(firstWord) || !hasMetric(bullet) || /worked on|helped with|responsible for/i.test(bullet)) {
        findings.push({
          id: `grammar-${expIndex}-${bulletIndex}`,
          path: `sections.experience[${expIndex}].bullets[${bulletIndex}]`,
          originalText: bullet,
          suggestionText: `${ACTION_VERBS.includes(firstWord) ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1) : "Built"} ${bullet.replace(/^\w+\s+/i, "").replace(/\.$/, "")} with a measurable outcome.`,
          reason: "Use an action verb and add measurable impact.",
          severity: "medium",
        });
      }
    });
  });

  return findings.slice(0, 12);
};

const buildKeywordAnalysis = (resume: Record<string, unknown>, keywords: string[]): AtsKeywordAnalysis => {
  const { matchedKeywords, missingKeywords, repeatedKeywords } = extractKeywords(resume, keywords);
  const atsFriendlyKeywords = matchedKeywords.filter((keyword) => keyword.length > 2);
  const weakKeywords = keywords.filter((keyword) => /\b(worked|helped|stuff|thing|various|misc)\b/i.test(keyword));

  return {
    missingKeywords,
    repeatedKeywords,
    weakKeywords,
    atsFriendlyKeywords,
    matchedKeywords,
  };
};

const buildSummary = (jobTitle: string | undefined, score: number, matchScore: number, missingKeywords: string[]) => {
  const role = compactText(jobTitle) || "resume";
  const keywordText = missingKeywords.length > 0 ? ` Missing keywords include ${missingKeywords.slice(0, 6).join(", ")}.` : "";
  return `${role} currently scores ${score}/100 with a ${matchScore}% match.${keywordText}`;
};

const buildFallbackAtsReport = (context: AtsPromptContext): AtsAnalysisReport => {
  const sectionScores = computeSectionScores(context.resume);
  const keywordAnalysis = buildKeywordAnalysis(context.resume, context.keywords);
  const formattingChecks = computeFormattingChecks(context.resume);
  const grammarIssues = buildGrammarFindings(context.resume);
  const keywordPenalty = keywordAnalysis.missingKeywords.length === 0
    ? 18
    : Math.max(0, 18 - keywordAnalysis.missingKeywords.length * 2);
  const scoreOverall = clampScore(
    sectionScores.summary * 0.16
      + sectionScores.experience * 0.28
      + sectionScores.skills * 0.2
      + sectionScores.education * 0.08
      + sectionScores.projects * 0.08
      + sectionScores.formatting * 0.12
      + keywordPenalty,
  );
  const matchScore = clampScore(keywordAnalysis.matchedKeywords.length === 0 && context.keywords.length > 0
    ? 30
    : (keywordAnalysis.matchedKeywords.length / Math.max(1, context.keywords.length)) * 100);

  const rewriteSuggestions = grammarIssues.slice(0, 10).map((issue, index) => ({
    id: `ats-rewrite-${index + 1}`,
    originalText: issue.originalText,
    suggestionText: issue.suggestionText,
    reason: issue.reason,
    impact: issue.severity,
    path: issue.path,
  }));

  return {
    status: "completed",
    reportType: context.reportType ?? (context.jobDescription ? "job-description-match" : "resume-analysis"),
    jobTitle: compactText(context.jobTitle),
    jobDescription: compactText(context.jobDescription),
    targetKeywords: Array.from(new Set(context.keywords.map((keyword) => compactText(keyword)).filter(Boolean))),
    overallScore: scoreOverall,
    matchScore,
    sectionScores,
    keywordAnalysis,
    grammarIssues,
    formattingChecks,
    rewriteSuggestions,
    summary: buildSummary(context.jobTitle, scoreOverall, matchScore, keywordAnalysis.missingKeywords),
  };
};

const buildAtsPromptPayload = (context: AtsPromptContext) => ({
  task: "Score a resume for ATS quality and job match. Return JSON only.",
  jobTitle: context.jobTitle,
  jobDescription: sliceText(context.jobDescription, 5000),
  keywords: context.keywords,
  tone: normalizeTone(context.tone),
  reportType: context.reportType ?? "resume-analysis",
  resume: context.resume,
  outputShape: {
    status: "completed",
    reportType: "resume-analysis",
    jobTitle: "...",
    jobDescription: "...",
    targetKeywords: ["..."],
    overallScore: 0,
    matchScore: 0,
    sectionScores: {
      summary: 0,
      experience: 0,
      skills: 0,
      education: 0,
      formatting: 0,
      projects: 0,
    },
    keywordAnalysis: {
      missingKeywords: ["..."],
      repeatedKeywords: ["..."],
      weakKeywords: ["..."],
      atsFriendlyKeywords: ["..."],
      matchedKeywords: ["..."],
    },
    grammarIssues: ["..."],
    formattingChecks: ["..."],
    rewriteSuggestions: ["..."],
    summary: "...",
  },
  guidance: [
    "If a section is empty or missing, use rewriteSuggestions to provide a copy-paste template the user can add.",
    "If a section is weak, use rewriteSuggestions to show before/after text grounded in the resume.",
    "Prioritize exact JD keywords and the most obvious adjacent skills from the resume; do not invent buzzwords.",
    "Make the summary sentence actionable: explain what to change first, not just what is wrong.",
    "Keep the summary short but specific so it can be shown directly in the UI.",
  ],
});

export const analyzeResumeForAts = async (context: AtsPromptContext & { jobId?: string; resumeId?: string }): Promise<AtsAnalysisReport> => {
  const fallback = buildFallbackAtsReport(context);
  const userPrompt = JSON.stringify(buildAtsPromptPayload(context));

  const structured = await runStructuredAi<AtsAnalysisReport>(
    [
      "You are an ATS resume analyzer.",
      "Return JSON only and follow the requested outputShape.",
      "Hard rules:",
      "- Base scores strictly on the provided resume content and keyword evidence.",
      "- Do NOT invent missing sections, employers, education, skills, or achievements.",
      "- grammarIssues and rewriteSuggestions must reference only text that exists in the resume payload.",
      "- When suggesting keywords, prefer the provided keywords list; do not add unrelated buzzwords.",
      "- If the resume is missing a section, treat that as a major weakness and provide a template-style rewriteSuggestion for it.",
      "- If the resume has weak bullets, rewrite only the worst 1-3 bullets and make each one more specific and measurable without changing facts.",
      "- Include the most useful missing keywords in the summary and rewrite suggestions, not only in the keyword lists.",
      "Quality bar:",
      "- Provide actionable, specific suggestions (what to change + where) without fabricating facts.",
    ].join("\n"),
    userPrompt,
    fallback,
    undefined,
    "ats-analysis",
    context.userId,
  );

  return {
    ...fallback,
    ...structured,
    jobId: context.jobId,
    resumeId: context.resumeId,
    status: structured.status ?? fallback.status,
    reportType: structured.reportType ?? fallback.reportType,
    analyzedAt: new Date().toISOString(),
    targetKeywords: Array.from(new Set((structured.targetKeywords ?? fallback.targetKeywords).map((keyword) => compactText(keyword)).filter(Boolean))),
    keywordAnalysis: structured.keywordAnalysis ?? fallback.keywordAnalysis,
    sectionScores: structured.sectionScores ?? fallback.sectionScores,
    formattingChecks: structured.formattingChecks ?? fallback.formattingChecks,
    grammarIssues: structured.grammarIssues ?? fallback.grammarIssues,
    rewriteSuggestions: structured.rewriteSuggestions ?? fallback.rewriteSuggestions,
    summary: compactText(structured.summary) || fallback.summary,
    overallScore: clampScore(Number(structured.overallScore ?? fallback.overallScore)),
    matchScore: clampScore(Number(structured.matchScore ?? fallback.matchScore)),
  };
};

export const fingerprintText = (value: unknown) => crypto.createHash("sha1").update(compactText(value)).digest("hex");

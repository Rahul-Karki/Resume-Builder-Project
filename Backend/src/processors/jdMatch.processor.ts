import { compactText, type AtsKeywordAnalysis } from "../../../shared/src/ai";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getResumeCorpus = (resume: Record<string, unknown>) => {
  const personal = (resume.personalInfo as Record<string, unknown> | undefined) ?? {};
  const sections = (resume.sections as Record<string, unknown> | undefined) ?? {};
  const experience = Array.isArray(sections.experience) ? sections.experience as Array<Record<string, unknown>> : [];
  const skills = Array.isArray(sections.skills) ? sections.skills as Array<Record<string, unknown>> : [];
  const projects = Array.isArray(sections.projects) ? sections.projects as Array<Record<string, unknown>> : [];

  return [
    compactText(personal.summary),
    ...experience.flatMap((entry) => [
      compactText(entry.role),
      compactText(entry.company),
      ...(Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : []),
    ]),
    ...skills.flatMap((entry) => [compactText(entry.category), ...(Array.isArray(entry.items) ? entry.items.map((item) => compactText(item)) : [])]),
    ...projects.flatMap((entry) => [compactText(entry.name), compactText(entry.tech), ...(Array.isArray(entry.bullets) ? entry.bullets.map((bullet) => compactText(bullet)) : [])]),
  ].filter(Boolean).join(" ").toLowerCase();
};

export const analyzeKeywordMatch = (resume: Record<string, unknown>, keywords: string[], jobDescription?: string): {
  analysis: AtsKeywordAnalysis;
  matchScore: number;
  matchedKeywordCount: number;
} => {
  const corpus = getResumeCorpus(resume);
  const normalizedKeywords = Array.from(new Set(keywords.map((keyword) => compactText(keyword).toLowerCase()).filter(Boolean)));
  const jobDescriptionKeywords = compactText(jobDescription)
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 6)
    .slice(0, 15);

  const combined = Array.from(new Set([...normalizedKeywords, ...jobDescriptionKeywords]));

  const matchedKeywords = combined.filter((keyword) => new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(corpus));
  const missingKeywordStrings = combined.filter((keyword) => !matchedKeywords.includes(keyword));
  const missingKeywords = missingKeywordStrings.map((keyword) => ({
    keyword,
    importance: (keyword.length > 8 ? "critical" : keyword.length > 5 ? "important" : "optional") as "critical" | "important" | "optional",
    reason: `Missing ${keyword} — add to skills or experience section`,
  }));
  const repeatedKeywords = combined.filter((keyword) => (corpus.match(new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi")) ?? []).length > 1);
  const weakKeywords = combined.filter((keyword) => /\b(worked|helped|stuff|thing|various|misc)\b/i.test(keyword));
  const atsFriendlyKeywords = matchedKeywords.filter((keyword) => keyword.length > 2);

  const matchScore = combined.length === 0 ? 0 : Math.round((matchedKeywords.length / combined.length) * 100);

  return {
    analysis: {
      missingKeywords,
      repeatedKeywords,
      weakKeywords,
      atsFriendlyKeywords,
      matchedKeywords,
    },
    matchScore,
    matchedKeywordCount: matchedKeywords.length,
  };
};
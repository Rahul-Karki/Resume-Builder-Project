import type { Job } from "bullmq";
import type { AtsAnalysisJobData } from "../../../shared/src/bullmq";
import { logger } from "../observability";
import AtsAnalysis from "../models/AtsAnalysis";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla)\b/i.test(text);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getRoleKeywords = (jobTitle = "") => {
  const lower = jobTitle.toLowerCase();
  if (lower.includes("frontend")) {
    return ["react", "typescript", "accessibility", "performance", "responsive"];
  }
  if (lower.includes("backend")) {
    return ["node", "api", "mongodb", "scalability", "testing"];
  }
  if (lower.includes("product")) {
    return ["roadmap", "stakeholders", "kpi", "experimentation", "execution"];
  }
  return ["impact", "collaboration", "results", "ownership", "delivery"];
};

const buildAtsAnalysis = (resume: any, keywords: string[]) => {
  const summary = String(resume.personalInfo?.summary ?? "");
  const experience = Array.isArray(resume.sections?.experience) ? resume.sections.experience : [];
  const skills = Array.isArray(resume.sections?.skills) ? resume.sections.skills : [];
  const education = Array.isArray(resume.sections?.education) ? resume.sections.education : [];

  const corpus = [
    summary,
    ...experience.flatMap((entry: any) => [entry.role, entry.company, ...(entry.bullets ?? [])]),
    ...skills.flatMap((entry: any) => [entry.category, ...(entry.items ?? [])]),
    ...education.flatMap((entry: any) => [entry.institution, entry.degree, entry.field]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const missingKeywords = keywords.filter((keyword) => {
    const regex = new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, "i");
    return !regex.test(corpus);
  });

  const totalBullets = experience.reduce((acc: number, entry: any) => acc + (entry.bullets ?? []).length, 0);
  const strongBullets = experience.reduce((acc: number, entry: any) => {
    const bullets: string[] = entry.bullets ?? [];
    const score = bullets.filter((bullet) => {
      const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      return ACTION_VERBS.has(firstWord) && hasMetric(bullet);
    }).length;
    return acc + score;
  }, 0);

  const keywordCoverageScore = keywords.length === 0
    ? 100
    : Math.round(((keywords.length - missingKeywords.length) / keywords.length) * 100);

  const summaryScore = Math.min(100, Math.round((summary.trim().length / 180) * 100));
  const experienceScore = totalBullets === 0 ? 30 : Math.round((strongBullets / totalBullets) * 100);
  const skillsScore = Math.min(100, (skills.length > 0 ? 40 : 0) + Math.min(60, skills.reduce((a: number, s: any) => a + (s.items?.length ?? 0), 0) * 6));
  const educationScore = education.length > 0 ? 85 : 45;
  const formattingScore = resume.sectionOrder?.length ? 90 : 70;

  const scoreOverall = Math.round(
    (summaryScore * 0.2)
      + (experienceScore * 0.3)
      + (skillsScore * 0.2)
      + (educationScore * 0.1)
      + (keywordCoverageScore * 0.15)
      + (formattingScore * 0.05),
  );

  const rewriteSuggestions: Array<{
    id: string;
    path: string;
    originalText: string;
    suggestionText: string;
    reason: string;
    impact: "low" | "medium" | "high";
  }> = [];

  if (summary.trim().length < 120) {
    rewriteSuggestions.push({
      id: `sum_${Date.now()}`,
      path: "personalInfo.summary",
      originalText: summary,
      suggestionText: `${summary.trim()} Focus on quantified outcomes, core domain strengths, and role-relevant keywords.`,
      reason: "Summary is short for ATS relevance and recruiter scanability.",
      impact: "high",
    });
  }

  experience.forEach((entry: any, expIndex: number) => {
    const bullets: string[] = entry.bullets ?? [];
    bullets.forEach((bullet, bulletIndex) => {
      const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      const missingVerb = !ACTION_VERBS.has(firstWord);
      const missingNumbers = !hasMetric(bullet);

      if (!missingVerb && !missingNumbers) return;

      const suggestionText = `${missingVerb ? "Led" : firstWord.charAt(0).toUpperCase() + firstWord.slice(1)} ${bullet.replace(/^\w+\s*/i, "")} ${missingNumbers ? "resulting in measurable impact (e.g., 20% improvement)." : ""}`.trim();

      rewriteSuggestions.push({
        id: `exp_${expIndex}_${bulletIndex}`,
        path: `sections.experience[${expIndex}].bullets[${bulletIndex}]`,
        originalText: bullet,
        suggestionText,
        reason: missingVerb
          ? "Start bullets with strong action verbs."
          : "Add metrics to quantify impact.",
        impact: missingNumbers ? "high" : "medium",
      });
    });
  });

  return {
    scoreOverall: Math.max(0, Math.min(100, scoreOverall)),
    sectionScores: {
      summary: summaryScore,
      experience: experienceScore,
      skills: skillsScore,
      education: educationScore,
      formatting: formattingScore,
    },
    missingKeywords,
    rewriteSuggestions: rewriteSuggestions.slice(0, 20),
  };
};

export const processAtsAnalysisJob = async (job: Job<AtsAnalysisJobData>) => {
  const keywords = job.data.keywords.length > 0 ? job.data.keywords : getRoleKeywords(job.data.jobTitle);
  const analysis = buildAtsAnalysis(job.data.resume, keywords);

  const saved = await AtsAnalysis.findOneAndUpdate(
    { resumeId: job.data.resumeId, userId: job.data.userId },
    {
      resumeId: job.data.resumeId,
      userId: job.data.userId,
      ...analysis,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  logger.info({ jobId: job.id, resumeId: job.data.resumeId }, "ATS analysis job completed");
  return saved?.toObject() ?? analysis;
};

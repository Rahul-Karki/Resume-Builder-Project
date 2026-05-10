import type { Job } from "bullmq";
import type { AtsAnalysisJobData } from "../../../shared/src/bullmq";
import { clampScore, compactText, createSuggestionId, type AtsAnalysisReport, type AtsFormattingCheck } from "../../../shared/src/ai";
import { logger } from "../observability";
import AtsAnalysis from "../models/AtsAnalysis";
import { analyzeGrammarIssues } from "./grammarAnalysis.processor";
import { analyzeKeywordMatch } from "./jdMatch.processor";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla|throughput|requests)\b/i.test(text);

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
    jobId: job.data.analysisId,
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
    const report = buildAtsReport(job);

    const saved = await AtsAnalysis.findOneAndUpdate(
      { jobId: job.data.analysisId, userId: job.data.userId },
      {
        jobId: job.data.analysisId,
        resumeId: job.data.resumeId,
        userId: job.data.userId,
        status: "completed",
        reportType: report.reportType,
        jobTitle: report.jobTitle ?? "",
        jobDescription: report.jobDescription ?? "",
        targetKeywords: report.targetKeywords,
        scoreOverall: report.overallScore,
        matchScore: report.matchScore,
        sectionScores: report.sectionScores,
        keywordAnalysis: report.keywordAnalysis,
        grammarIssues: report.grammarIssues,
        formattingChecks: report.formattingChecks,
        rewriteSuggestions: report.rewriteSuggestions,
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
      { jobId: job.data.analysisId, userId: job.data.userId },
      {
        jobId: job.data.analysisId,
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

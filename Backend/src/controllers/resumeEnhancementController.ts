import crypto from "crypto";
import { Request, Response } from "express";
import Resume from "../models/Resume";
import AtsAnalysis from "../models/AtsAnalysis";
import ResumeVersion from "../models/ResumeVersion";
import Template from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";
import { processAtsAnalysisJob } from "../lib/workerShim";
import { createResumeVersion } from "../services/resumeVersionService";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
import { invalidateRedisCache } from "../middleware/redisCache";
import { AuthError, NotFoundError, AppError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import { sendSuccess } from "../utils/apiResponse";
import { compactText } from "../../../shared/src/ai";
import type { AiOperation } from "../utils/creditCalculator";
import { env } from "../config/env";
import { assertAiCreditsAvailable, deductAiCredits, refreshAiCreditsIfNeeded } from "../utils/aiCredits";

const getUserId = (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    sendErrorResponse(res, new AuthError("Unauthorized", { code: "AUTH_REQUIRED" }));
    return null;
  }
  return userId;
};

const getRoleKeywords = (jobTitle = "") => {
  const lower = jobTitle.toLowerCase();
  if (lower.includes("frontend")) return ["react", "typescript", "accessibility", "performance", "responsive"];
  if (lower.includes("backend")) return ["node", "api", "mongodb", "scalability", "testing"];
  if (lower.includes("product")) return ["roadmap", "stakeholders", "kpi", "experimentation", "execution"];
  return ["impact", "collaboration", "results", "ownership", "delivery"];
};

const recordTemplateUsage = async (layoutId: string, type: "create" | "edit") => {
  if (!layoutId) return;
  const template = await Template.findOne({ layoutId }).select("_id").lean();
  if (!template?._id) return;
  await (TemplateUsage as any).recordUse(String(template._id), layoutId, type);
};

const setPathValue = (target: any, path: string, value: string) => {
  if (path === "personalInfo.summary") {
    target.personalInfo = target.personalInfo ?? {};
    target.personalInfo.summary = value;
    return;
  }
  const match = path.match(/^sections\.experience\[(\d+)\]\.bullets\[(\d+)\]$/);
  if (!match) throw new Error("Unsupported suggestion path");
  const expIndex = Number(match[1]);
  const bulletIndex = Number(match[2]);
  if (!target.sections?.experience?.[expIndex]?.bullets?.[bulletIndex]) throw new Error("Suggestion target does not exist");
  target.sections.experience[expIndex].bullets[bulletIndex] = value;
};

const resumeCacheScope = (userId: string) => `resumes-user:${userId}`;

const getSectionCounts = (snapshot: any) => ({
  experience: snapshot?.sections?.experience?.length ?? 0,
  education: snapshot?.sections?.education?.length ?? 0,
  skills: snapshot?.sections?.skills?.length ?? 0,
  projects: snapshot?.sections?.projects?.length ?? 0,
  certifications: snapshot?.sections?.certifications?.length ?? 0,
  languages: snapshot?.sections?.languages?.length ?? 0,
});

export const analyzeAts = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const resume = await Resume.findOne({ _id: req.params.id, userId });
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  // Enforce AI credits before processing
  if (env.AI_CREDITS_ENFORCED) {
    const estimatedCredits = req.creditContext?.estimatedCredits ?? 0;
    await assertAiCreditsAvailable(userId, estimatedCredits);
  }

  const bodyKeywords = Array.isArray(req.body?.keywords)
    ? req.body.keywords.filter((value: unknown) => typeof value === "string").map((value: string) => compactText(value).toLowerCase()).filter(Boolean)
    : [];

  const jobTitle = typeof req.body?.jobTitle === "string" ? req.body.jobTitle : "";
  const jobDescription = typeof req.body?.jobDescription === "string" ? req.body.jobDescription : "";
  const tone = typeof req.body?.tone === "string" ? req.body.tone : undefined;
  const reportType = req.body?.reportType === "job-description-match" ? "job-description-match" : "resume-analysis";
  const keywords = Array.from(new Set([
    ...getRoleKeywords(jobTitle),
    ...bodyKeywords,
    ...(compactText(jobDescription).length > 0 ? compactText(jobDescription).split(/\s+/).filter((word) => word.length > 6).slice(0, 10) : []),
  ]));

  const analysisId = crypto.randomUUID();
  const previousAnalysis = await AtsAnalysis.findOne({ resumeId: resume._id, userId }).sort({ createdAt: -1 }).lean();
  const previousOverallScore = previousAnalysis?.overallScore ?? null;
  const jobId = `ats-${analysisId}`;

  await AtsAnalysis.findOneAndUpdate(
    { jobId, userId },
    {
      jobId, resumeId: resume._id, userId,
      previousOverallScore: previousOverallScore ?? undefined,
      status: "pending", reportType, jobTitle, jobDescription,
      targetKeywords: keywords, overallScore: 0, matchScore: 0,
      sectionScores: { summary: 0, experience: 0, skills: 0, education: 0, formatting: 0, projects: 0 },
      keywordAnalysis: { missingKeywords: keywords.map((k) => ({ keyword: k, importance: "important" as const, reason: `Missing ${k} — add to skills or experience section` })), repeatedKeywords: [], weakKeywords: [], atsFriendlyKeywords: [], matchedKeywords: [] },
      grammarIssues: [], formattingChecks: [], rewriteSuggestions: [],
      summary: "ATS analysis queued.", lastError: "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const job = {
    id: jobId,
    data: {
      analysisId, userId, resumeId: String(resume._id),
      previousOverallScore: previousOverallScore ?? undefined,
      resume: resume.toObject() as unknown as Record<string, unknown>,
      jobTitle, jobDescription, keywords, tone, reportType,
      requestId: req.traceId ?? req.correlationId,
    },
  } as any;

  const analysisResult = await processAtsAnalysisJob(job as any);

  // Deduct credits after successful analysis
  let deducted = 0;
  let creditUser = null;
  if (env.AI_CREDITS_ENFORCED) {
    const estimatedCredits = req.creditContext?.estimatedCredits ?? 0;
    creditUser = await deductAiCredits(userId, estimatedCredits);
    deducted = estimatedCredits;
  } else {
    creditUser = await refreshAiCreditsIfNeeded(userId);
  }

  res.setHeader("x-ai-credits-estimated", String(req.creditContext?.estimatedCredits ?? 0));
  res.setHeader("x-ai-credits-deducted", String(deducted));
  if (creditUser?.aiCreditsRemaining !== undefined) res.setHeader("x-ai-credits-remaining", String(creditUser.aiCreditsRemaining));
  if (creditUser?.aiCreditsResetAt) res.setHeader("x-ai-credits-reset-at", new Date(creditUser.aiCreditsResetAt).toISOString());
  if (creditUser?.aiCreditsPlan) res.setHeader("x-ai-credits-plan", creditUser.aiCreditsPlan);

  logger.info({ userId, resumeId: req.params.id, jobId, creditsDeducted: deducted }, "ATS analysis completed (synchronous)");
  res.status(200).json({ message: "ATS analysis completed", analysis: analysisResult });
}, "resumeEnhancement.analyzeAts");

export const getLatestAtsAnalysis = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const analysis = await AtsAnalysis.findOne({ resumeId: req.params.id, userId }).sort({ createdAt: -1 }).lean();
  if (!analysis) {
    res.status(404).json({ message: "ATS analysis not found" });
    return;
  }

  res.status(200).json({ analysis });
}, "resumeEnhancement.getLatestAtsAnalysis");

export const getAtsAnalysisByJobId = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const analysis = await AtsAnalysis.findOne({ resumeId: req.params.id, userId, jobId: req.params.jobId }).lean();
  if (!analysis) {
    res.status(404).json({ message: "ATS analysis not found" });
    return;
  }

  res.status(200).json({ analysis });
}, "resumeEnhancement.getAtsAnalysisByJobId");

export const applyAtsSuggestion = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { analysisId, suggestionId } = req.body ?? {};

  const analysis = await AtsAnalysis.findOne({ _id: analysisId, userId, resumeId: req.params.id });
  if (!analysis) {
    res.status(404).json({ message: "Analysis not found" });
    return;
  }

  const suggestion = analysis.rewriteSuggestions.find((item) => item.id === suggestionId);
  if (!suggestion) {
    res.status(404).json({ message: "Suggestion not found" });
    return;
  }

  const resume = await Resume.findOne({ _id: req.params.id, userId });
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  const mutable = resume.toObject();
  if (!suggestion.path) {
    res.status(400).json({ message: "Suggestion path is missing" });
    return;
  }

  setPathValue(mutable, suggestion.path, suggestion.suggestionText);

  const updated = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId },
    mutable,
    { returnDocument: 'after', runValidators: true },
  );

  if (!updated) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  await createResumeVersion(updated, "Applied ATS rewrite suggestion");
  await recordTemplateUsage(String(updated.templateId), "edit");
  await invalidateRedisCache([resumeCacheScope(userId)]);

  logger.info({ userId, resumeId: req.params.id, suggestionId }, "ATS suggestion applied");
  res.status(200).json({ message: "Suggestion applied", resume: updated });
}, "resumeEnhancement.applyAtsSuggestion");

export const listResumeVersions = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const resume = await Resume.findOne({ _id: req.params.id, userId }).select("_id").lean();
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  const versions = await ResumeVersion.find({ resumeId: req.params.id, userId })
    .sort({ versionNo: -1 })
    .select("versionNo note createdAt updatedAt snapshot.title")
    .lean();

  logger.info({ userId, resumeId: req.params.id, count: versions.length }, "Resume versions listed");
  res.status(200).json({ versions });
}, "resumeEnhancement.listResumeVersions");

export const compareResumeVersions = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const leftVersionNo = Number(req.body?.leftVersion);
  const rightVersionNo = Number(req.body?.rightVersion);

  if (!Number.isFinite(leftVersionNo) || !Number.isFinite(rightVersionNo)) {
    res.status(400).json({ message: "leftVersion and rightVersion are required" });
    return;
  }

  const [left, right] = await Promise.all([
    ResumeVersion.findOne({ resumeId: req.params.id, userId, versionNo: leftVersionNo }).lean(),
    ResumeVersion.findOne({ resumeId: req.params.id, userId, versionNo: rightVersionNo }).lean(),
  ]);

  if (!left || !right) {
    res.status(404).json({ message: "One or more versions not found" });
    return;
  }

  const leftCounts = getSectionCounts(left.snapshot);
  const rightCounts = getSectionCounts(right.snapshot);

  const diff = {
    titleChanged: String((left.snapshot as any)?.title ?? "") !== String((right.snapshot as any)?.title ?? ""),
    summaryChanged: String((left.snapshot as any)?.personalInfo?.summary ?? "") !== String((right.snapshot as any)?.personalInfo?.summary ?? ""),
    sectionCountDelta: {
      experience: rightCounts.experience - leftCounts.experience,
      education: rightCounts.education - leftCounts.education,
      skills: rightCounts.skills - leftCounts.skills,
      projects: rightCounts.projects - leftCounts.projects,
      certifications: rightCounts.certifications - leftCounts.certifications,
      languages: rightCounts.languages - leftCounts.languages,
    },
  };

  res.status(200).json({ left, right, diff });
  logger.info({ userId, resumeId: req.params.id, leftVersionNo, rightVersionNo }, "Resume versions compared");
}, "resumeEnhancement.compareResumeVersions");

export const restoreResumeVersion = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const versionNo = Number(req.params.versionNo);
  if (!Number.isFinite(versionNo)) {
    res.status(400).json({ message: "Invalid version number" });
    return;
  }

  const version = await ResumeVersion.findOne({ resumeId: req.params.id, userId, versionNo }).lean();
  if (!version) {
    res.status(404).json({ message: "Version not found" });
    return;
  }

  const snapshot = { ...(version.snapshot as Record<string, unknown>) };
  delete snapshot._id;
  delete snapshot.userId;
  delete snapshot.createdAt;
  delete snapshot.updatedAt;
  delete snapshot.__v;

  const restored = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId },
    snapshot,
    { returnDocument: 'after', runValidators: true },
  );

  if (!restored) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  await createResumeVersion(restored, `Restored from version ${versionNo}`);
  await recordTemplateUsage(String(restored.templateId), "edit");

  res.status(200).json({ message: "Resume restored", resume: restored });
  logger.info({ userId, resumeId: req.params.id, versionNo }, "Resume version restored");
}, "resumeEnhancement.restoreResumeVersion");

export const createRoleTailoredVariant = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const resume = await Resume.findOne({ _id: req.params.id, userId });
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  const targetRole = String(req.body?.targetRole ?? "").trim();
  const keywords = Array.isArray(req.body?.keywords)
    ? req.body.keywords.filter((value: unknown) => typeof value === "string").map((value: string) => value.trim()).filter(Boolean)
    : [];

  if (!targetRole) {
    res.status(400).json({ message: "targetRole is required" });
    return;
  }

  const base = resume.toObject();
  delete (base as any)._id;
  delete (base as any).createdAt;
  delete (base as any).updatedAt;

  const keywordSentence = keywords.length > 0 ? ` Focus keywords: ${keywords.join(", ")}.` : "";

  const variant = await Resume.create({
    ...base, userId, baseResumeId: resume._id, isVariant: true,
    variantLabel: `Tailored for ${targetRole}`, targetRole,
    title: `${resume.title} (${targetRole})`,
    personalInfo: { ...base.personalInfo, title: targetRole, summary: `${String(base.personalInfo?.summary ?? "").trim()}${keywordSentence}`.trim() },
  });

  await createResumeVersion(variant, `Variant created for ${targetRole}`);
  await recordTemplateUsage(String(variant.templateId), "create");

  res.status(201).json({ message: "Role-tailored variant created", resume: variant });
  logger.info({ userId, resumeId: req.params.id, variantId: variant._id.toString(), targetRole }, "Role-tailored variant created");
}, "resumeEnhancement.createRoleTailoredVariant");

export const applyKeywordPlacement = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { keyword, section } = req.body ?? {};
  if (!keyword || !section) {
    res.status(400).json({ message: "keyword and section are required" });
    return;
  }

  const resume = await Resume.findOne({ _id: req.params.id, userId });
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  const mutable = resume.toObject();
  const normalizedKeyword = String(keyword).trim();
  if (!normalizedKeyword) {
    res.status(400).json({ message: "Invalid keyword" });
    return;
  }

  // Add keyword to the specified section
  if (section === "skills") {
    // Append to the first uncategorized skill group, or create one
    const existing = mutable.sections?.skills ?? [];
    const target = existing.find((s: any) => !s.category || s.category === "Technical Skills");
    if (target) {
      if (!target.items.includes(normalizedKeyword)) {
        target.items.push(normalizedKeyword);
      }
    } else {
      existing.push({ id: crypto.randomUUID(), category: "Technical Skills", items: [normalizedKeyword] });
    }
    mutable.sections = { ...mutable.sections, skills: existing };
  } else if (section === "summary") {
    // Append keyword to the summary text
    const summary = mutable.personalInfo?.summary ?? "";
    const sentence = `Proficient in ${normalizedKeyword}.`;
    if (!summary.toLowerCase().includes(normalizedKeyword.toLowerCase())) {
      mutable.personalInfo = { ...mutable.personalInfo, summary: summary ? `${summary} ${sentence}` : sentence };
    }
  } else if (section === "experience") {
    // Append keyword as a bullet to the most recent experience entry
    const experience = mutable.sections?.experience ?? [];
    const latest = experience[0];
    if (latest) {
      if (!latest.bullets.some((b: string) => b.toLowerCase().includes(normalizedKeyword.toLowerCase()))) {
        latest.bullets.unshift(`Leveraged ${normalizedKeyword} to drive impactful results.`);
      }
    }
    mutable.sections = { ...mutable.sections, experience };
  } else {
    // Fallback: add to skills section
    const existing = mutable.sections?.skills ?? [];
    const target = existing.find((s: any) => !s.category || s.category === "Technical Skills");
    if (target) {
      if (!target.items.includes(normalizedKeyword)) {
        target.items.push(normalizedKeyword);
      }
    } else {
      existing.push({ id: crypto.randomUUID(), category: "Technical Skills", items: [normalizedKeyword] });
    }
    mutable.sections = { ...mutable.sections, skills: existing };
  }

  const updated = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId },
    mutable,
    { returnDocument: 'after', runValidators: true },
  );

  if (!updated) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  await createResumeVersion(updated, "Applied ATS keyword placement");
  await recordTemplateUsage(String(updated.templateId), "edit");
  await invalidateRedisCache([resumeCacheScope(userId)]);

  logger.info({ userId, resumeId: req.params.id, keyword, section }, "ATS keyword placement applied");
  res.status(200).json({ message: "Keyword added", resume: updated });
}, "resumeEnhancement.applyKeywordPlacement");

export const createMissingSection = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { section, copyPasteTemplate } = req.body ?? {};
  if (!section) {
    res.status(400).json({ message: "section is required" });
    return;
  }

  const resume = await Resume.findOne({ _id: req.params.id, userId });
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  const mutable = resume.toObject();
  const normalizedSection = String(section).toLowerCase();
  const sections = mutable.sections ?? {};

  const now = new Date().toISOString();

  switch (normalizedSection) {
    case "summary": {
      const content = copyPasteTemplate || "Professional summary goes here.";
      mutable.personalInfo = { ...mutable.personalInfo, summary: content };
      break;
    }
    case "experience": {
      const existing = sections.experience ?? [];
      existing.unshift({
        id: crypto.randomUUID(),
        company: "Company Name",
        role: "Job Title",
        start: "Start Date",
        end: "Present",
        location: "",
        current: false,
        contentMode: "bullets",
        description: "",
        bullets: copyPasteTemplate ? [copyPasteTemplate] : ["Accomplished [result] by using [skill] to achieve [outcome]."],
      });
      sections.experience = existing;
      break;
    }
    case "education": {
      const existing = sections.education ?? [];
      existing.push({
        id: crypto.randomUUID(),
        institution: "Institution Name",
        degree: "Degree",
        field: "Field of Study",
        year: String(new Date().getFullYear()),
        cgpa: "",
      });
      sections.education = existing;
      break;
    }
    case "skills": {
      const existing = sections.skills ?? [];
      existing.push({
        id: crypto.randomUUID(),
        category: "Technical Skills",
        items: copyPasteTemplate ? copyPasteTemplate.split(",").map((s: string) => s.trim()).filter(Boolean) : ["Skill 1", "Skill 2"],
      });
      sections.skills = existing;
      break;
    }
    case "projects": {
      const existing = sections.projects ?? [];
      existing.push({
        id: crypto.randomUUID(),
        name: "Project Name",
        contentMode: "paragraph",
        description: copyPasteTemplate || "Project description goes here.",
        bullets: [],
        tech: "",
        link: "",
      });
      sections.projects = existing;
      break;
    }
    case "certifications": {
      const existing = sections.certifications ?? [];
      existing.push({
        id: crypto.randomUUID(),
        name: "Certification Name",
        issuer: "Issuing Organization",
        year: String(new Date().getFullYear()),
      });
      sections.certifications = existing;
      break;
    }
    case "languages": {
      const existing = sections.languages ?? [];
      existing.push({
        id: crypto.randomUUID(),
        language: "Language",
        proficiency: "Intermediate",
      });
      sections.languages = existing;
      break;
    }
    default: {
      res.status(400).json({ message: `Unknown section: ${section}` });
      return;
    }
  }

  mutable.sections = sections;

  const updated = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId },
    mutable,
    { returnDocument: 'after', runValidators: true },
  );

  if (!updated) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  await createResumeVersion(updated, "Applied ATS section fix");
  await recordTemplateUsage(String(updated.templateId), "edit");
  await invalidateRedisCache([resumeCacheScope(userId)]);

  logger.info({ userId, resumeId: req.params.id, section }, "ATS missing section created");
  res.status(200).json({ message: "Section created", resume: updated });
}, "resumeEnhancement.createMissingSection");

export const getExportPreset = wrapController(async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const resume = await Resume.findOne({ _id: req.params.id, userId }).select("_id title updatedAt").lean();
  if (!resume) {
    res.status(404).json({ message: "Resume not found" });
    return;
  }

  const preset = String(req.body?.preset ?? "standard").toLowerCase();
  const presetOptions = {
    web: { scale: 0.95, imageQuality: 0.75, printBackground: true },
    standard: { scale: 1, imageQuality: 0.88, printBackground: true },
    print: { scale: 1.08, imageQuality: 1, printBackground: true },
  } as const;

  const selectedPreset = preset in presetOptions ? preset as keyof typeof presetOptions : "standard";

  res.status(200).json({
    export: {
      preset: selectedPreset,
      options: presetOptions[selectedPreset],
      filename: `${resume.title.replace(/\s+/g, "_")}_${selectedPreset}.pdf`,
      generatedAt: new Date().toISOString(),
    },
  });
  logger.info({ userId, resumeId: req.params.id, preset: selectedPreset }, "Export preset resolved");
}, "resumeEnhancement.getExportPreset");

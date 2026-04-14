import { Request, RequestHandler, Response } from "express";
import Resume from "../models/Resume";
import AtsAnalysis from "../models/AtsAnalysis";
import ResumeVersion from "../models/ResumeVersion";
import Template from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";
import { createResumeVersion } from "../services/resumeVersionService";

const ACTION_VERBS = new Set([
  "built", "designed", "led", "implemented", "optimized", "improved", "launched", "created", "managed", "delivered",
  "automated", "developed", "scaled", "reduced", "increased", "collaborated", "architected", "streamlined",
]);

const hasMetric = (text: string) => /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b|\b(kpi|latency|revenue|conversion|sla)\b/i.test(text);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getUserId = (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return userId;
};

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

const recordTemplateUsage = async (layoutId: string, type: "create" | "edit") => {
  if (!layoutId) return;

  const template = await Template.findOne({ layoutId }).select("_id").lean();
  if (!template?._id) return;

  await (TemplateUsage as any).recordUse(String(template._id), layoutId, type);
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

const setPathValue = (target: any, path: string, value: string) => {
  if (path === "personalInfo.summary") {
    target.personalInfo = target.personalInfo ?? {};
    target.personalInfo.summary = value;
    return;
  }

  const match = path.match(/^sections\.experience\[(\d+)\]\.bullets\[(\d+)\]$/);
  if (!match) {
    throw new Error("Unsupported suggestion path");
  }

  const expIndex = Number(match[1]);
  const bulletIndex = Number(match[2]);

  if (!target.sections?.experience?.[expIndex]?.bullets?.[bulletIndex]) {
    throw new Error("Suggestion target does not exist");
  }

  target.sections.experience[expIndex].bullets[bulletIndex] = value;
};

export const analyzeAts: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const resume = await Resume.findOne({ _id: req.params.id, userId });
    if (!resume) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    const bodyKeywords = Array.isArray(req.body?.keywords)
      ? req.body.keywords.filter((value: unknown) => typeof value === "string").map((value: string) => value.trim().toLowerCase()).filter(Boolean)
      : [];

    const jobTitle = typeof req.body?.jobTitle === "string" ? req.body.jobTitle : "";
    const keywords = Array.from(new Set([...getRoleKeywords(jobTitle), ...bodyKeywords]));

    const analysis = buildAtsAnalysis(resume.toObject(), keywords);

    const saved = await AtsAnalysis.findOneAndUpdate(
      { resumeId: resume._id, userId },
      {
        resumeId: resume._id,
        userId,
        ...analysis,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({ analysis: saved });
  } catch (error) {
    console.error("Failed to analyze ATS score", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const applyAtsSuggestion: RequestHandler = async (req, res) => {
  try {
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
    setPathValue(mutable, suggestion.path, suggestion.suggestionText);

    const updated = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId },
      mutable,
      { new: true, runValidators: true },
    );

    if (!updated) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    await createResumeVersion(updated, "Applied ATS rewrite suggestion");
    await recordTemplateUsage(String(updated.templateId), "edit");

    res.status(200).json({ message: "Suggestion applied", resume: updated });
  } catch (error) {
    console.error("Failed to apply ATS suggestion", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const listResumeVersions: RequestHandler = async (req, res) => {
  try {
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

    res.status(200).json({ versions });
  } catch (error) {
    console.error("Failed to list resume versions", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getSectionCounts = (snapshot: any) => ({
  experience: snapshot?.sections?.experience?.length ?? 0,
  education: snapshot?.sections?.education?.length ?? 0,
  skills: snapshot?.sections?.skills?.length ?? 0,
  projects: snapshot?.sections?.projects?.length ?? 0,
  certifications: snapshot?.sections?.certifications?.length ?? 0,
  languages: snapshot?.sections?.languages?.length ?? 0,
});

export const compareResumeVersions: RequestHandler = async (req, res) => {
  try {
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

    res.status(200).json({
      left,
      right,
      diff,
    });
  } catch (error) {
    console.error("Failed to compare versions", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const restoreResumeVersion: RequestHandler = async (req, res) => {
  try {
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
      { new: true, runValidators: true },
    );

    if (!restored) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    await createResumeVersion(restored, `Restored from version ${versionNo}`);
    await recordTemplateUsage(String(restored.templateId), "edit");

    res.status(200).json({
      message: "Resume restored",
      resume: restored,
    });
  } catch (error) {
    console.error("Failed to restore resume version", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createRoleTailoredVariant: RequestHandler = async (req, res) => {
  try {
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

    const keywordSentence = keywords.length > 0
      ? ` Focus keywords: ${keywords.join(", ")}.`
      : "";

    const variant = await Resume.create({
      ...base,
      userId,
      baseResumeId: resume._id,
      isVariant: true,
      variantLabel: `Tailored for ${targetRole}`,
      targetRole,
      title: `${resume.title} (${targetRole})`,
      personalInfo: {
        ...base.personalInfo,
        title: targetRole,
        summary: `${String(base.personalInfo?.summary ?? "").trim()}${keywordSentence}`.trim(),
      },
    });

    await createResumeVersion(variant, `Variant created for ${targetRole}`);
    await recordTemplateUsage(String(variant.templateId), "create");

    res.status(201).json({
      message: "Role-tailored variant created",
      resume: variant,
    });
  } catch (error) {
    console.error("Failed to create variant", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getExportPreset: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const resume = await Resume.findOne({ _id: req.params.id, userId }).select("_id title updatedAt").lean();
    if (!resume) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    const preset = String(req.body?.preset ?? "standard").toLowerCase();
    const presetOptions = {
      web: {
        scale: 0.95,
        imageQuality: 0.75,
        printBackground: true,
      },
      standard: {
        scale: 1,
        imageQuality: 0.88,
        printBackground: true,
      },
      print: {
        scale: 1.08,
        imageQuality: 1,
        printBackground: true,
      },
    } as const;

    const selectedPreset = preset in presetOptions
      ? preset as keyof typeof presetOptions
      : "standard";

    res.status(200).json({
      export: {
        preset: selectedPreset,
        options: presetOptions[selectedPreset],
        filename: `${resume.title.replace(/\s+/g, "_")}_${selectedPreset}.pdf`,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to resolve export preset", error);
    res.status(500).json({ message: "Server error" });
  }
};

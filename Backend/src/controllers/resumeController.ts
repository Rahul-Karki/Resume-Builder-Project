import { Request, Response, RequestHandler } from "express";
import Resume from "../models/Resume";
import AtsAnalysis from "../models/AtsAnalysis";
import Template from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";
import { createResumeVersion } from "../services/resumeVersionService";
import { logger } from "../observability";
import { wrapController } from "../utils/controllerWrapper";
import { invalidateRedisCache } from "../middleware/redisCache";
import { normalizeResumeTemplateId } from "../utils/resumeTemplate";
import { recordResumeCreated, recordResumeDeleted } from "../utils/businessMetrics";
import { AuthError, NotFoundError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";
import mongoose from "mongoose";

const recordTemplateUsage = async (layoutId: string, type: "create" | "edit") => {
    if (!layoutId) return;

    const template = await Template.findOne({ layoutId }).select("_id").lean();
    if (!template?._id) return;

    await (TemplateUsage as any).recordUse(String(template._id), layoutId, type);
};

const getUserId = (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        sendErrorResponse(res, new AuthError("Unauthorized", { code: "AUTH_REQUIRED" }));
        return null;
    }

    return userId;
};

const resumeCacheScope = (userId: string) => `resumes-user:${userId}`;

const normalizeResumeResponse = <T extends { templateId?: unknown; toObject?: () => Record<string, unknown> }>(resume: T) => {
    const plainResume = typeof resume.toObject === "function"
        ? resume.toObject()
        : { ...resume };

    return {
        ...plainResume,
        templateId: normalizeResumeTemplateId(plainResume.templateId),
    };
};

const getAllResumes = wrapController(async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const total = await Resume.countDocuments({ userId });

    const resumes = await Resume.find({ userId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const atsScores = await AtsAnalysis.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
        { $sort: { analyzedAt: -1 } },
        { $group: { _id: "$resumeId", overallScore: { $first: "$overallScore" }, status: { $first: "$status" }, analyzedAt: { $first: "$analyzedAt" } } },
        { $project: { _id: 1, overallScore: 1, status: 1, analyzedAt: 1 } },
    ]);

    const atsScoreMap = new Map<string, { overallScore: number | null; status: string | null; analyzedAt: Date | null }>();
    for (const a of atsScores) {
        atsScoreMap.set(String(a._id), { overallScore: a.overallScore ?? null, status: a.status ?? null, analyzedAt: a.analyzedAt ?? null });
    }

    const normalizedResumes = resumes.map((resume) => {
        const atsData = atsScoreMap.get(String(resume._id));
        return {
            ...normalizeResumeResponse(resume as any),
            atsScore: atsData?.overallScore ?? null,
            atsStatus: atsData?.status ?? null,
            atsAnalyzedAt: atsData?.analyzedAt ?? null
        };
    });

    logger.info({ userId, count: normalizedResumes.length, page, total }, "Fetched resumes");
    res.status(200).json({
        resumes: normalizedResumes,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}, "resume.getAllResumes");

const getResumeById = wrapController(async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const resume = await Resume.findOne({ _id: req.params.id, userId });

    if (!resume) {
        logger.warn({ userId, resumeId: req.params.id }, "Resume not found");
        return sendErrorResponse(res, new NotFoundError("Resume not found"));
    }

    logger.info({ userId, resumeId: req.params.id }, "Fetched resume by id");
    res.status(200).json({ resume: normalizeResumeResponse(resume) });
}, "resume.getResumeById");

const createResume = wrapController(async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const payload = {
        title: req.body?.title,
        templateId: normalizeResumeTemplateId(req.body?.templateId),
        personalInfo: req.body?.personalInfo,
        sections: req.body?.sections,
        style: req.body?.style,
        sectionOrder: req.body?.sectionOrder,
        sectionVisibility: req.body?.sectionVisibility,
    };

    const resume = await Resume.create({
        ...payload,
        userId,
    });

    await recordTemplateUsage(String(resume.templateId), "create");
    await createResumeVersion(resume, "Initial version");
    await invalidateRedisCache([resumeCacheScope(userId)]);

    res.status(201).json({
        message: "Resume saved successfully",
        resume: normalizeResumeResponse(resume),
    });
    recordResumeCreated(String(resume.templateId));
    logger.info({ userId, resumeId: resume._id.toString() }, "Resume created");
}, "resume.createResume");

const updateResume = wrapController(async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const payload = {
        title: req.body?.title,
        personalInfo: req.body?.personalInfo,
        sections: req.body?.sections,
        style: req.body?.style,
        sectionOrder: req.body?.sectionOrder,
        sectionVisibility: req.body?.sectionVisibility,
        templateId: req.body?.templateId === undefined ? undefined : normalizeResumeTemplateId(req.body.templateId),
    };
    Object.keys(payload).forEach((key) => { if ((payload as any)[key] === undefined) delete (payload as any)[key]; });

    const resume = await Resume.findOneAndUpdate(
        { _id: req.params.id, userId },
        { ...payload, userId },
        { returnDocument: 'after', runValidators: true },
    );

    if (!resume) {
        logger.warn({ userId, resumeId: req.params.id }, "Resume not found for update");
        return sendErrorResponse(res, new NotFoundError("Resume not found"));
    }

    await recordTemplateUsage(String(resume.templateId), "edit");
    await createResumeVersion(resume, "Updated resume");
    await invalidateRedisCache([resumeCacheScope(userId)]);

    res.status(200).json({
        message: "Resume updated successfully",
        resume: normalizeResumeResponse(resume),
    });
    logger.info({ userId, resumeId: req.params.id }, "Resume updated");
}, "resume.updateResume");

const deleteResume = wrapController(async (req, res) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId });

    if (!resume) {
        logger.warn({ userId, resumeId: req.params.id }, "Resume not found for delete");
        return sendErrorResponse(res, new NotFoundError("Resume not found"));
    }

    logger.info({ userId, resumeId: req.params.id }, "Resume deleted");
    recordResumeDeleted();
    await invalidateRedisCache([resumeCacheScope(userId)]);
    res.status(204).send();
}, "resume.deleteResume");

export { getAllResumes, getResumeById, createResume, updateResume, deleteResume };

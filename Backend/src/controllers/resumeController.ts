import { Request, Response, RequestHandler } from "express";
import Resume from "../models/Resume";
import AtsAnalysis from "../models/AtsAnalysis";
import Template from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";
import { createResumeVersion } from "../services/resumeVersionService";
import { logger } from "../observability";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
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

const getAllResumes: RequestHandler = async (req, res) => {
    const span = startControllerSpan("resume.getAllResumes", req);
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        // Pagination
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
        const skip = (page - 1) * limit;

        // Get total count for pagination metadata
        const total = await Resume.countDocuments({ userId });

        // Fetch paginated resumes sorted by updatedAt (needs compound index {userId:1, updatedAt:-1})
        const resumes = await Resume.find({ userId })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Single batch query for ATS scores — eliminates N+1
        const atsScores = await AtsAnalysis.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), status: "completed" } },
            { $sort: { analyzedAt: -1 } },
            { $group: { _id: "$resumeId", overallScore: { $first: "$overallScore" }, status: { $first: "$status" }, analyzedAt: { $first: "$analyzedAt" } } },
            { $project: { _id: 1, overallScore: 1, status: 1, analyzedAt: 1 } },
        ]);

        // Build lookup map
        const atsScoreMap = new Map<string, { overallScore: number | null; status: string | null; analyzedAt: Date | null }>();
        for (const a of atsScores) {
            atsScoreMap.set(String(a._id), { overallScore: a.overallScore ?? null, status: a.status ?? null, analyzedAt: a.analyzedAt ?? null });
        }

        // Normalize resumes and include ATS score
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
        markSpanSuccess(span);
        res.status(200).json({
            resumes: normalizedResumes,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        markSpanError(span, error as Error, "Failed to fetch resumes");
        logger.error({ error }, "Failed to fetch resumes");
        sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
    } finally {
        finishControllerSpan(span);
    }
};

const getResumeById: RequestHandler = async (req, res) => {
    const span = startControllerSpan("resume.getResumeById", req);
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resume = await Resume.findOne({ _id: req.params.id, userId });

        if (!resume) {
            logger.warn({ userId, resumeId: req.params.id }, "Resume not found");
            return sendErrorResponse(res, new NotFoundError("Resume not found"));
        }

        logger.info({ userId, resumeId: req.params.id }, "Fetched resume by id");
        markSpanSuccess(span);
        res.status(200).json({ resume: normalizeResumeResponse(resume) });
    } catch (error) {
        markSpanError(span, error as Error, "Failed to fetch resume by id");
        logger.error({ error, resumeId: req.params.id }, "Failed to fetch resume by id");
        sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
    } finally {
        finishControllerSpan(span);
    }
};

const createResume: RequestHandler = async (req, res) => {
    const span = startControllerSpan("resume.createResume", req);
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const payload = {
            ...req.body,
            templateId: normalizeResumeTemplateId(req.body?.templateId),
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
        markSpanSuccess(span);
    } catch (error) {
        markSpanError(span, error as Error, "Failed to create resume");
        logger.error({ error }, "Failed to create resume");
        sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
    } finally {
        finishControllerSpan(span);
    }
};

const updateResume: RequestHandler = async (req, res) => {
    const span = startControllerSpan("resume.updateResume", req);
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const payload = {
            ...req.body,
            templateId: req.body?.templateId === undefined ? undefined : normalizeResumeTemplateId(req.body.templateId),
        };

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
        markSpanSuccess(span);
    } catch (error) {
        markSpanError(span, error as Error, "Failed to update resume");
        logger.error({ error, resumeId: req.params.id }, "Failed to update resume");
        sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
    } finally {
        finishControllerSpan(span);
    }
};

const deleteResume: RequestHandler = async (req, res) => {
    const span = startControllerSpan("resume.deleteResume", req);
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId });

        if (!resume) {
            logger.warn({ userId, resumeId: req.params.id }, "Resume not found for delete");
            return sendErrorResponse(res, new NotFoundError("Resume not found"));
        }

        logger.info({ userId, resumeId: req.params.id }, "Resume deleted");
        recordResumeDeleted();
        markSpanSuccess(span);
        await invalidateRedisCache([resumeCacheScope(userId)]);
        res.status(204).send();
    } catch (error) {
        markSpanError(span, error as Error, "Failed to delete resume");
        logger.error({ error, resumeId: req.params.id }, "Failed to delete resume");
        sendErrorResponse(res, error, { statusCode: 500, code: "SERVER_ERROR", message: "Server error" });
    } finally {
        finishControllerSpan(span);
    }
};

export { createResume, deleteResume, getAllResumes, getResumeById, updateResume };

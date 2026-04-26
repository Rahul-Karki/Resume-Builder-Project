import { Request, Response, RequestHandler } from "express";
import Resume from "../models/Resume";
import Template from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";
import { createResumeVersion } from "../services/resumeVersionService";
import { logger } from "../observability";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "../utils/controllerObservability";
import { invalidateRedisCache } from "../middleware/redisCache";
import { normalizeResumeTemplateId } from "../utils/resumeTemplate";

const recordTemplateUsage = async (layoutId: string, type: "create" | "edit") => {
    if (!layoutId) return;

    const template = await Template.findOne({ layoutId }).select("_id").lean();
    if (!template?._id) return;

    await (TemplateUsage as any).recordUse(String(template._id), layoutId, type);
};

const getUserId = (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
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

        const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 });
        const normalizedResumes = resumes.map((resume) => normalizeResumeResponse(resume));

        logger.info({ userId, count: normalizedResumes.length }, "Fetched resumes");
        markSpanSuccess(span);
        res.status(200).json({ resumes: normalizedResumes });
    } catch (error) {
        markSpanError(span, error as Error, "Failed to fetch resumes");
        logger.error({ error }, "Failed to fetch resumes");
        res.status(500).json({ message: "Server error" });
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
            return res.status(404).json({ message: "Resume not found" });
        }

        logger.info({ userId, resumeId: req.params.id }, "Fetched resume by id");
        markSpanSuccess(span);
        res.status(200).json({ resume: normalizeResumeResponse(resume) });
    } catch (error) {
        markSpanError(span, error as Error, "Failed to fetch resume by id");
        logger.error({ error, resumeId: req.params.id }, "Failed to fetch resume by id");
        res.status(500).json({ message: "Server error" });
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
        logger.info({ userId, resumeId: resume._id.toString() }, "Resume created");
        markSpanSuccess(span);
    } catch (error) {
        markSpanError(span, error as Error, "Failed to create resume");
        logger.error({ error }, "Failed to create resume");
        res.status(500).json({ message: "Server error" });
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
            { new: true, runValidators: true },
        );

        if (!resume) {
            logger.warn({ userId, resumeId: req.params.id }, "Resume not found for update");
            return res.status(404).json({ message: "Resume not found" });
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
        res.status(500).json({ message: "Server error" });
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
            return res.status(404).json({ message: "Resume not found" });
        }

        logger.info({ userId, resumeId: req.params.id }, "Resume deleted");
        markSpanSuccess(span);
        await invalidateRedisCache([resumeCacheScope(userId)]);
        res.status(200).json({ message: "Resume deleted successfully" });
    } catch (error) {
        markSpanError(span, error as Error, "Failed to delete resume");
        logger.error({ error, resumeId: req.params.id }, "Failed to delete resume");
        res.status(500).json({ message: "Server error" });
    } finally {
        finishControllerSpan(span);
    }
};

export { createResume, deleteResume, getAllResumes, getResumeById, updateResume };

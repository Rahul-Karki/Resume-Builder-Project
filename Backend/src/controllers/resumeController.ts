import { Request, Response, RequestHandler } from "express";
import Resume from "../models/Resume";
import Template from "../models/Template";
import TemplateUsage from "../models/TemplateUsage";

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

const getAllResumes: RequestHandler = async (req, res) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 });

        res.status(200).json({ resumes });
    } catch (error) {
        console.error("Can't get all resumes", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getResumeById: RequestHandler = async (req, res) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resume = await Resume.findOne({ _id: req.params.id, userId });

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        res.status(200).json({ resume });
    } catch (error) {
        console.error("Can't get resume by id", error);
        res.status(500).json({ message: "Server error" });
    }
};

const createResume: RequestHandler = async (req, res) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resume = await Resume.create({
            ...req.body,
            userId,
        });

        await recordTemplateUsage(String(resume.templateId), "create");

        res.status(201).json({
            message: "Resume saved successfully",
            resume,
        });
    } catch (error) {
        console.error("Can't create resume", error);
        res.status(500).json({ message: "Server error" });
    }
};

const updateResume: RequestHandler = async (req, res) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resume = await Resume.findOneAndUpdate(
            { _id: req.params.id, userId },
            { ...req.body, userId },
            { new: true, runValidators: true },
        );

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        await recordTemplateUsage(String(resume.templateId), "edit");

        res.status(200).json({
            message: "Resume updated successfully",
            resume,
        });
    } catch (error) {
        console.error("Can't update resume", error);
        res.status(500).json({ message: "Server error" });
    }
};

const deleteResume: RequestHandler = async (req, res) => {
    try {
        const userId = getUserId(req, res);
        if (!userId) return;

        const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId });

        if (!resume) {
            return res.status(404).json({ message: "Resume not found" });
        }

        res.status(200).json({ message: "Resume deleted successfully" });
    } catch (error) {
        console.error("Can't delete resume", error);
        res.status(500).json({ message: "Server error" });
    }
};

export { createResume, deleteResume, getAllResumes, getResumeById, updateResume };
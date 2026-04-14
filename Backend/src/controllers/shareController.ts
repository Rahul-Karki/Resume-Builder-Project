import bcrypt from "bcrypt";
import crypto from "crypto";
import { Request, RequestHandler, Response } from "express";
import Resume from "../models/Resume";
import ResumeShare from "../models/ResumeShare";
import ResumeShareEvent from "../models/ResumeShareEvent";
import { env } from "../config/env";

const getUserId = (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return userId;
};

const generateSlug = () => crypto.randomBytes(6).toString("base64url").toLowerCase();

const fingerprintFromRequest = (req: Request) => {
  const ip = req.ip ?? "";
  const ua = req.get("user-agent") ?? "";
  return crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex");
};

const sanitizeResume = (resume: any) => {
  const plain = typeof resume?.toObject === "function" ? resume.toObject() : resume;
  if (!plain) return null;

  const {
    userId,
    __v,
    ...rest
  } = plain;

  return rest;
};

const validateShareAccess = async (share: any, providedPassword?: string) => {
  if (!share || !share.isActive) {
    return { ok: false, code: 404, message: "Share link not found" };
  }

  if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
    return { ok: false, code: 410, message: "Share link has expired" };
  }

  if (share.visibility === "password") {
    if (!providedPassword || !share.passwordHash) {
      return { ok: false, code: 401, message: "Password required" };
    }

    const matches = await bcrypt.compare(providedPassword, share.passwordHash);
    if (!matches) {
      return { ok: false, code: 401, message: "Invalid password" };
    }
  }

  return { ok: true as const };
};

export const upsertShareSettings: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const resume = await Resume.findOne({ _id: req.params.id, userId }).select("_id").lean();
    if (!resume) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    const visibility = String(req.body?.visibility ?? "unlisted") as "public" | "unlisted" | "password";
    const allowDownload = typeof req.body?.allowDownload === "boolean" ? req.body.allowDownload : true;
    const isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : true;
    const expiresAt = req.body?.expiresAt ? new Date(String(req.body.expiresAt)) : undefined;
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    const existing = await ResumeShare.findOne({ resumeId: req.params.id, ownerUserId: userId });

    const share = existing ?? new ResumeShare({
      resumeId: req.params.id,
      ownerUserId: userId,
      slug: generateSlug(),
    });

    share.visibility = visibility;
    share.allowDownload = allowDownload;
    share.isActive = isActive;
    share.expiresAt = expiresAt;

    if (visibility === "password") {
      if (password.trim().length < 6 && !share.passwordHash) {
        res.status(400).json({ message: "Password must be at least 6 characters" });
        return;
      }

      if (password.trim().length >= 6) {
        share.passwordHash = await bcrypt.hash(password, 10);
      }
    } else {
      share.passwordHash = undefined;
    }

    await share.save();

    const frontendBase = env.FRONTEND_URL;
    res.status(200).json({
      share: {
        id: share._id,
        slug: share.slug,
        visibility: share.visibility,
        allowDownload: share.allowDownload,
        isActive: share.isActive,
        expiresAt: share.expiresAt,
        url: `${frontendBase}/share/${share.slug}`,
      },
    });
  } catch (error) {
    console.error("Failed to upsert share settings", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getShareAnalytics: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req, res);
    if (!userId) return;

    const share = await ResumeShare.findOne({ resumeId: req.params.id, ownerUserId: userId }).lean();
    if (!share) {
      res.status(404).json({ message: "Share link not found" });
      return;
    }

    const [events, totals] = await Promise.all([
      ResumeShareEvent.find({ shareId: share._id }).sort({ createdAt: -1 }).limit(200).lean(),
      ResumeShareEvent.aggregate([
        { $match: { shareId: share._id } },
        {
          $group: {
            _id: "$eventType",
            count: { $sum: 1 },
            uniqueViewers: { $addToSet: "$fingerprint" },
          },
        },
      ]),
    ]);

    const viewGroup = totals.find((item) => item._id === "view");
    const downloadGroup = totals.find((item) => item._id === "download");

    res.status(200).json({
      analytics: {
        views: viewGroup?.count ?? 0,
        downloads: downloadGroup?.count ?? 0,
        uniqueViewers: viewGroup?.uniqueViewers?.length ?? 0,
        recentEvents: events.map((event) => ({
          eventType: event.eventType,
          at: event.createdAt,
        })),
      },
      share: {
        slug: share.slug,
        visibility: share.visibility,
        allowDownload: share.allowDownload,
        isActive: share.isActive,
        expiresAt: share.expiresAt,
      },
    });
  } catch (error) {
    console.error("Failed to fetch share analytics", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPublicShareResume: RequestHandler = async (req, res) => {
  try {
    const share = await ResumeShare.findOne({ slug: req.params.slug }).lean();
    const password = typeof req.query?.password === "string" ? req.query.password : undefined;

    const access = await validateShareAccess(share, password);
    if (!access.ok) {
      res.status(access.code).json({ message: access.message });
      return;
    }

    const resume = await Resume.findById(share!.resumeId).lean();
    if (!resume) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    await ResumeShareEvent.create({
      shareId: share!._id,
      eventType: "view",
      fingerprint: fingerprintFromRequest(req),
    });

    res.status(200).json({
      share: {
        slug: share!.slug,
        visibility: share!.visibility,
        allowDownload: share!.allowDownload,
      },
      resume: sanitizeResume(resume),
    });
  } catch (error) {
    console.error("Failed to fetch shared resume", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const downloadPublicShareResume: RequestHandler = async (req, res) => {
  try {
    const share = await ResumeShare.findOne({ slug: req.params.slug }).lean();
    const password = typeof req.body?.password === "string" ? req.body.password : undefined;

    const access = await validateShareAccess(share, password);
    if (!access.ok) {
      res.status(access.code).json({ message: access.message });
      return;
    }

    if (!share?.allowDownload) {
      res.status(403).json({ message: "Downloads disabled for this share" });
      return;
    }

    const resume = await Resume.findById(share.resumeId).lean();
    if (!resume) {
      res.status(404).json({ message: "Resume not found" });
      return;
    }

    await ResumeShareEvent.create({
      shareId: share._id,
      eventType: "download",
      fingerprint: fingerprintFromRequest(req),
    });

    res.status(200).json({
      message: "Download tracked",
      resume: sanitizeResume(resume),
    });
  } catch (error) {
    console.error("Failed to handle shared resume download", error);
    res.status(500).json({ message: "Server error" });
  }
};

import { Request, Response } from "express";
import { buildResumeHtml } from "../modules/export/buildResumeHtml";

export const previewHtml = async (req: Request, res: Response) => {
  try {
    const resume = req.body?.resume ?? {};
    const preset = String(req.body?.preset ?? "default");
    const html = buildResumeHtml(resume, preset);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: "Failed to build preview HTML" });
  }
};

export default { previewHtml };

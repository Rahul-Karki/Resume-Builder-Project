import { Request, Response } from "express";
import { pushFrontendLog } from "../observability";

const MAX_LOG_LINE_LENGTH = 2000;

export const frontendLogsHandler = (req: Request, res: Response) => {
  const rawBody = req.body || {};

  if (typeof rawBody !== "object" || !rawBody.logs) {
    res.status(200).json({ ok: true });
    return;
  }

  const logs = Array.isArray(rawBody.logs) ? rawBody.logs : [rawBody.logs];

  for (const log of logs) {
    if (typeof log === "object" && log !== null) {
      const line = JSON.stringify(log).substring(0, MAX_LOG_LINE_LENGTH);
      pushFrontendLog(line);
    }
  }

  res.status(200).json({ ok: true });
};

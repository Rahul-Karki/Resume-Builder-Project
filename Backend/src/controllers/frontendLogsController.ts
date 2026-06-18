import { Request, Response } from "express";
import { pushFrontendLog } from "../observability";
import { alertingService } from "../observability/alerting";

const MAX_LOG_LINE_LENGTH = 2000;

const CRITICAL_FRONTEND_PATTERNS = [
  /AI .+ failed/i,
  /unhandled/i,
  /crash/i,
  /API POST .+ failed/i,
  /uncaught/i,
];

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

      // Escalate critical frontend errors to alert pipeline
      const level = (log as any).level;
      const message = String((log as any).message || "");
      if (level === "ERROR" || level === 3) {
        for (const pattern of CRITICAL_FRONTEND_PATTERNS) {
          if (pattern.test(message)) {
            alertingService.recordEvent("frontend_critical_error");
            break;
          }
        }
      }
    }
  }

  res.status(200).json({ ok: true });
};

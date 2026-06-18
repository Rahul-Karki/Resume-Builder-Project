import type { NextFunction, Request, Response } from "express";
import { recordAuditLog } from "../observability/complianceMetrics";
import { logAdminAction } from "../utils/securityLogger";

const resolveAdminResource = (req: Request, resourceGroup: string) => {
  if (req.route?.path) {
    return `${resourceGroup}:${req.route.path}`;
  }

  return resourceGroup;
};

export const adminAuditMiddleware = (resourceGroup: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.once("finish", () => {
      if (!req.user?.id) {
        return;
      }

      const durationMs = Date.now() - startedAt;
      logAdminAction(req, `${req.method} ${resolveAdminResource(req, resourceGroup)}`, {
        resourceGroup,
        resource: req.originalUrl,
        route: req.route?.path ?? req.path,
        statusCode: res.statusCode,
        durationMs,
        params: req.params,
        query: req.query,
      });

      recordAuditLog(`${req.method} ${resourceGroup}`, resourceGroup, durationMs);
    });

    next();
  };
};

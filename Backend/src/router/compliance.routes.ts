import express, { Request, Response } from "express";
import AuditLog from "../models/AuditLog";
import { dataIntegrityChecker } from "../services/dataIntegrityService";
import { alertingService } from "../observability/alerting";
import { logger } from "../observability";
import { validateRequest } from "../middleware/validateRequest";
import {
  auditLogsQuerySchema,
  auditExportQuerySchema,
  complianceReportQuerySchema,
  complianceViolationsQuerySchema,
  alertTestBodySchema,
  objectIdParamSchema,
} from "../validation/schemas";

const router = express.Router();

router.get("/audit-logs", validateRequest({ query: auditLogsQuerySchema }), async (req: Request, res: Response) => {
  try {
    const {
      userId,
      collection,
      action,
      days = 30,
      limit = 100,
      offset = 0,
    } = req.query as any;

    const query: any = {
      timestamp: {
        $gte: new Date(Date.now() - parseInt(days as string) * 86400000),
      },
    };

    if (userId) query.userId = userId;
    if (collection) query.collectionName = collection;
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit as string), 1000))
      .skip(parseInt(offset as string))
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.json({
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      logs,
    });
  } catch (error) {
    logger.error({ error }, "Audit log query failed");
    res.status(500).json({ error: "Query failed" });
  }
});

router.get("/audit-logs/:documentId", validateRequest({ params: objectIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    const history = await AuditLog.find({
      documentId,
    })
      .sort({ timestamp: -1 })
      .lean();

    if (history.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      documentId,
      collection: history[0].collectionName,
      totalChanges: history.length,
      history,
    });
  } catch (error) {
    logger.error({ error }, "Document history query failed");
    res.status(500).json({ error: "Query failed" });
  }
});

router.get("/audit-export", validateRequest({ query: auditExportQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, collection } = req.query as any;

    const query: any = {
      timestamp: {
        $gte: new Date(startDate as string || Date.now() - 30 * 86400000),
        $lte: new Date(endDate as string || Date.now()),
      },
    };

    if (collection) query.collectionName = collection;

    const logs = await AuditLog.find(query).lean();

    const csv = [
      "timestamp,action,collection,documentId,userId,userEmail,ipAddress,endpoint,method,statusCode",
      ...logs.map(
        (log) =>
          `"${log.timestamp}","${log.action}","${log.collectionName}","${log.documentId}","${log.userId || ""}","${log.userEmail || ""}","${log.ipAddress || ""}","${log.endpoint || ""}","${log.method || ""}",${log.statusCode || ""}`
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-logs-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    logger.error({ error }, "Audit export failed");
    res.status(500).json({ error: "Export failed" });
  }
});

router.get("/integrity-status", async (req: Request, res: Response) => {
  try {
    const status = await dataIntegrityChecker.getIntegrityStatus();

    res.json({
      status: status.isHealthy ? "healthy" : "degraded",
      ...status,
      checkedAt: new Date(),
    });
  } catch (error) {
    logger.error({ error }, "Integrity status query failed");
    res.status(500).json({ error: "Status check failed" });
  }
});

router.post("/integrity-check", async (req: Request, res: Response) => {
  try {
    const results = await dataIntegrityChecker.runFullIntegrityCheck();

    res.json({
      checkedAt: new Date(),
      results,
    });
  } catch (error) {
    logger.error({ error }, "Manual integrity check failed");
    res.status(500).json({ error: "Check failed" });
  }
});

router.get("/compliance-report", validateRequest({ query: complianceReportQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query as any;
    const daysNum = days as number;

    const startDate = new Date(Date.now() - daysNum * 86400000);

    const auditStats = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
    ]);

    const changesByUser = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$userEmail",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    const changesByCollection = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$collectionName",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const recentDeletes = await AuditLog.find({
      action: "delete",
      timestamp: { $gte: startDate },
    })
      .select("documentId collectionName userEmail timestamp")
      .limit(10)
      .lean();

    const integrityStatus = await dataIntegrityChecker.getIntegrityStatus();

    res.json({
      reportPeriod: {
        startDate,
        endDate: new Date(),
        days: daysNum,
      },
      auditSummary: {
        totalEntries: await AuditLog.countDocuments({
          timestamp: { $gte: startDate },
        }),
        byAction: Object.fromEntries(
          auditStats.map((s) => [s._id, s.count])
        ),
      },
      changesByUser,
      changesByCollection,
      recentDeletes,
      dataIntegrity: integrityStatus,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error({ error }, "Compliance report generation failed");
    res.status(500).json({ error: "Report generation failed" });
  }
});

router.get(
  "/compliance-violations",
  validateRequest({ query: complianceViolationsQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { severity, days = 7 } = req.query as any;

      const alerts = await AuditLog.find({
        errorMessage: { $exists: true },
        timestamp: {
          $gte: new Date(Date.now() - (days as number) * 86400000),
        },
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      const violations = alerts.map((log) => ({
        timestamp: log.timestamp,
        collection: log.collectionName,
        documentId: log.documentId,
        error: log.errorMessage,
        user: log.userEmail,
      }));

      res.json({
        violations,
        period: {
          days: parseInt(days as string),
        },
      });
    } catch (error) {
      logger.error({ error }, "Violations query failed");
      res.status(500).json({ error: "Query failed" });
    }
  }
);

router.post("/alert-test", validateRequest({ body: alertTestBodySchema }), async (req: Request, res: Response) => {
  try {
    const { channel = "slack" } = req.body as any;

    const result = await alertingService.sendAlert({
      title: "Test Alert",
      description: "This is a test alert from the compliance system",
      severity: "low",
      category: "compliance",
      channels: [channel as any],
    });

    res.json({
      success: result,
      message: result
        ? `Alert sent to ${channel}`
        : `Failed to send alert to ${channel}`,
    });
  } catch (error) {
    logger.error({ error }, "Alert test failed");
    res.status(500).json({ error: "Alert test failed" });
  }
});

router.get("/metrics/compliance", async (req: Request, res: Response) => {
  try {
    const lastHour = new Date(Date.now() - 3600000);
    const lastDay = new Date(Date.now() - 86400000);

    const errorsLastHour = await AuditLog.countDocuments({
      timestamp: { $gte: lastHour },
      action: "delete",
    });

    const errorsLastDay = await AuditLog.countDocuments({
      timestamp: { $gte: lastDay },
      action: "delete",
    });

    res.json({
      recentMetrics: {
        deletesLastHour: errorsLastHour,
        deletesLastDay: errorsLastDay,
        auditLogCount: await AuditLog.countDocuments(),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error({ error }, "Metrics query failed");
    res.status(500).json({ error: "Metrics query failed" });
  }
});

export default router;

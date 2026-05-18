import express, { Request, Response } from "express";
import AuditLog from "../models/AuditLog";
import { dataIntegrityChecker } from "../services/dataIntegrityService";
import { alertingService } from "../observability/alerting";
import { logger } from "../observability";

/**
 * Compliance Management Routes
 * 
 * Admin endpoints for:
 * - Audit log queries and exports
 * - Data integrity checks
 * - Compliance reporting
 * - Alert management
 * 
 * Usage:
 * import complianceRoutes from "./compliance";
 * app.use("/admin", complianceRoutes);
 */

const router = express.Router();

/**
 * GET /admin/audit-logs
 * Query audit logs with filtering
 * 
 * Query Parameters:
 * - userId: Filter by user ID
 * - collection: Filter by collection name
 * - action: Filter by action (create, update, delete, restore)
 * - days: Look back N days (default: 30)
 * - limit: Max results (default: 100, max: 1000)
 * - offset: Pagination offset (default: 0)
 */
router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      collection,
      action,
      days = 30,
      limit = 100,
      offset = 0,
    } = req.query;

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

/**
 * GET /admin/audit-logs/:documentId
 * Get full history for a document
 */
router.get("/audit-logs/:documentId", async (req: Request, res: Response) => {
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

/**
 * GET /admin/audit-export
 * Export audit logs as CSV
 * 
 * Query Parameters:
 * - startDate: ISO date (default: 30 days ago)
 * - endDate: ISO date (default: now)
 * - collection: Filter by collection
 */
router.get("/audit-export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, collection } = req.query;

    const query: any = {
      timestamp: {
        $gte: new Date(startDate as string || Date.now() - 30 * 86400000),
        $lte: new Date(endDate as string || Date.now()),
      },
    };

    if (collection) query.collectionName = collection;

    const logs = await AuditLog.find(query).lean();

    // Convert to CSV
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

/**
 * GET /admin/integrity-status
 * Get current data integrity status
 */
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

/**
 * POST /admin/integrity-check
 * Manually trigger integrity check
 */
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

/**
 * GET /admin/compliance-report
 * Generate compliance summary report
 * 
 * Query Parameters:
 * - days: Look back N days (default: 30)
 */
router.get("/compliance-report", async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string);

    const startDate = new Date(Date.now() - daysNum * 86400000);

    // Get audit stats
    const auditStats = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get changes by user
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

    // Get changes by collection
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

    // Get recent deletes
    const recentDeletes = await AuditLog.find({
      action: "delete",
      timestamp: { $gte: startDate },
    })
      .select("documentId collectionName userEmail timestamp")
      .limit(10)
      .lean();

    // Get integrity status
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

/**
 * GET /admin/compliance-violations
 * Get recent compliance violations
 * 
 * Query Parameters:
 * - severity: Filter by severity (critical, high, medium, low)
 * - days: Look back N days (default: 7)
 */
router.get(
  "/compliance-violations",
  async (req: Request, res: Response) => {
    try {
      const { severity, days = 7 } = req.query;

      // Get recent alerts
      const alerts = await AuditLog.find({
        errorMessage: { $exists: true },
        timestamp: {
          $gte: new Date(Date.now() - parseInt(days as string) * 86400000),
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

/**
 * POST /admin/alert-test
 * Send test alert to configured channels
 */
router.post("/alert-test", async (req: Request, res: Response) => {
  try {
    const { channel = "slack" } = req.body;

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

/**
 * GET /admin/metrics/compliance
 * Get compliance metrics snapshot
 */
router.get("/metrics/compliance", async (req: Request, res: Response) => {
  try {
    // Get recent stats
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

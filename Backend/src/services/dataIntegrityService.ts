import { logger } from "../observability";
import AuditLog from "../models/AuditLog";
import {
  recordOrphanedDocuments,
  recordSoftDeletedCount,
} from "../observability/complianceMetrics";
import ReferentialIntegrityValidator from "../middleware/referentialIntegrity";
import { alertDataIntegrityIssue } from "../observability/alerting";
import { getModelIfRegistered, resolveModelByCollection } from "../utils/mongooseModelResolver";

/**
 * Data Integrity Check Service
 * 
 * Periodically validates:
 * - Referential integrity (no orphaned documents)
 * - Soft delete consistency
 * - Cascade delete completeness
 * - Audit trail completeness
 */

export class DataIntegrityChecker {
  private validator: ReferentialIntegrityValidator;
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private missingModelsLogged = new Set<string>();

  constructor() {
    this.validator = new ReferentialIntegrityValidator();
  }

  /**
   * Start periodic integrity checks
   */
  startPeriodicChecks(intervalMs = 3600000) {
    // Default: 1 hour
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    logger.info(
      { intervalMs },
      "Starting periodic data integrity checks"
    );

    this.checkInterval = setInterval(async () => {
      await this.runFullIntegrityCheck();
    }, intervalMs);

    // Run immediately on startup
    this.runFullIntegrityCheck();
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info("Stopped periodic data integrity checks");
    }
  }

  /**
   * Run full integrity check
   */
  async runFullIntegrityCheck() {
    if (this.isRunning) {
      logger.warn("Integrity check already running");
      return;
    }

    this.isRunning = true;

    try {
      const startTime = Date.now();
      const results = {
        orphanedDocuments: [] as any[],
        softDeletedCounts: {} as Record<string, number>,
        auditTrailGaps: [] as any[],
        integrityViolations: [] as string[],
      };

      // Check for orphaned documents
      const collections = [
        "resumes",
        "aiusages",
        "resumedownloadjobs",
        "atsanalyses",
        "resumeversions",
      ];

      for (const collection of collections) {
        try {
          const orphans = await this.validator.findOrphanedDocuments(collection);
          if (orphans.length > 0) {
            results.orphanedDocuments.push({
              collection,
              count: orphans.length,
              documents: orphans.slice(0, 10), // First 10 for investigation
            });
            recordOrphanedDocuments(collection, "ref_field", orphans.length);

            // Alert if critical number of orphans found
            if (orphans.length > 100) {
              await alertDataIntegrityIssue(
                `High number of orphaned documents in ${collection}`,
                `Found ${orphans.length} orphaned documents`,
                collection,
                { count: orphans.length }
              );
            }
          }
        } catch (error) {
          logger.warn(
            { error, collection },
            "Error checking orphaned documents"
          );
          results.integrityViolations.push(`Failed to check ${collection}`);
        }
      }

      // Check soft delete counts
      for (const collection of collections) {
        try {
          const Model = resolveModelByCollection(collection);
          if (!Model) {
            this.logMissingModel(`collection:${collection}`);
            continue;
          }
          const query: Record<string, any> = { deletedAt: { $exists: true, $ne: null } };
          const softDeletedCount = await (Model as any).countDocuments(query);
          results.softDeletedCounts[collection] = softDeletedCount;
          recordSoftDeletedCount(collection, softDeletedCount);
        } catch (error) {
          logger.warn(
            { error, collection },
            "Error checking soft deleted count"
          );
        }
      }

      // Check audit trail completeness
      const auditGaps = await this.findAuditTrailGaps();
      results.auditTrailGaps = auditGaps;

      const duration = Date.now() - startTime;
      logger.info(
        { ...results, durationMs: duration },
        "Data integrity check completed"
      );

      return results;
    } catch (error) {
      logger.error({ error }, "Data integrity check failed");
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Find audit trail gaps
   */
  private async findAuditTrailGaps() {
    const gaps = [];

    try {
      // Find documents without corresponding audit logs
      const collections = ["User", "Resume", "Template"];

      for (const collectionName of collections) {
        try {
          const Model = getModelIfRegistered(collectionName) as any;
          if (!Model) {
            this.logMissingModel(collectionName);
            continue;
          }
          const recentDocs = await (Model as any).find({})
            .select("_id createdAt")
            .lean();

          for (const doc of recentDocs) {
            const auditLog = await AuditLog.findOne({
              documentId: doc._id,
              collectionName: collectionName.toLowerCase(),
              action: "create",
            }).lean();

            if (!auditLog) {
              gaps.push({
                collection: collectionName,
                documentId: doc._id,
                createdAt: doc.createdAt,
              });
            }
          }
        } catch (error) {
          logger.warn(
            { error, collection: collectionName },
            "Error checking audit trail"
          );
        }
      }
    } catch (error) {
      logger.warn({ error }, "Error finding audit trail gaps");
    }

    return gaps;
  }

  /**
   * Validate a specific operation before execution
   */
  async validateBeforeOperation(
    collection: string,
    data: Record<string, any>,
    operation: "create" | "update" = "create"
  ) {
    const validation = await this.validator.validate(collection, data, operation);

    if (!validation.valid) {
      throw new Error(
        `Referential integrity validation failed: ${validation.errors.join("; ")}`
      );
    }

    return validation;
  }

  /**
   * Get integrity status
   */
  async getIntegrityStatus() {
    const auditLogCount = await AuditLog.countDocuments();
    const orphanCounts: Record<string, number> = {};

    for (const collection of [
      "resumes",
      "aiusages",
      "resumedownloadjobs",
    ]) {
      const orphans = await this.validator.findOrphanedDocuments(collection);
      orphanCounts[collection] = orphans.length;
    }

    return {
      auditLogCount,
      orphanDocuments: orphanCounts,
      totalOrphans: Object.values(orphanCounts).reduce((a, b) => a + b, 0),
      isHealthy: Object.values(orphanCounts).every((count) => count === 0),
    };
  }

  private logMissingModel(modelName: string) {
    if (this.missingModelsLogged.has(modelName)) return;
    this.missingModelsLogged.add(modelName);
    logger.warn({ modelName }, "Mongoose model not registered");
  }
}

// Export singleton
export const dataIntegrityChecker = new DataIntegrityChecker();

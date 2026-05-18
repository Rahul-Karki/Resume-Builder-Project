import { Response, Request, NextFunction } from "express";
import mongoose from "mongoose";
import { logger } from "../observability";
import AuditLog, { IAuditLog } from "../models/AuditLog";
import { getAuditContext, runWithAuditContext } from "../models/plugins/auditTrail";

/**
 * Referential Integrity Validator
 * 
 * Ensures that foreign key references exist before allowing operations
 * Prevents orphaned documents and data inconsistencies
 * 
 * Configuration:
 * const validator = new ReferentialIntegrityValidator([
 *   { model: "User", field: "_id" },
 *   { model: "Template", field: "_id" },
 * ]);
 * 
 * app.use(validator.middleware);
 * 
 * In controllers:
 * await validator.validate("Resume", { userId: someId });
 */

interface ForeignKeyConfig {
  model: string;
  field: string; // field in parent model
  message?: string;
}

interface ValidationRule {
  collection: string;
  field: string; // field in this collection
  references: ForeignKeyConfig;
  allowNull?: boolean;
}

export class ReferentialIntegrityValidator {
  private rules: ValidationRule[] = [];
  private referenceCache = new Map<string, Set<string>>();

  constructor(rules: ValidationRule[] = []) {
    this.rules = rules;
    this.setupDefaultRules();
  }

  private setupDefaultRules() {
    // Default referential integrity rules
    const defaultRules: ValidationRule[] = [
      {
        collection: "resumes",
        field: "userId",
        references: { model: "User", field: "_id" },
        allowNull: false,
      },
      {
        collection: "aiusages",
        field: "userId",
        references: { model: "User", field: "_id" },
        allowNull: false,
      },
      {
        collection: "resumedownloadjobs",
        field: "userId",
        references: { model: "User", field: "_id" },
        allowNull: false,
      },
      {
        collection: "atsanalyses",
        field: "resumeId",
        references: { model: "Resume", field: "_id" },
        allowNull: false,
      },
      {
        collection: "resumeversions",
        field: "resumeId",
        references: { model: "Resume", field: "_id" },
        allowNull: false,
      },
    ];

    this.rules = [...defaultRules, ...this.rules];
  }

  /**
   * Validate that a foreign key reference exists
   */
  async validate(
    collection: string,
    data: Record<string, any>,
    operation: "create" | "update" = "create"
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const relevantRules = this.rules.filter((r) => r.collection === collection);

    for (const rule of relevantRules) {
      const value = data[rule.field];

      // Skip validation if null and allowed
      if ((value === null || value === undefined) && rule.allowNull) {
        continue;
      }

      // Error if null and not allowed
      if ((value === null || value === undefined) && !rule.allowNull) {
        errors.push(
          `Field '${rule.field}' is required and cannot be null`
        );
        continue;
      }

      // Validate reference exists
      const Model = mongoose.model(rule.references.model);
      if (Model) {
        const exists = await this.documentExists(
          rule.references.model,
          value
        );

        if (!exists) {
          errors.push(
            `Reference error: ${rule.references.model} with ${rule.references.field} '${value}' does not exist`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate orphaned documents (references to non-existent parents)
   */
  async findOrphanedDocuments(collection: string): Promise<any[]> {
    const relevantRules = this.rules.filter((r) => r.collection === collection);
    const orphans: any[] = [];

    for (const rule of relevantRules) {
      try {
        const Model = mongoose.model(rule.references.model);
        const ChildModel = mongoose.model(
          collection.charAt(0).toUpperCase() + collection.slice(1)
        );

        if (!Model || !ChildModel) continue;

        // Find documents with non-existent references
        const parentIds = await Model.find({}, { _id: 1 }).lean();
        const parentIdSet = new Set(parentIds.map((p) => p._id.toString()));

        const orphaned = await ChildModel.find({
          [rule.field]: { $nin: parentIds.map((p) => p._id) },
        }).lean();

        orphans.push(...orphaned);
      } catch (error) {
        logger.warn(
          { error, collection, rule },
          "Error checking for orphaned documents"
        );
      }
    }

    return orphans;
  }

  /**
   * Cache-aware document existence check
   */
  private async documentExists(model: string, id: any): Promise<boolean> {
    // Check cache first
    const cacheKey = `${model}:${id}`;
    if (this.referenceCache.has(cacheKey)) {
      return this.referenceCache.get(cacheKey)!.size > 0;
    }

    try {
      const Model = mongoose.model(model);
      const doc = await Model.findById(id).select("_id").lean();

      // Cache result for 5 seconds
      this.referenceCache.set(cacheKey, new Set([id]));
      setTimeout(() => this.referenceCache.delete(cacheKey), 5000);

      return !!doc;
    } catch (error) {
      logger.warn({ error, model, id }, "Error checking document existence");
      return false;
    }
  }

  /**
   * Express middleware to validate incoming requests
   */
  middleware = (req: Request, res: Response, next: NextFunction) => {
    // Store validation function on request for use in controllers
    (req as any).validateRefIntegrity = async (
      collection: string,
      data: Record<string, any>
    ) => {
      return this.validate(collection, data);
    };

    next();
  };
}

/**
 * Middleware to set audit context from request
 */
export const auditContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId; // Set by auth middleware
  const userEmail = (req as any).userEmail;

  // Create audit context and run next middleware with it
  const context = {
    userId: userId?.toString(),
    userEmail,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    endpoint: req.path,
    method: req.method as any,
  };

  (req as any).auditContext = context;

  // Wrap response.send to capture status code
  const originalSend = res.send;
  res.send = function (data: any) {
    (req as any).auditContext.statusCode = res.statusCode;
    return originalSend.call(this, data);
  };

  next();
};

export default ReferentialIntegrityValidator;

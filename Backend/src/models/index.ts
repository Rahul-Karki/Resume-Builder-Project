// Registers all Mongoose models at startup to avoid MissingSchemaError.
// Applies compliance plugins (audit trail, soft delete, cascade delete) to all models
import mongoose from "mongoose";
import { appMetrics, promDbOperationsTotal, promDbErrorsTotal } from "../observability";
import { auditTrailPlugin } from "./plugins/auditTrail";
import { softDeletePlugin } from "./plugins/softDelete";
import { cascadeDeletePlugin } from "./plugins/cascadeDelete";

// Track query durations via OTel db_query_duration_ms histogram
mongoose.plugin((schema) => {
  const wrappedMethods = ["find", "findOne", "findOneAndUpdate", "findOneAndDelete", "findOneAndReplace", "updateOne", "updateMany", "deleteOne", "deleteMany", "countDocuments", "estimatedDocumentCount", "distinct", "aggregate"];
  for (const method of wrappedMethods) {
    schema.pre(method as any, function (this: any, next: () => void) {
      this._startTime = Date.now();
      next();
    });
    schema.post(method as any, function (this: any) {
      if (this._startTime) {
        const durationMs = Date.now() - this._startTime;
        const model = this.model?.modelName ?? "unknown";
        appMetrics.dbQueryDuration.record(durationMs, {
          operation: method,
          model,
        });
        promDbOperationsTotal.labels(method, model, "success").inc();
        appMetrics.dbOperationsTotal.add(1, { operation: method, model, status: "success" });
      }
    });
    schema.post(method as any, function (this: any, error: any, doc: any, next: any) {
      if (error) {
        const model = this.model?.modelName ?? "unknown";
        promDbOperationsTotal.labels(method, model, "error").inc();
        appMetrics.dbOperationsTotal.add(1, { operation: method, model, status: "error" });
        promDbErrorsTotal.labels(method, model).inc();
        appMetrics.dbErrorsTotal.add(1, { operation: method, model });
        next(error);
        return;
      }
      next();
    });
  }
});

// Apply global plugins to all schemas globally
// This ensures every model has audit trail, soft delete, and cascade delete support
mongoose.plugin(auditTrailPlugin as any);
mongoose.plugin(softDeletePlugin as any);

// Cascade delete rules for parent-child relationships
// When a User is deleted, cascade to their Resume, AiUsage, ResumeDownloadJob records
mongoose.plugin(cascadeDeletePlugin as any, {
  cascadeRules: [
    { model: "Resume", field: "userId" },
    { model: "AiUsage", field: "userId" },
    { model: "ResumeVersion", field: "userId" },
    { model: "ResumeDownloadJob", field: "userId" },
    { model: "AtsAnalysis", field: "resumeId" },
  ],
});

import "./User";
import "./Resume";
import "./ResumeVersion";
import "./ResumeDownloadJob";
import "./AtsAnalysis";
import "./AiUsage";
import "./Template";
import "./TemplateUsage";
import "./ResetToken";
import "./AuditLog";
import "./Jobs";
import "./PendingUser";

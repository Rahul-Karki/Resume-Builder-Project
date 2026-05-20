// Registers all Mongoose models at startup to avoid MissingSchemaError.
// Applies compliance plugins (audit trail, soft delete, cascade delete) to all models
import mongoose from "mongoose";
import { auditTrailPlugin } from "./plugins/auditTrail";
import { softDeletePlugin } from "./plugins/softDelete";
import { cascadeDeletePlugin } from "./plugins/cascadeDelete";

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
import "./WorkerHeartbeat";
import "./Jobs";

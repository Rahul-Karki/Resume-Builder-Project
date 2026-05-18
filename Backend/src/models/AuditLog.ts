import mongoose, { Document, Schema } from "mongoose";

/**
 * AuditLog Model - Track all data modifications for compliance
 * 
 * Purpose:
 * - Maintain compliance audit trails
 * - Track who modified what and when
 * - Support data recovery and forensics
 * - Enable compliance reporting
 */

export interface IAuditLog extends Document {
  // Identification
  collectionName: string;
  documentId: mongoose.Types.ObjectId;
  
  // User Info
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Operation Details
  action: "create" | "update" | "delete" | "restore";
  changes?: {
    field: string;
    before: any;
    after: any;
  }[];
  
  // Change Tracking
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Context
  endpoint?: string;
  method?: string;
  statusCode?: number;
  errorMessage?: string;
  
  // Timestamps
  timestamp: Date;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    collectionName: {
      type: String,
      required: true,
      index: true,
    },

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true,
    },

    userEmail: {
      type: String,
      sparse: true,
    },

    ipAddress: {
      type: String,
      sparse: true,
    },

    userAgent: {
      type: String,
      sparse: true,
    },

    action: {
      type: String,
      enum: ["create", "update", "delete", "restore"],
      required: true,
      index: true,
    },

    changes: [
      {
        field: String,
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
      },
    ],

    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      sparse: true,
    },

    newValues: {
      type: mongoose.Schema.Types.Mixed,
      sparse: true,
    },

    endpoint: {
      type: String,
      sparse: true,
    },

    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "internal"],
      default: "internal",
    },

    statusCode: {
      type: Number,
      sparse: true,
    },

    errorMessage: {
      type: String,
      sparse: true,
    },

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "auditLogs",
    timestamps: false,
  }
);

// TTL Index: Keep audit logs for 1 year
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Composite index for common queries
AuditLogSchema.index({ documentId: 1, collectionName: 1, action: 1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

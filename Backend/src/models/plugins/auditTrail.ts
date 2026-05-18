import { Schema, Document } from "mongoose";
import AuditLog from "../AuditLog";

/**
 * Audit Trail Plugin
 * 
 * Automatically logs all document modifications (create, update, delete) for compliance
 * 
 * Usage:
 * mongoose.plugin(auditTrailPlugin as any);
 * 
 * Then register context during request handling:
 * req.auditContext = { userId, userEmail, ipAddress, userAgent, endpoint, method };
 */

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "internal";
  statusCode?: number;
}

// Store audit context in AsyncLocalStorage for request-scoped access
import { AsyncLocalStorage } from "async_hooks";

const auditContextStore = new AsyncLocalStorage<AuditContext>();

export const getAuditContext = (): AuditContext | undefined => {
  return auditContextStore.getStore();
};

export const runWithAuditContext = <T>(context: AuditContext, fn: () => T): T => {
  return auditContextStore.run(context, fn);
};

export function auditTrailPlugin(schema: Schema) {
  // Skip audit logging for AuditLog itself
  const modelName = schema.get("collection");
  if (modelName === "auditlogs" || modelName === "auditLogs") {
    return;
  }

  // Track original values before save
  schema.pre("save", async function () {
    const doc = this as any;
    
    if (!doc._auditOriginal) {
      doc._auditOriginal = doc.isNew ? null : JSON.parse(JSON.stringify(doc.toObject()));
    }
  });

  // Log after save (create/update)
  schema.post("save", async function () {
    const doc = this as any;
    const context = getAuditContext();

    try {
      const isCreate = !doc._auditOriginal;
      const action = isCreate ? "create" : "update";

      // Calculate changes only for updates
      let changes: Array<{ field: string; before: any; after: any }> = [];
      if (!isCreate && doc._auditOriginal) {
        const current = doc.toObject();
        changes = getChangedFields(doc._auditOriginal, current);
      }

      await AuditLog.create({
        collectionName: schema.get("collection"),
        documentId: doc._id,
        userId: context?.userId,
        userEmail: context?.userEmail,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        action,
        changes,
        oldValues: isCreate ? undefined : doc._auditOriginal,
        newValues: doc.toObject(),
        endpoint: context?.endpoint,
        method: context?.method || "internal",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't fail the operation if audit logging fails
    }

    // Clean up
    delete doc._auditOriginal;
  });

  // Log deletes (hard delete)
  schema.post("deleteOne", async function () {
    const filter = (this as any).getFilter();
    const context = getAuditContext();

    try {
      // Get the document before deletion (we don't have it here, but log the deletion)
      await AuditLog.create({
        collectionName: schema.get("collection"),
        documentId: filter._id || filter.id,
        userId: context?.userId,
        userEmail: context?.userEmail,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        action: "delete",
        endpoint: context?.endpoint,
        method: context?.method || "internal",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to create delete audit log:", error);
    }
  });

  // Log soft deletes
  schema.post("save", async function () {
    const doc = this as any;
    const context = getAuditContext();

    if (doc.deletedAt && (!doc._auditOriginal || !doc._auditOriginal.deletedAt)) {
      try {
        await AuditLog.create({
          collectionName: schema.get("collection"),
          documentId: doc._id,
          userId: context?.userId,
          userEmail: context?.userEmail,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          action: "delete",
          oldValues: doc._auditOriginal,
          newValues: { deletedAt: doc.deletedAt },
          endpoint: context?.endpoint,
          method: context?.method || "internal",
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Failed to create soft delete audit log:", error);
      }
    }
  });

  // Log restores
  schema.post("save", async function () {
    const doc = this as any;
    const context = getAuditContext();

    if (!doc.deletedAt && doc._auditOriginal?.deletedAt) {
      try {
        await AuditLog.create({
          collectionName: schema.get("collection"),
          documentId: doc._id,
          userId: context?.userId,
          userEmail: context?.userEmail,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          action: "restore",
          endpoint: context?.endpoint,
          method: context?.method || "internal",
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Failed to create restore audit log:", error);
      }
    }
  });
}

function getChangedFields(
  before: Record<string, any>,
  after: Record<string, any>
): Array<{ field: string; before: any; after: any }> {
  const changes = [];
  const fieldsToIgnore = [
    "__v",
    "_auditOriginal",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ];

  // Check all fields in after
  for (const field of Object.keys(after)) {
    if (fieldsToIgnore.includes(field)) continue;

    const beforeValue = before[field];
    const afterValue = after[field];

    // Compare values (handle objects/arrays with JSON stringify)
    const beforeStr = JSON.stringify(beforeValue);
    const afterStr = JSON.stringify(afterValue);

    if (beforeStr !== afterStr) {
      changes.push({
        field,
        before: beforeValue,
        after: afterValue,
      });
    }
  }

  return changes;
}

export default auditTrailPlugin;

import { describe, it, expect } from "vitest";
import AuditLog from "../../models/AuditLog";

describe("AuditLog model", () => {
  it("should create an audit entry with action and changes", () => {
    const paths = AuditLog.schema.paths;
    expect(paths.collectionName.options.required).toBe(true);
    expect(paths.documentId.options.required).toBe(true);
    expect(paths.action.options.required).toBe(true);
    expect(paths.timestamp.options.required).toBe(true);
    expect(paths.changes).toBeDefined();
  });

  it("should validate the action enum", () => {
    const actionPath = AuditLog.schema.path("action") as any;
    expect(actionPath.options.enum).toContain("create");
    expect(actionPath.options.enum).toContain("update");
    expect(actionPath.options.enum).toContain("delete");
    expect(actionPath.options.enum).toContain("restore");

    const methodPath = AuditLog.schema.path("method") as any;
    expect(methodPath.options.enum).toContain("GET");
    expect(methodPath.options.enum).toContain("POST");
    expect(methodPath.options.enum).toContain("PUT");
    expect(methodPath.options.enum).toContain("PATCH");
    expect(methodPath.options.enum).toContain("DELETE");
    expect(methodPath.options.enum).toContain("internal");
  });

  it("should store old and new values for updates", () => {
    const paths = AuditLog.schema.paths;
    expect(paths.oldValues).toBeDefined();
    expect(paths.newValues).toBeDefined();
    expect(paths.userId).toBeDefined();
    expect(paths.userEmail).toBeDefined();
    expect(paths.ipAddress).toBeDefined();
    expect(paths.userAgent).toBeDefined();
    expect(paths.endpoint).toBeDefined();
  });

  it("should have a TTL index on createdAt", () => {
    const indexes = AuditLog.schema.indexes();
    const ttlIndex = indexes.find(([key]) => JSON.stringify(key) === JSON.stringify({ createdAt: 1 }));
    expect(ttlIndex).toBeDefined();
    if (ttlIndex) {
      expect(ttlIndex[1].expireAfterSeconds).toBe(31536000);
    }
  });
});

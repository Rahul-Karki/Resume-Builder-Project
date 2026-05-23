import { describe, it, expect, vi } from "vitest";
import mongoose, { Schema } from "mongoose";
import { auditTrailPlugin, getAuditContext, runWithAuditContext } from "../../models/plugins/auditTrail";
import { softDeletePlugin } from "../../models/plugins/softDelete";
import { cascadeDeletePlugin } from "../../models/plugins/cascadeDelete";

function getHookCount(schema: Schema, hookType: "pre" | "post", event: string): number {
  const store = hookType === "pre" ? (schema as any).s.hooks._pres : (schema as any).s.hooks._posts;
  const hooks = store.get(event);
  return hooks ? hooks.length : 0;
}

describe("Mongoose plugins", () => {
  describe("auditTrailPlugin", () => {
    it("should create an AuditLog entry on create", () => {
      const schema = new Schema({ name: String }, { collection: "test" });
      auditTrailPlugin(schema);
      expect(getHookCount(schema, "pre", "save")).toBeGreaterThanOrEqual(1);
      expect(getHookCount(schema, "post", "save")).toBeGreaterThanOrEqual(3);
    });

    it("should create an AuditLog entry on update", () => {
      const schema = new Schema({ name: String }, { collection: "test" });
      auditTrailPlugin(schema);
      const postSaveCount = getHookCount(schema, "post", "save");
      expect(postSaveCount).toBeGreaterThanOrEqual(3);
    });

    it("should create an AuditLog entry on delete", () => {
      const schema = new Schema({ name: String }, { collection: "test" });
      auditTrailPlugin(schema);
      expect(getHookCount(schema, "post", "deleteOne")).toBeGreaterThanOrEqual(1);
    });

    it("should include the user ID from async context", () => {
      const testUser = "user123";
      runWithAuditContext({ userId: testUser }, () => {
        const context = getAuditContext();
        expect(context).toBeDefined();
        expect(context!.userId).toBe(testUser);
      });
    });
  });

  describe("softDeletePlugin", () => {
    it("should set deletedAt on soft delete", () => {
      const schema = new Schema({ name: String });
      expect(schema.path("deletedAt")).toBeUndefined();
      softDeletePlugin(schema);
      expect(schema.path("deletedAt")).toBeDefined();
      expect(schema.methods.softDelete).toBeDefined();
      expect(typeof schema.methods.softDelete).toBe("function");
    });

    it("should exclude soft-deleted documents from normal queries", () => {
      const schema = new Schema({ name: String });
      softDeletePlugin(schema);
      expect(getHookCount(schema, "pre", "find")).toBeGreaterThanOrEqual(1);
      expect(getHookCount(schema, "pre", "findOne")).toBeGreaterThanOrEqual(1);
    });

    it("should expose withDeleted() to include soft-deleted docs", () => {
      const schema = new Schema({ name: String });
      softDeletePlugin(schema);
      expect((schema.query as any).withDeleted).toBeDefined();
      expect(typeof (schema.query as any).withDeleted).toBe("function");
    });

    it("should support restore()", () => {
      const schema = new Schema({ name: String });
      softDeletePlugin(schema);
      expect(schema.methods.restore).toBeDefined();
      expect(typeof schema.methods.restore).toBe("function");
    });
  });

  describe("cascadeDeletePlugin", () => {
    it("should delete child documents when parent is deleted", () => {
      const schema = new Schema({ name: String });
      cascadeDeletePlugin(schema, { cascadeRules: [{ model: "Child", field: "parentId" }] });
      expect(getHookCount(schema, "pre", "deleteOne")).toBeGreaterThanOrEqual(1);
      expect(getHookCount(schema, "pre", "findOneAndDelete")).toBeGreaterThanOrEqual(1);
    });

    it("should handle missing child collections gracefully", () => {
      const schema = new Schema({ name: String });
      expect(() => cascadeDeletePlugin(schema, { cascadeRules: [{ model: "Nonexistent", field: "parentId" }] })).not.toThrow();
    });
  });
});

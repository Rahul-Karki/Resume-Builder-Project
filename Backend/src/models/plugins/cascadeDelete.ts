import { Schema, Document, Model } from "mongoose";

/**
 * Cascade Delete Plugin
 * 
 * Automatically deletes child documents when parent is deleted
 * Prevents orphaned documents and data corruption
 * 
 * Configuration:
 * 
 * // In child model schema:
 * schema.plugin(cascadeDeletePlugin, {
 *   model: "ParentModel",
 *   field: "parentId"  // field that references parent
 * });
 * 
 * OR define cascade rules in parent model:
 * 
 * // In parent model:
 * const cascadeRules = [
 *   { model: "Resume", field: "userId" },
 *   { model: "AiUsage", field: "userId" },
 * ];
 * schema.plugin(cascadeDeletePlugin, { cascadeRules });
 */

interface CascadeRule {
  model: string;
  field: string; // field in child model that references parent
}

interface CascadePluginOptions {
  model?: string; // parent model name
  field?: string; // field in this schema that references parent
  cascadeRules?: CascadeRule[]; // rules for parent model to delete children
}

export function cascadeDeletePlugin(
  schema: Schema,
  options: CascadePluginOptions = {}
) {
  // Case 1: This model is a child - when parent is deleted, delete children
  if (options.model && options.field) {
    const parentModel = options.model;
    const referenceField = options.field;

    schema.pre("deleteOne", async function () {
      const filter = (this as any).getFilter();
      const ChildModel = (this as any).model;

      try {
        // Don't cascade if the parent is also being deleted
        // (parent will handle its own cascades)
        await ChildModel.deleteMany({
          [referenceField]: filter[referenceField] || filter._id,
        });
      } catch (error) {
        console.error(
          `Cascade delete failed for ${ChildModel.modelName}:`,
          error
        );
        throw error;
      }
    });

    // Also handle soft deletes
    schema.post("save", async function () {
      const doc = this as any;

      if (doc.deletedAt && (!this.get("_previousDeletedAt"))) {
        const ChildModel = (this as any).constructor;
        try {
          await ChildModel.updateMany(
            { [referenceField]: doc._id },
            { deletedAt: new Date() }
          );
        } catch (error) {
          console.error(
            `Cascade soft delete failed for ${ChildModel.modelName}:`,
            error
          );
        }
        this.set("_previousDeletedAt", true);
      }
    });
  }

  // Case 2: This is a parent model with cascade rules
  if (options.cascadeRules && Array.isArray(options.cascadeRules)) {
    schema.pre("deleteOne", async function () {
      const filter = (this as any).getFilter();
      const parentId = filter._id || filter.id;

      try {
        for (const rule of options.cascadeRules!) {
          const ChildModel = (this as any).model.collection.conn.model(rule.model);
          if (ChildModel) {
            await ChildModel.deleteMany({
              [rule.field]: parentId,
            });
          }
        }
      } catch (error) {
        console.error("Cascade delete failed:", error);
        throw error;
      }
    });

    // Handle soft deletes
    schema.post("save", async function () {
      const doc = this as any;

      if (doc.deletedAt && (!this.get("_previousDeletedAt"))) {
        try {
          for (const rule of options.cascadeRules!) {
            const ChildModel = (this as any).model.collection.conn.model(rule.model);
            if (ChildModel) {
              await ChildModel.updateMany(
                { [rule.field]: doc._id },
                { deletedAt: new Date() }
              );
            }
          }
        } catch (error) {
          console.error("Cascade soft delete failed:", error);
        }
        this.set("_previousDeletedAt", true);
      }
    });
  }
}

export default cascadeDeletePlugin;

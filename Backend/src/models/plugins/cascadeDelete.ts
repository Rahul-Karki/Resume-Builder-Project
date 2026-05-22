import { Schema, Document, Model } from "mongoose";

interface CascadeRule {
  model: string;
  field: string;
}

interface CascadePluginOptions {
  model?: string;
  field?: string;
  cascadeRules?: CascadeRule[];
}

function getParentIdFromFilter(filter: Record<string, any>): any {
  if (filter._id) return filter._id;
  if (filter.id) return filter.id;
  for (const key of Object.keys(filter)) {
    if (key === "_id" || key === "id") continue;
    const val = filter[key];
    if (val && typeof val === "object" && "$in" in val && Array.isArray(val.$in)) {
      return val.$in;
    }
  }
  return filter._id;
}

function extractParentId(context: any): any {
  const filter = context.getFilter?.() || context.getQuery?.() || {};
  return getParentIdFromFilter(filter);
}

export function cascadeDeletePlugin(
  schema: Schema,
  options: CascadePluginOptions = {}
) {
  const handleDeleteOne = async function (this: any) {
    const filter = this.getFilter();
    const parentId = filter._id || filter.id;
    if (!parentId) return;
    const ChildModel = this.model;
    try {
      await ChildModel.deleteMany({ [options.field!]: parentId });
    } catch (error) {
      console.error(`Cascade delete failed for ${ChildModel.modelName}:`, error);
      throw error;
    }
  };

  const handleFindOneAndDelete = async function (this: any) {
    const filter = this.getFilter();
    const parentId = filter._id || filter.id;
    if (!parentId) return;
    const ChildModel = this.model;
    try {
      await ChildModel.deleteMany({ [options.field!]: parentId });
    } catch (error) {
      console.error(`Cascade delete failed for ${ChildModel.modelName}:`, error);
    }
  };

  const handleSoftDeleteSave = async function (this: any) {
    const doc = this as any;
    if (doc.deletedAt && !doc.get("_previousDeletedAt")) {
      const ChildModel = doc.constructor;
      try {
        await ChildModel.updateMany(
          { [options.field!]: doc._id },
          { deletedAt: new Date() }
        );
      } catch (error) {
        console.error(`Cascade soft delete failed for ${ChildModel.modelName}:`, error);
      }
      doc.set("_previousDeletedAt", true);
    }
  };

  const handleParentDeleteOne = async function (this: any) {
    const filter = this.getFilter();
    const parentId = filter._id || filter.id;
    if (!parentId) return;
    try {
      for (const rule of options.cascadeRules!) {
        const ChildModel = this.model.collection.conn.model(rule.model);
        if (ChildModel) {
          await ChildModel.deleteMany({ [rule.field]: parentId });
        }
      }
    } catch (error) {
      console.error("Cascade delete failed:", error);
      throw error;
    }
  };

  const handleParentFindOneAndDelete = async function (this: any) {
    const filter = this.getFilter();
    const parentId = filter._id || filter.id;
    if (!parentId) return;
    try {
      for (const rule of options.cascadeRules!) {
        const ChildModel = this.model.collection.conn.model(rule.model);
        if (ChildModel) {
          await ChildModel.deleteMany({ [rule.field]: parentId });
        }
      }
    } catch (error) {
      console.error("Cascade delete failed:", error);
    }
  };

  const handleParentSoftDeleteSave = async function (this: any) {
    const doc = this as any;
    if (doc.deletedAt && !doc.get("_previousDeletedAt")) {
      try {
        for (const rule of options.cascadeRules!) {
          const ChildModel = doc.constructor.collection.conn.model(rule.model);
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
      doc.set("_previousDeletedAt", true);
    }
  };

  // ── Case 1: Child model ────────────────────────────────────────────────
  if (options.model && options.field) {
    schema.pre("deleteOne", handleDeleteOne);
    schema.pre("findOneAndDelete", handleFindOneAndDelete);
    schema.post("save", handleSoftDeleteSave);
  }

  // ── Case 2: Parent model with cascade rules ────────────────────────────
  if (options.cascadeRules && Array.isArray(options.cascadeRules)) {
    schema.pre("deleteOne", handleParentDeleteOne);
    schema.pre("findOneAndDelete", handleParentFindOneAndDelete);
    schema.post("save", handleParentSoftDeleteSave);
  }
}

export default cascadeDeletePlugin;

import { Schema, Document, model, Query } from "mongoose";

interface SoftDeleteDocument extends Document {
  deletedAt?: Date | null;
  softDelete?: () => Promise<void>;
  restore?: () => Promise<void>;
}

export function softDeletePlugin(schema: Schema) {
  // add deletedAt field
  schema.add({ deletedAt: { type: Date, required: false, default: null } });

  // instance methods
  schema.methods.softDelete = async function (this: SoftDeleteDocument) {
    this.deletedAt = new Date();
    await this.save();
  };

  schema.methods.restore = async function (this: SoftDeleteDocument) {
    this.deletedAt = null;
    await this.save();
  };

  // query helpers: by default exclude soft-deleted documents
  function addNotDeleted(this: Query<any, any>) {
    // if query explicitly asks to include deleted documents, skip
    // we expose `.withDeleted()` helper to opt-in
    if ((this as any)._withDeleted) return this;
    return this.where({ deletedAt: null });
  }

  schema.pre("find", function () {
    // @ts-ignore
    addNotDeleted.call(this);
  });
  schema.pre("findOne", function () {
    // @ts-ignore
    addNotDeleted.call(this);
  });
  schema.pre("countDocuments", function () {
    // @ts-ignore
    addNotDeleted.call(this);
  });

  // query helper to include deleted docs
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - augment query type at runtime
  (schema as any).query.withDeleted = function () {
    // @ts-ignore
    (this as any)._withDeleted = true;
    return this;
  };
}

export default softDeletePlugin;

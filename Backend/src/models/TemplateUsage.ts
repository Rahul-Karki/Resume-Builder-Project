import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────
// One document per (templateId, date bucket).
// Counts are incremented via $inc — no double-counting.

export interface ITemplateUsage extends Document {
  templateId: mongoose.Types.ObjectId;
  layoutId:   string;           // denormalised for fast queries
  date:        Date;             // UTC day-bucket (midnight)
  count:       number;           // total uses that day
  resumesCreated: number;        // new resumes using this template
  resumesEdited:  number;        // edits to existing resumes
}

const TemplateUsageSchema = new Schema<ITemplateUsage>(
  {
    templateId:     { type: Schema.Types.ObjectId, ref: "Template", required: true, index: true },
    layoutId:       { type: String, required: true },
    date:           { type: Date,   required: true },   // day bucket
    count:          { type: Number, default: 0 },
    resumesCreated: { type: Number, default: 0 },
    resumesEdited:  { type: Number, default: 0 },
  },
  { timestamps: false }
);

// Compound unique index: one doc per template per day
TemplateUsageSchema.index({ templateId: 1, date: 1 }, { unique: true });
TemplateUsageSchema.index({ date: 1 });
TemplateUsageSchema.index({ layoutId: 1, date: 1 });

// ─── Static helper: get or create today's bucket ──────────────────────────────

TemplateUsageSchema.statics.getDayBucket = function (date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ─── Static helper: record a use event ────────────────────────────────────────
// Call this from the resume-save endpoint.

TemplateUsageSchema.statics.recordUse = async function (
  templateId: string,
  layoutId:   string,
  type:       "create" | "edit" = "create"
): Promise<void> {
  const bucket = new Date();
  bucket.setUTCHours(0, 0, 0, 0);

  const inc: Record<string, number> = { count: 1 };
  if (type === "create") inc.resumesCreated = 1;
  else                   inc.resumesEdited  = 1;

  await this.findOneAndUpdate(
    { templateId, date: bucket },
    { $inc: inc, $setOnInsert: { layoutId } },
    { upsert: true, new: true }
  );
};

const TemplateUsage: Model<ITemplateUsage> =
  mongoose.models.TemplateUsage ??
  mongoose.model<ITemplateUsage>("TemplateUsage", TemplateUsageSchema);

export default TemplateUsage;
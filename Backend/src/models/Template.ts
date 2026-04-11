import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ICssVars {
  accentColor: string;
  headingColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
  bodyFont: string;
  headingFont: string;
  fontSize: string;
  lineHeight: string;
}

export interface ISlots {
  summary: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  projects: boolean;
  certifications: boolean;
  languages: boolean;
}

export interface ITemplate extends Document {
  layoutId: string;
  name: string;
  description: string;
  category: "professional" | "corporate" | "technical" | "creative" | "academic";
  tag: string;
  thumbnailUrl: string;
  status: "draft" | "published" | "archived";
  isPremium: boolean;
  sortOrder: number;
  cssVars: ICssVars;
  slots: ISlots;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CssVarsSchema = new Schema<ICssVars>({
  accentColor:     { type: String, default: "#1a1a1a" },
  headingColor:    { type: String, default: "#111111" },
  textColor:       { type: String, default: "#333333" },
  mutedColor:      { type: String, default: "#666666" },
  borderColor:     { type: String, default: "#cccccc" },
  backgroundColor: { type: String, default: "#ffffff" },
  bodyFont:        { type: String, default: "EB Garamond, serif" },
  headingFont:     { type: String, default: "EB Garamond, serif" },
  fontSize:        { type: String, default: "10.5pt" },
  lineHeight:      { type: String, default: "1.5" },
}, { _id: false });

const SlotsSchema = new Schema<ISlots>({
  summary:        { type: Boolean, default: true },
  experience:     { type: Boolean, default: true },
  education:      { type: Boolean, default: true },
  skills:         { type: Boolean, default: true },
  projects:       { type: Boolean, default: false },
  certifications: { type: Boolean, default: false },
  languages:      { type: Boolean, default: false },
}, { _id: false });

const TemplateSchema = new Schema<ITemplate>(
  {
    layoutId: {
      type: String, required: true, unique: true, trim: true,
      match: [/^[a-z0-9_-]+$/, "layoutId must be lowercase alphanumeric with hyphens"],
    },
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: "", maxlength: 300 },
    category: {
      type: String,
      enum: ["professional", "corporate", "technical", "creative", "academic"],
      default: "professional",
    },
    tag:          { type: String, default: "General", maxlength: 30 },
    thumbnailUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPremium:   { type: Boolean, default: false },
    sortOrder:   { type: Number, default: 0 },
    cssVars:     { type: CssVarsSchema, default: () => ({}) },
    slots:       { type: SlotsSchema,   default: () => ({}) },
    createdBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

TemplateSchema.index({ status: 1, sortOrder: 1 });
TemplateSchema.index({ category: 1, status: 1 });
TemplateSchema.index({ createdAt: -1 });

// ─── Pre-save hook: set publishedAt on first publish ──────────────────────────

TemplateSchema.pre("save", function () {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// ─── Model ────────────────────────────────────────────────────────────────────

const Template: Model<ITemplate> =
  mongoose.models.Template ?? mongoose.model<ITemplate>("Template", TemplateSchema);

export default Template;
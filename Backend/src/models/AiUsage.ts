import { Schema, model, type Document } from "mongoose";

export interface IAiUsage extends Document {
  userId: string;
  provider: "openai" | "gemini" | "fallback";
  modelName: string;
  feature: "grammar" | "rewrite" | "ats-analysis" | "ats-jd-match" | "unknown";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  success: boolean;
  fallback: boolean;
  createdAt: Date;
}

const AiUsageSchema = new Schema<IAiUsage>(
  {
    userId: { type: String, required: true, index: true },
    provider: { type: String, enum: ["openai", "gemini", "fallback"], required: true, index: true },
    modelName: { type: String, required: true },
    feature: { type: String, enum: ["grammar", "rewrite", "ats-analysis", "ats-jd-match", "unknown"], required: true },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    fallback: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

AiUsageSchema.index({ userId: 1, createdAt: -1 });
AiUsageSchema.index({ provider: 1, createdAt: -1 });
AiUsageSchema.index({ feature: 1, createdAt: -1 });
AiUsageSchema.index({ createdAt: -1 });

export default model<IAiUsage>("AiUsage", AiUsageSchema);

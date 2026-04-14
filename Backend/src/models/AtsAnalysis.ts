import mongoose, { Document, Schema } from "mongoose";

export interface IAtsSuggestion {
  id: string;
  path: string;
  originalText: string;
  suggestionText: string;
  reason: string;
  impact: "low" | "medium" | "high";
}

export interface IAtsAnalysis extends Document {
  resumeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  scoreOverall: number;
  sectionScores: {
    summary: number;
    experience: number;
    skills: number;
    education: number;
    formatting: number;
  };
  missingKeywords: string[];
  rewriteSuggestions: IAtsSuggestion[];
  createdAt: Date;
  updatedAt: Date;
}

const AtsSuggestionSchema = new Schema<IAtsSuggestion>(
  {
    id: { type: String, required: true },
    path: { type: String, required: true },
    originalText: { type: String, required: true },
    suggestionText: { type: String, required: true },
    reason: { type: String, required: true },
    impact: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  },
  { _id: false },
);

const AtsAnalysisSchema = new Schema<IAtsAnalysis>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scoreOverall: { type: Number, required: true, min: 0, max: 100 },
    sectionScores: {
      summary: { type: Number, required: true, min: 0, max: 100 },
      experience: { type: Number, required: true, min: 0, max: 100 },
      skills: { type: Number, required: true, min: 0, max: 100 },
      education: { type: Number, required: true, min: 0, max: 100 },
      formatting: { type: Number, required: true, min: 0, max: 100 },
    },
    missingKeywords: { type: [String], default: [] },
    rewriteSuggestions: { type: [AtsSuggestionSchema], default: [] },
  },
  { timestamps: true },
);

AtsAnalysisSchema.index({ resumeId: 1, userId: 1, updatedAt: -1 });

export default mongoose.model<IAtsAnalysis>("AtsAnalysis", AtsAnalysisSchema);

import mongoose, { Document, Schema } from "mongoose";
import type {
  AiSuggestion,
  AtsGrammarFinding,
  AtsFormattingCheck,
  AtsKeywordAnalysis,
  AtsScoreBreakdown,
} from "../../../shared/src/ai";

export interface IAtsAnalysis extends Document {
  jobId: string;
  resumeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: "pending" | "completed" | "failed";
  reportType: "resume-analysis" | "job-description-match";
  jobTitle?: string;
  jobDescription?: string;
  targetKeywords: string[];
  scoreOverall: number;
  matchScore: number;
  sectionScores: AtsScoreBreakdown;
  keywordAnalysis: AtsKeywordAnalysis;
  grammarIssues: AtsGrammarFinding[];
  formattingChecks: AtsFormattingCheck[];
  rewriteSuggestions: AiSuggestion[];
  summary: string;
  analyzedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const suggestionSchema = new Schema<AiSuggestion>(
  {
    id: { type: String, required: true },
    originalText: { type: String, required: true },
    suggestionText: { type: String, required: true },
    reason: { type: String, required: true },
    impact: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    path: { type: String, default: undefined },
  },
  { _id: false },
);

const grammarFindingSchema = new Schema<AtsGrammarFinding>(
  {
    id: { type: String, required: true },
    path: { type: String, default: undefined },
    originalText: { type: String, required: true },
    suggestionText: { type: String, required: true },
    reason: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  },
  { _id: false },
);

const formattingCheckSchema = new Schema<AtsFormattingCheck>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    passed: { type: Boolean, required: true },
    score: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false },
);

const AtsAnalysisSchema = new Schema<IAtsAnalysis>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending", index: true },
    reportType: { type: String, enum: ["resume-analysis", "job-description-match"], default: "resume-analysis" },
    jobTitle: { type: String, default: "" },
    jobDescription: { type: String, default: "" },
    targetKeywords: { type: [String], default: [] },
    scoreOverall: { type: Number, required: true, min: 0, max: 100, default: 0 },
    matchScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
    sectionScores: {
      summary: { type: Number, required: true, min: 0, max: 100, default: 0 },
      experience: { type: Number, required: true, min: 0, max: 100, default: 0 },
      skills: { type: Number, required: true, min: 0, max: 100, default: 0 },
      education: { type: Number, required: true, min: 0, max: 100, default: 0 },
      formatting: { type: Number, required: true, min: 0, max: 100, default: 0 },
      projects: { type: Number, required: true, min: 0, max: 100, default: 0 },
    },
    keywordAnalysis: {
      missingKeywords: { type: [String], default: [] },
      repeatedKeywords: { type: [String], default: [] },
      weakKeywords: { type: [String], default: [] },
      atsFriendlyKeywords: { type: [String], default: [] },
      matchedKeywords: { type: [String], default: [] },
    },
    grammarIssues: { type: [grammarFindingSchema], default: [] },
    formattingChecks: { type: [formattingCheckSchema], default: [] },
    rewriteSuggestions: { type: [suggestionSchema], default: [] },
    summary: { type: String, default: "" },
    analyzedAt: { type: Date, default: undefined },
    lastError: { type: String, default: "" },
  },
  { timestamps: true },
);

AtsAnalysisSchema.index({ resumeId: 1, userId: 1, createdAt: -1 });

export default mongoose.model<IAtsAnalysis>("AtsAnalysis", AtsAnalysisSchema);

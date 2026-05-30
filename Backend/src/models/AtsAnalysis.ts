import mongoose, { Document, Schema } from "mongoose";
import type {
  AiSuggestion,
  AtsSectionSuggestions,
  AtsGrammarFinding,
  AtsFormattingCheck,
  AtsKeywordAnalysis,
  AtsScoreBreakdown,
  AtsSectionAudit,
  AtsActionPlanItem,
  AtsKeywordPlacement,
} from "../../../shared/src/ai";

export type AtsAnalysisStatus = "pending" | "completed" | "failed";
export type AtsAnalysisReportType = "resume-analysis" | "job-description-match";

export interface IAtsAnalysis extends Document {
  jobId: string;
  resumeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  previousOverallScore?: number | null;
  status: AtsAnalysisStatus;
  reportType: AtsAnalysisReportType;
  grade?: string;
  jobTitle?: string;
  jobDescription?: string;
  targetKeywords: string[];
  overallScore: number;
  matchScore: number;
  sectionScores: AtsScoreBreakdown;
  keywordAnalysis: AtsKeywordAnalysis;
  grammarIssues: AtsGrammarFinding[];
  formattingChecks: AtsFormattingCheck[];
  rewriteSuggestions: AiSuggestion[];
  perSectionSuggestions?: AtsSectionSuggestions;
  sectionAudit?: AtsSectionAudit[];
  actionPlan?: AtsActionPlanItem[];
  quickWins?: string[];
  estimatedScoreAfterFixes?: number;
  questionsForUser?: string[];
  keywordPlacement?: AtsKeywordPlacement[];
  keywordGaps?: string[];
  verdict?: string;
  summary: string;
  analyzedAt?: Date;
  lastError?: string;
  /** New v2 format fields */
  categoryScores?: unknown;
  formatIssues?: unknown[];
  contentImprovements?: unknown[];
  sectionAnalysis?: unknown[];
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

const sectionAuditFixSchema = new Schema(
  {
    why: { type: String, default: "" },
    keywordsToInclude: { type: [String], default: [] },
    copyPasteTemplate: { type: String, default: "" },
    example: { type: String, default: "" },
    expectedScoreGain: { type: Number, default: 0 },
  },
  { _id: false },
);

const sectionAuditSchema = new Schema<AtsSectionAudit>(
  {
    section: { type: String, required: true },
    status: { type: String, enum: ["present", "missing", "empty", "weak"], required: true },
    fix: { type: sectionAuditFixSchema, required: true, default: () => ({}) },
  },
  { _id: false },
);

const actionPlanSchema = new Schema<AtsActionPlanItem>(
  {
    priority: { type: String, enum: ["P0", "P1", "P2"], required: true },
    action: { type: String, required: true },
    whyItIncreasesScore: { type: String, required: true },
    howToDo: { type: [String], default: [] },
    expectedScoreGain: { type: Number, default: 0 },
  },
  { _id: false },
);

const keywordPlacementSchema = new Schema<AtsKeywordPlacement>(
  {
    keyword: { type: String, required: true },
    placeIn: { type: [String], default: [] },
    exampleUsage: { type: String, default: "" },
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
    previousOverallScore: { type: Number, default: undefined },
    overallScore: { type: Number, required: true, min: 0, max: 100, default: 0 },
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
      missingKeywords: {
        type: [
          {
            keyword: { type: String, required: true },
            importance: { type: String, enum: ["critical", "important", "optional"], required: true },
            reason: { type: String, required: true },
          },
        ],
        default: [],
      },
      repeatedKeywords: { type: [String], default: [] },
      weakKeywords: { type: [String], default: [] },
      atsFriendlyKeywords: { type: [String], default: [] },
      matchedKeywords: { type: [String], default: [] },
    },
    grammarIssues: { type: [grammarFindingSchema], default: [] },
    formattingChecks: { type: [formattingCheckSchema], default: [] },
    rewriteSuggestions: { type: [suggestionSchema], default: [] },
    perSectionSuggestions: {
      summary: { type: [suggestionSchema], default: [] },
      experience: { type: [suggestionSchema], default: [] },
      skills: { type: [suggestionSchema], default: [] },
      education: { type: [suggestionSchema], default: [] },
      projects: { type: [suggestionSchema], default: [] },
      certifications: { type: [suggestionSchema], default: [] },
      languages: { type: [suggestionSchema], default: [] },
    },
    sectionAudit: { type: [sectionAuditSchema], default: [] },
    actionPlan: { type: [actionPlanSchema], default: [] },
    quickWins: { type: [String], default: [] },
    estimatedScoreAfterFixes: { type: Number, default: undefined },
    questionsForUser: { type: [String], default: [] },
    keywordPlacement: { type: [keywordPlacementSchema], default: [] },
    keywordGaps: { type: [String], default: [] },
    verdict: { type: String, default: "" },
    summary: { type: String, default: "" },
    analyzedAt: { type: Date, default: undefined },
    lastError: { type: String, default: "" },
    /** New v2 format fields */
    categoryScores: { type: Schema.Types.Mixed, default: undefined },
    formatIssues: { type: [Schema.Types.Mixed], default: undefined },
    contentImprovements: { type: [Schema.Types.Mixed], default: undefined },
    sectionAnalysis: { type: [Schema.Types.Mixed], default: undefined },
  },
  { timestamps: true },
);

AtsAnalysisSchema.index({ resumeId: 1, userId: 1, createdAt: -1 });

export default mongoose.model<IAtsAnalysis>("AtsAnalysis", AtsAnalysisSchema);

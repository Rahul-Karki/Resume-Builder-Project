import mongoose, { Document, Schema } from "mongoose";

export type ResumeDownloadJobStatus = "pending" | "completed" | "failed";

export interface IResumeDownloadJob extends Document {
  jobId: string;
  userId: mongoose.Types.ObjectId;
  resumeId?: mongoose.Types.ObjectId;
  resume?: Record<string, unknown>;
  previewToken?: string;
  preset: "web" | "standard" | "print";
  status: ResumeDownloadJobStatus;
  fileName?: string;
  fileData?: Buffer;
  resultUrl?: string;
  resultPath?: string;
  attemptsMade: number;
  totalAttempts: number;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  lastError?: string;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeDownloadJobSchema = new Schema<IResumeDownloadJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", default: undefined, index: true },
    resume: { type: Schema.Types.Mixed, default: undefined },
    previewToken: { type: String, default: "" },
    preset: { type: String, enum: ["web", "standard", "print"], required: true, default: "standard" },
    status: { type: String, enum: ["pending", "completed", "failed"], required: true, default: "pending" },
    fileName: { type: String, default: "" },
    fileData: { type: Buffer, default: undefined, select: false },
    resultUrl: { type: String, default: "" },
    resultPath: { type: String, default: "" },
    attemptsMade: { type: Number, default: 0 },
    totalAttempts: { type: Number, default: 5 },
    queuedAt: { type: Date, required: true, default: Date.now },
    startedAt: { type: Date, default: undefined },
    completedAt: { type: Date, default: undefined },
    failedAt: { type: Date, default: undefined },
    lastError: { type: String, default: "" },
    durationMs: { type: Number, default: undefined },
  },
  { timestamps: true },
);

ResumeDownloadJobSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IResumeDownloadJob>("ResumeDownloadJob", ResumeDownloadJobSchema);
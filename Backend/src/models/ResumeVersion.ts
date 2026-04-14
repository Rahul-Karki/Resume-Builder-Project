import mongoose, { Document, Schema } from "mongoose";

export interface IResumeVersion extends Document {
  resumeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  versionNo: number;
  snapshot: Record<string, unknown>;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeVersionSchema = new Schema<IResumeVersion>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    versionNo: { type: Number, required: true, min: 1 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

ResumeVersionSchema.index({ resumeId: 1, versionNo: -1 }, { unique: true });

export default mongoose.model<IResumeVersion>("ResumeVersion", ResumeVersionSchema);

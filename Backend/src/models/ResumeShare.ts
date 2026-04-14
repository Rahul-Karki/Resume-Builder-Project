import mongoose, { Document, Schema } from "mongoose";

export type ShareVisibility = "public" | "unlisted" | "password";

export interface IResumeShare extends Document {
  resumeId: mongoose.Types.ObjectId;
  ownerUserId: mongoose.Types.ObjectId;
  slug: string;
  visibility: ShareVisibility;
  passwordHash?: string;
  expiresAt?: Date;
  allowDownload: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeShareSchema = new Schema<IResumeShare>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    visibility: { type: String, enum: ["public", "unlisted", "password"], default: "unlisted" },
    passwordHash: { type: String, default: undefined },
    expiresAt: { type: Date, default: undefined },
    allowDownload: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

ResumeShareSchema.index({ resumeId: 1, ownerUserId: 1 }, { unique: true });

export default mongoose.model<IResumeShare>("ResumeShare", ResumeShareSchema);

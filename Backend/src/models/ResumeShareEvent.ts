import mongoose, { Document, Schema } from "mongoose";

export interface IResumeShareEvent extends Document {
  shareId: mongoose.Types.ObjectId;
  eventType: "view" | "download";
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeShareEventSchema = new Schema<IResumeShareEvent>(
  {
    shareId: { type: Schema.Types.ObjectId, ref: "ResumeShare", required: true, index: true },
    eventType: { type: String, enum: ["view", "download"], required: true },
    fingerprint: { type: String, required: true },
  },
  { timestamps: true },
);

ResumeShareEventSchema.index({ shareId: 1, eventType: 1, createdAt: -1 });

export default mongoose.model<IResumeShareEvent>("ResumeShareEvent", ResumeShareEventSchema);

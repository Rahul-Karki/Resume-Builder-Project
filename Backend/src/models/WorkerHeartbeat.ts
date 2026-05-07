import mongoose, { Document, Schema } from "mongoose";

export interface IWorkerHeartbeat extends Document {
  workerId: string;
  serviceName: string;
  queueName: string;
  queuePrefix: string;
  status: "starting" | "ready" | "closing" | "error";
  lastSeenAt: Date;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerHeartbeatSchema = new Schema<IWorkerHeartbeat>(
  {
    workerId: { type: String, required: true, unique: true, index: true },
    serviceName: { type: String, required: true, index: true },
    queueName: { type: String, required: true, index: true },
    queuePrefix: { type: String, required: true, index: true },
    status: { type: String, enum: ["starting", "ready", "closing", "error"], required: true },
    lastSeenAt: { type: Date, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

WorkerHeartbeatSchema.index({ serviceName: 1, queueName: 1, queuePrefix: 1, lastSeenAt: -1 });

export default mongoose.model<IWorkerHeartbeat>("WorkerHeartbeat", WorkerHeartbeatSchema);

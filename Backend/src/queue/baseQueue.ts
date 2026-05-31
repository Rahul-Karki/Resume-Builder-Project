import mongoose, { Schema, Document, Model } from "mongoose";
import { logger } from "../observability";

export interface IQueueJob extends Document {
  jobId: string;
  type: string;
  data: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed";
  priority: number;
  attemptsMade: number;
  maxAttempts: number;
  lastError: string;
  scheduledAt: Date;
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const queueJobSchema = new Schema<IQueueJob>(
  {
    jobId: { type: String, required: true, unique: true },
    type: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    priority: { type: Number, default: 0, index: -1 },
    attemptsMade: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lastError: { type: String, default: "" },
    scheduledAt: { type: Date, default: Date.now, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

queueJobSchema.index({ status: 1, scheduledAt: 1 });
queueJobSchema.index({ status: 1, priority: -1, scheduledAt: 1 });

const getModel = (): Model<IQueueJob> => {
  try {
    return mongoose.model<IQueueJob>("QueueJob");
  } catch {
    return mongoose.model<IQueueJob>("QueueJob", queueJobSchema);
  }
};

export type JobHandler<T = Record<string, unknown>> = (
  job: { id: string; data: T; attemptsMade: number },
) => Promise<void>;

export class BaseQueue<T = Record<string, unknown>> {
  private readonly type: string;
  private readonly handler: JobHandler<T>;
  private readonly maxConcurrency: number;
  private readonly maxAttempts: number;
  private activeCount = 0;
  private polling = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private recoveryDone = false;

  constructor(
    type: string,
    handler: JobHandler<T>,
    options?: { maxConcurrency?: number; maxAttempts?: number },
  ) {
    this.type = type;
    this.handler = handler;
    this.maxConcurrency = options?.maxConcurrency ?? 5;
    this.maxAttempts = options?.maxAttempts ?? 3;
  }

  async add(jobId: string, data: T, options?: { priority?: number; scheduledAt?: Date }): Promise<void> {
    const Model = getModel();
    await Model.updateOne(
      { jobId },
      {
        $setOnInsert: {
          jobId,
          type: this.type,
          data: data as Record<string, unknown>,
          status: "pending",
          priority: options?.priority ?? 0,
          maxAttempts: this.maxAttempts,
          attemptsMade: 0,
          lastError: "",
          scheduledAt: options?.scheduledAt ?? new Date(),
        },
      },
      { upsert: true },
    );
  }

  async recoverPending(): Promise<number> {
    if (this.recoveryDone) return 0;
    this.recoveryDone = true;

    const Model = getModel();
    const result = await Model.updateMany(
      {
        type: this.type,
        status: { $in: ["pending", "processing"] },
      },
      { $set: { status: "pending", startedAt: null, attemptsMade: 0 } },
    );

    if (result.modifiedCount > 0) {
      logger.info(
        { type: this.type, count: result.modifiedCount },
        "Recovered pending queue jobs after restart",
      );
    }

    return result.modifiedCount;
  }

  start(): void {
    if (this.polling) return;
    this.polling = true;

    this.recoverPending().catch((error) => {
      logger.warn({ error, type: this.type }, "Queue recovery failed");
    });

    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        logger.warn({ error, type: this.type }, "Queue poll failed");
      });
    }, 1000);
  }

  stop(): void {
    this.polling = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.activeCount >= this.maxConcurrency) return;

    const Model = getModel();
    const job = await Model.findOneAndUpdate(
      {
        type: this.type,
        status: "pending",
        scheduledAt: { $lte: new Date() },
      },
      {
        $set: {
          status: "processing",
          startedAt: new Date(),
        },
        $inc: { attemptsMade: 1 },
      },
      {
        sort: { priority: -1, scheduledAt: 1 },
        returnDocument: "after",
      },
    );

    if (!job) return;

    this.activeCount++;

    this.process(job)
      .catch((error) => {
        logger.error({ error, jobId: job.jobId, type: this.type }, "Queue job processing error");
      })
      .finally(() => {
        this.activeCount--;
      });
  }

  private async process(job: IQueueJob): Promise<void> {
    try {
      await this.handler({
        id: job.jobId,
        data: job.data as unknown as T,
        attemptsMade: job.attemptsMade,
      });

      await getModel().updateOne(
        { jobId: job.jobId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            lastError: "",
          },
        },
      );

      logger.debug({ jobId: job.jobId, type: this.type }, "Queue job completed");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (job.attemptsMade >= job.maxAttempts) {
        await getModel().updateOne(
          { jobId: job.jobId },
          {
            $set: {
              status: "failed",
              completedAt: new Date(),
              lastError: errorMsg,
            },
          },
        );

        logger.warn(
          { jobId: job.jobId, type: this.type, attempts: job.attemptsMade, error: errorMsg },
          "Queue job failed after max attempts",
        );
      } else {
        await getModel().updateOne(
          { jobId: job.jobId },
          {
            $set: {
              status: "pending",
              lastError: errorMsg,
              scheduledAt: new Date(Date.now() + this.backoffMs(job.attemptsMade)),
            },
          },
        );

        logger.debug(
          { jobId: job.jobId, type: this.type, attempt: job.attemptsMade, nextRetryMs: this.backoffMs(job.attemptsMade) },
          "Queue job will be retried",
        );
      }
    }
  }

  private backoffMs(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }

  get activeJobCount(): number {
    return this.activeCount;
  }

  get isRunning(): boolean {
    return this.polling;
  }
}

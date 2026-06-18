import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("mongoose", () => {
  class MockSchema {
    static Types = { Mixed: Object };
    index() {}
  }
  return {
    default: {
      model: vi.fn(),
      Schema: MockSchema,
      Types: { Mixed: Object },
    },
    Schema: MockSchema,
    Types: { Mixed: Object },
    model: vi.fn(),
  };
});

import mongoose from "mongoose";
import { BaseQueue } from "../queue/baseQueue";

function mockModel(overrides: Record<string, any> = {}) {
  return {
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("BaseQueue", () => {
  let model: ReturnType<typeof mockModel>;

  beforeEach(() => {
    model = mockModel();
    // Simulate mongoose.model(): throw on retrieval (1 arg), return mock on registration (2 args)
    vi.mocked(mongoose.model).mockImplementation((name: string, schema?: any) => {
      if (schema) return model as any;
      throw new Error(`Schema hasn't been registered for model ${name}`);
    });
  });

  it("adds a job via updateOne with upsert", async () => {
    const queue = new BaseQueue("test", vi.fn().mockResolvedValue(undefined));

    await queue.add("job-1", { foo: "bar" }, { priority: 5 });

    expect(model.updateOne).toHaveBeenCalledWith(
      { jobId: "job-1" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          jobId: "job-1",
          type: "test",
          status: "pending",
          priority: 5,
          maxAttempts: 3,
        }),
      }),
      { upsert: true },
    );
  });

  it("polls for pending jobs and processes them", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const jobData = {
      jobId: "job-2",
      data: { x: 1 },
      attemptsMade: 0,
    };

    model.updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    model.findOneAndUpdate = vi
      .fn()
      .mockResolvedValueOnce({ ...jobData, status: "processing", maxAttempts: 3 })
      .mockResolvedValue(null);

    const queue = new BaseQueue("test", handler, { maxConcurrency: 3, maxAttempts: 3 });
    await (queue as any).poll();

    expect(handler).toHaveBeenCalledWith({
      id: "job-2",
      data: { x: 1 },
      attemptsMade: 0,
    });
  });

  it("retries failed jobs with exponential backoff", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Processing failed"));
    const job = {
      jobId: "job-1",
      data: { foo: "bar" },
      status: "processing" as const,
      attemptsMade: 1,
      maxAttempts: 3,
    };

    model.findOneAndUpdate = vi.fn().mockResolvedValue(job);

    const updateCalls: any[] = [];
    model.updateOne = vi.fn().mockImplementation((f: any, u: any) => {
      updateCalls.push({ filter: f, update: u });
      return { modifiedCount: 1 };
    });

    const queue = new BaseQueue("test", handler, { maxConcurrency: 3, maxAttempts: 3 });
    await (queue as any).process(job);

    const lastCall = updateCalls[updateCalls.length - 1];
    expect(lastCall).toBeDefined();
    expect(lastCall.update.$set.status).toBe("pending");
    expect(lastCall.update.$set.lastError).toBe("Processing failed");
  });

  it("marks job as failed after max attempts", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Final failure"));
    const job = {
      jobId: "job-1",
      data: { foo: "bar" },
      status: "processing" as const,
      attemptsMade: 3,
      maxAttempts: 3,
    };

    model.findOneAndUpdate = vi.fn().mockResolvedValue(job);

    const updateCalls: any[] = [];
    model.updateOne = vi.fn().mockImplementation((f: any, u: any) => {
      updateCalls.push({ filter: f, update: u });
      return { modifiedCount: 1 };
    });

    const queue = new BaseQueue("test", handler, { maxConcurrency: 3, maxAttempts: 3 });
    await (queue as any).process(job);

    const lastCall = updateCalls[updateCalls.length - 1];
    expect(lastCall).toBeDefined();
    expect(lastCall.update.$set.status).toBe("failed");
    expect(lastCall.update.$set.lastError).toBe("Final failure");
  });

  it("recoverPending calls updateMany on stuck jobs", async () => {
    model.updateMany = vi.fn()
      .mockResolvedValueOnce({ modifiedCount: 3 })
      .mockResolvedValueOnce({ modifiedCount: 2 });

    const queue = new BaseQueue("test", vi.fn(), { maxConcurrency: 3, maxAttempts: 3 });
    const recovered = await queue.recoverPending();

    expect(recovered).toBe(5);
    expect(model.updateMany).toHaveBeenCalledTimes(2);
    expect(model.updateMany).toHaveBeenNthCalledWith(
      1,
      { type: "test", status: "pending" },
      { $set: { status: "pending", startedAt: null, attemptsMade: 0 } },
    );
    expect(model.updateMany).toHaveBeenNthCalledWith(
      2,
      { type: "test", status: "processing" },
      { $set: { status: "pending", startedAt: null } },
    );
  });
});

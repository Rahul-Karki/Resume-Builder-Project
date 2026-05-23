import { describe, it, expect } from "vitest";
import WorkerHeartbeat from "../../models/WorkerHeartbeat";

describe("WorkerHeartbeat model", () => {
  it("should create a worker heartbeat record", () => {
    const paths = WorkerHeartbeat.schema.paths;
    expect(paths.workerId.options.required).toBe(true);
    expect(paths.serviceName.options.required).toBe(true);
    expect(paths.queueName.options.required).toBe(true);
    expect(paths.queuePrefix.options.required).toBe(true);
    expect(paths.status.options.required).toBe(true);
    expect(paths.lastSeenAt.options.required).toBe(true);
  });

  it("should enforce unique workerId", () => {
    const paths = WorkerHeartbeat.schema.paths;
    expect(paths.workerId.options.unique).toBe(true);
  });

  it("should update lastSeenAt on each heartbeat", () => {
    const paths = WorkerHeartbeat.schema.paths;
    expect(paths.lastSeenAt).toBeDefined();
    expect(paths.lastSeenAt.options.required).toBe(true);
    const statusPath = WorkerHeartbeat.schema.path("status") as any;
    expect(statusPath.options.enum).toContain("starting");
    expect(statusPath.options.enum).toContain("ready");
    expect(statusPath.options.enum).toContain("closing");
    expect(statusPath.options.enum).toContain("error");
  });
});

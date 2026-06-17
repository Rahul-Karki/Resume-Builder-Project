import { describe, it, expect, vi, beforeEach } from "vitest";

describe("db", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should connect to MongoDB with the configured URI", async () => {
    vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
    vi.doMock("../models/plugins/softDelete", () => ({ default: () => {} }));
    vi.doMock("../models/plugins/auditTrail", () => ({ default: () => {} }));
    const mongoose = await import("mongoose");
    const connectSpy = vi.spyOn(mongoose.default, "connect").mockResolvedValue(mongoose.default as any);
    const { default: connectDB } = await import("../config/db");
    await connectDB();
    expect(connectSpy).toHaveBeenCalledWith("mongodb://localhost:27017/resume-builder-test", expect.any(Object));
    connectSpy.mockRestore();
  });

  it("should reject when the connection URI is invalid", async () => {
    vi.doMock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
    vi.doMock("../models/plugins/softDelete", () => ({ default: () => {} }));
    vi.doMock("../models/plugins/auditTrail", () => ({ default: () => {} }));
    const mongoose = await import("mongoose");
    const connectSpy = vi.spyOn(mongoose.default, "connect").mockRejectedValue(new Error("Invalid URI"));
    const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const { default: connectDB } = await import("../config/db");
    await connectDB();
    expect(processExitSpy).toHaveBeenCalledWith(1);
    connectSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should close the connection gracefully", async () => {
    vi.doMock("../observability", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
    vi.doMock("../models/plugins/softDelete", () => ({ default: () => {} }));
    vi.doMock("../models/plugins/auditTrail", () => ({ default: () => {} }));
    const mongoose = await import("mongoose");
    const disconnectSpy = vi.spyOn(mongoose.default, "disconnect").mockResolvedValue(undefined);
    await mongoose.default.disconnect();
    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});

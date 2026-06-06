import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const mockStartSpan = vi.fn(() => "span-1");
const mockFinishSpan = vi.fn();
const mockMarkSuccess = vi.fn();
const mockMarkError = vi.fn();
const mockSendError = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("../../utils/controllerObservability", () => ({
  startControllerSpan: mockStartSpan,
  finishControllerSpan: mockFinishSpan,
  markSpanSuccess: mockMarkSuccess,
  markSpanError: mockMarkError,
}));

vi.mock("../../observability", () => ({
  logger: { error: mockLoggerError },
}));

vi.mock("../../utils/errorResponse", () => ({
  sendErrorResponse: mockSendError,
}));

const mockReq = () => ({}) as Request;

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.headersSent = false;
  return res as Response;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("wrapController", () => {
  it("should call the controller function and mark success", async () => {
    const { wrapController } = await import("../../utils/controllerWrapper");
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrapped = wrapController(handler, "test-span");
    const req = mockReq();
    const res = mockRes();

    await wrapped(req, res, vi.fn());

    expect(handler).toHaveBeenCalledWith(req, res);
    expect(mockStartSpan).toHaveBeenCalledWith("test-span", req);
    expect(mockMarkSuccess).toHaveBeenCalledWith("span-1");
    expect(mockFinishSpan).toHaveBeenCalledWith("span-1");
  });

  it("should call onError and send error response when controller throws", async () => {
    const { wrapController } = await import("../../utils/controllerWrapper");
    const error = new Error("Something broke");
    const onError = vi.fn();

    const wrapped = wrapController(
      async () => { throw error; },
      { spanName: "failing-span", onError },
    );

    const req = mockReq();
    const res = mockRes();

    await wrapped(req, res, vi.fn());

    expect(mockMarkError).toHaveBeenCalledWith("span-1", error, "failing-span failed");
    expect(mockLoggerError).toHaveBeenCalledWith({ error }, "failing-span failed");
    expect(onError).toHaveBeenCalledWith(error, req);
    expect(mockSendError).toHaveBeenCalledWith(res, error, {
      statusCode: 500,
      code: "SERVER_ERROR",
      message: "Server error",
    });
    expect(mockFinishSpan).toHaveBeenCalledWith("span-1");
  });

  it("should not send error response if headers already sent", async () => {
    const { wrapController } = await import("../../utils/controllerWrapper");

    const wrapped = wrapController(
      async (_req, res) => {
        (res as any).headersSent = true;
        throw new Error("Late error");
      },
      "late-error",
    );

    const req = mockReq();
    const res = mockRes();

    await wrapped(req, res, vi.fn());

    expect(mockSendError).not.toHaveBeenCalled();
    expect(mockFinishSpan).toHaveBeenCalled();
  });

  it("should use function name as span name when no options given", async () => {
    const { wrapController } = await import("../../utils/controllerWrapper");

    async function myController() { /* noop */ }

    const wrapped = wrapController(myController);
    const req = mockReq();
    const res = mockRes();

    await wrapped(req, res, vi.fn());

    expect(mockStartSpan).toHaveBeenCalledWith("myController", req);
  });

  it("should accept string as span name", async () => {
    const { wrapController } = await import("../../utils/controllerWrapper");
    const handler = vi.fn().mockResolvedValue(undefined);

    const wrapped = wrapController(handler, "custom-span");
    const req = mockReq();
    const res = mockRes();

    await wrapped(req, res, vi.fn());

    expect(mockStartSpan).toHaveBeenCalledWith("custom-span", req);
  });
});

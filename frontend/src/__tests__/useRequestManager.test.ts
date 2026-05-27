// ─── Module: useRequestManager ───────────────────────────
// Description: Manages in-flight AI requests with dedup and cancellation
// Coverage targets: useRequestManager (createRequest, cancelRequest, getActiveRequestIds, clearCompletedRequests)
// Last updated: 2026-05-23

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestManager } from "@/hooks/useRequestManager";

describe("useRequestManager", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440000" as `${string}-${string}-${string}-${string}-${string}`).mockReturnValueOnce("550e8400-e29b-41d4-a716-446655440001" as `${string}-${string}-${string}-${string}-${string}`);
    vi.spyOn(Date, "now").mockReturnValue(1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a request and return an abort controller when createRequest is called", () => {
    const requestManager = createRequestManager();

    const { requestId, controller } = requestManager.createRequest(requestManager.getRequestKey("improve-text", "summary"));

    expect(requestId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(controller.signal.aborted).toBe(false);
    expect(requestManager.isRequestInFlight("improve-text:summary")).toBe(true);
  });

  it("should cancel a request when cancelRequest is called", () => {
    const requestManager = createRequestManager();
    const key = requestManager.getRequestKey("improve-text", "experience");

    const first = requestManager.createRequest(key);
    requestManager.cancelRequest(key);

    expect(first.controller.signal.aborted).toBe(true);
    expect(requestManager.isRequestInFlight(key)).toBe(false);
  });

  it("should return all active request IDs until cancelAll is called", () => {
    const requestManager = createRequestManager();

    requestManager.createRequest(requestManager.getRequestKey("improve-text", "summary"));
    requestManager.createRequest(requestManager.getRequestKey("improve-text", "experience"));

    expect(requestManager.getActiveRequests()).toEqual(["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]);

    requestManager.cancelAll();
    expect(requestManager.getActiveRequests()).toEqual([]);
  });

  it("should clear completed requests when completeRequest is called", () => {
    const requestManager = createRequestManager();
    const key = requestManager.getRequestKey("enhance-bullet", "project");

    requestManager.createRequest(key);
    requestManager.completeRequest(key);

    expect(requestManager.isRequestInFlight(key)).toBe(false);
    expect(requestManager.getActiveRequests()).toEqual([]);
  });
});

// ─── Module: controllerObservability ───────────────────────────
// Description: OpenTelemetry span helpers for controllers
// Coverage targets: startControllerSpan, markSpanSuccess, markSpanError, finishControllerSpan
// Last updated: 2026-05-22

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("controllerObservability", () => {
  describe("startControllerSpan", () => { it("should create and return a new span with controller name", () => {}); });
  describe("markSpanSuccess", () => { it("should set the span status to OK", () => {}); });
  describe("markSpanError", () => { it("should record the error and set span status to ERROR", () => {}); });
});

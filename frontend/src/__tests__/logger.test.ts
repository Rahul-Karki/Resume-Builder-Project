// ─── Module: logger ───────────────────────────
// Description: Structured client-side logging with localStorage persistence
// Coverage targets: Logger, logger, debug, info, warn, error, getLogs, clearLogs
// Last updated: 2026-05-22

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel, logger } from "@/utils/logger";

describe("logger", () => {
  beforeEach(() => {
    localStorage.clear();
    logger.clearLogs();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should capture a structured log entry when info is logged", () => {
    localStorage.setItem("userId", "user-123");

    logger.info("Build started", { step: "compile" });

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: LogLevel.INFO,
      message: "Build started",
      context: { step: "compile" },
      userId: "user-123",
    });
    expect(logs[0].sessionId).toContain("session_");
  });

  it("should filter logs by severity level when a minimum level is provided", () => {
    logger.debug("debug message");
    logger.warn("warning message");
    logger.error("error message");

    expect(logger.getLogs(LogLevel.WARN).map((entry) => entry.message)).toEqual([
      "warning message",
      "error message",
    ]);
  });

  it("should include session metadata when session info is requested", () => {
    localStorage.setItem("userId", "user-456");

    const sessionInfo = logger.getSessionInfo();

    expect(sessionInfo.userId).toBe("user-456");
    expect(sessionInfo.logCount).toBe(0);
    expect(sessionInfo.sessionId).toContain("session_");
    expect(sessionInfo.sessionStart).toContain("T");
  });
});

// ─── Module: adminAudit ───────────────────────────
import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/securityLogger", () => ({
  logAdminAction: vi.fn(),
}));

import { adminAuditMiddleware } from "../middleware/adminAudit";
import { logAdminAction } from "../utils/securityLogger";

function createRes() {
  const handlers: Record<string, () => void> = {};
  return {
    statusCode: 200,
    once(event: string, handler: () => void) {
      handlers[event] = handler;
    },
    trigger(event: string) {
      handlers[event]?.();
    },
  };
}

describe("adminAuditMiddleware", () => {
  it("logs the completed admin action", () => {
    const middleware = adminAuditMiddleware("templates");
    const req = {
      method: "PATCH",
      originalUrl: "/api/admin/templates/123/status",
      path: "/templates/123/status",
      route: { path: "/:id/status" },
      params: { id: "123" },
      query: { preview: "true" },
      user: { id: "admin-1" },
    };
    const res = createRes();
    let nextCalled = false;

    middleware(req as any, res as any, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    res.trigger("finish");

    expect(vi.mocked(logAdminAction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logAdminAction)).toHaveBeenCalledWith(
      req,
      "PATCH templates:/:id/status",
      expect.objectContaining({
        resourceGroup: "templates",
        resource: "/api/admin/templates/123/status",
        statusCode: 200,
        params: { id: "123" },
        route: "/:id/status",
      }),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiVersionMiddleware } from "../middleware/apiVersion";

describe("apiVersionMiddleware", () => {
  beforeEach(() => {
    process.env.SERVICE_VERSION = "1.0.0";
  });

  it("should set X-Service-Version from the config value", () => {
    const req = { header: vi.fn().mockReturnValue("") } as any;
    const res = { setHeader: vi.fn(), locals: {} } as any;
    const next = vi.fn();

    apiVersionMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith("X-Service-Version", "1.0.0");
    expect(next).toHaveBeenCalled();
  });

  it("should read x-api-version header and attach it to req", () => {
    const req = { header: vi.fn().mockReturnValue("2.0.0") } as any;
    const res = { setHeader: vi.fn(), locals: {} } as any;
    const next = vi.fn();

    apiVersionMiddleware(req, res, next);

    expect(res.locals.apiVersion).toBe("2.0.0");
    expect(next).toHaveBeenCalled();
  });

  it("should default to latest version when no header is present", () => {
    const req = { header: vi.fn().mockReturnValue("") } as any;
    const res = { setHeader: vi.fn(), locals: {} } as any;
    const next = vi.fn();

    apiVersionMiddleware(req, res, next);

    expect(res.locals.apiVersion).toBe("1.0.0");
    expect(next).toHaveBeenCalled();
  });
});

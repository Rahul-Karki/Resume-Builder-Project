import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateRequest as validate } from "../middleware/validateRequest";

describe("validate", () => {
  it("should call next() when validation passes", () => {
    const schema = z.object({ name: z.string() });
    const req = { body: { name: "Alice" }, params: {}, query: {} } as any;
    const res = {} as any;
    const next = vi.fn();

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: "Alice" });
  });

  it("should return 400 with error details when validation fails", () => {
    const schema = z.object({ name: z.string() });
    const req = { body: { name: 123 }, params: {}, query: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    validate({ body: schema })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── Module: validateRequest ───────────────────────────
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateRequest } from "../middleware/validateRequest";

const createRes = () => {
  const data: { statusCode: number; body: any } = {
    statusCode: 200,
    body: undefined,
  };

  return {
    data,
    status(code: number) {
      data.statusCode = code;
      return this;
    },
    json(payload: any) {
      data.body = payload;
      return this;
    },
  };
};

describe("validateRequest", () => {
  it("calls next and applies parsed body for valid input", () => {
    const middleware = validateRequest({
      body: z.object({
        name: z.string().trim().min(1),
      }),
    });

    const req = { body: { name: "  Rahul  " } } as any;
    const res = createRes() as any;
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.data.statusCode).toBe(200);
    expect(req.body.name).toBe("Rahul");
  });

  it("returns 400 with formatted errors for invalid body", () => {
    const middleware = validateRequest({
      body: z.object({
        email: z.string().email(),
      }),
    });

    const req = { body: { email: "not-an-email" } } as any;
    const res = createRes() as any;
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.data.statusCode).toBe(400);
    expect(res.data.body.message).toBe("Invalid request payload");
    expect(res.data.body.code).toBe("VALIDATION_ERROR");
    expect(typeof res.data.body.traceId).toBe("string");
    expect(Array.isArray(res.data.body.errors)).toBe(true);
    expect(res.data.body.errors[0].path).toBe("email");
  });

  it("parses params and query schemas", () => {
    const middleware = validateRequest({
      params: z.object({
        id: z.string().regex(/^[a-f\d]{24}$/i),
      }),
      query: z.object({
        page: z.coerce.number().int().min(1),
      }),
    });

    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      query: { page: "2" },
    } as any;
    const res = createRes() as any;
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.data.statusCode).toBe(200);
    expect(req.validated.query.page).toBe(2);
  });
});

import { describe, it, expect } from "vitest";
import {
  sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendServerError,
} from "../../utils/apiResponse";

const createRes = () => {
  const captured: { statusCode: number; body: any } = { statusCode: 200, body: null };
  return {
    status(code: number) { captured.statusCode = code; return this; },
    json(data: any) { captured.body = data; return this; },
    _c: captured,
  };
};

describe("apiResponse", () => {
  describe("sendSuccess", () => {
    it("should send a 200 JSON response with the data", () => {
      const res = createRes() as any;
      sendSuccess(res, { user: "test" });
      expect(res._c.statusCode).toBe(200);
      expect(res._c.body).toEqual(expect.objectContaining({ ok: true, data: { user: "test" } }));
    });

    it("should include the CSRF token in the response body when provided", () => {
      const res = createRes() as any;
      sendSuccess(res, { user: "test" }, 200, "csrf-123");
      expect(res._c.body.csrfToken).toBe("csrf-123");
    });
  });

  describe("sendCreated", () => {
    it("should send a 201 JSON response", () => {
      const res = createRes() as any;
      sendCreated(res, { id: 1 });
      expect(res._c.statusCode).toBe(201);
      expect(res._c.body).toEqual(expect.objectContaining({ ok: true, data: { id: 1 } }));
    });
  });

  describe("sendBadRequest", () => {
    it("should send a 400 response with error details", () => {
      const res = createRes() as any;
      sendBadRequest(res, "Invalid input", "VALIDATION_ERROR");
      expect(res._c.statusCode).toBe(400);
      expect(res._c.body).toEqual({ ok: false, error: "Invalid input", code: "VALIDATION_ERROR" });
    });
  });

  describe("sendUnauthorized", () => {
    it("should send a 401 response", () => {
      const res = createRes() as any;
      sendUnauthorized(res, "Not authorized");
      expect(res._c.statusCode).toBe(401);
      expect(res._c.body).toEqual({ ok: false, error: "Not authorized" });
    });
  });

  describe("sendServerError", () => {
    it("should send a 500 response and log the error", () => {
      const res = createRes() as any;
      sendServerError(res, "Something broke", "INTERNAL_ERROR");
      expect(res._c.statusCode).toBe(500);
      expect(res._c.body).toEqual({ ok: false, error: "Something broke", code: "INTERNAL_ERROR" });
    });
  });
});

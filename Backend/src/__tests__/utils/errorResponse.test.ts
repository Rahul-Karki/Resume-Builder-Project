// ─── Module: errorResponse ───────────────────────────
import { describe, it, expect } from "vitest";
import { ValidationError, NotFoundError, AuthError } from "../../errors/AppError";
import { buildErrorResponse } from "../../utils/errorResponse";

describe("errorResponse", () => {
  it("maps validation errors to a structured payload", () => {
    const response = buildErrorResponse(
      new ValidationError("Invalid request payload", [
        { path: "email", message: "Invalid email" },
      ]),
    );

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid request payload");
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(typeof response.body.traceId).toBe("string");
    expect(response.body.errors).toEqual([
      { path: "email", message: "Invalid email" },
    ]);
  });

  it("maps not found errors to 404", () => {
    const response = buildErrorResponse(new NotFoundError("Resume not found"));

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Resume not found");
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("maps auth errors with explicit codes", () => {
    const response = buildErrorResponse(
      new AuthError("Forbidden", { statusCode: 403, code: "FORBIDDEN" }),
    );

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("Forbidden");
    expect(response.body.code).toBe("FORBIDDEN");
  });
});

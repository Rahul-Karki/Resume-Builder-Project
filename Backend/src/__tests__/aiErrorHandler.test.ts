import { describe, it, expect, vi } from "vitest";
import { categorizeAiError, handleAiError } from "../middleware/aiErrorHandler";

describe("aiErrorHandler", () => {
  describe("categorizeAiError", () => {
    it("should categorize a 429 response as a rate-limit error", () => {
      const error = { response: { status: 429 } };
      const result = categorizeAiError(error);
      expect(result.category).toBe("RATE_LIMIT_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.statusCode).toBe(429);
    });

    it("should categorize a timeout as a timeout error", () => {
      const error = new Error("Request timeout after 10000ms");
      const result = categorizeAiError(error);
      expect(result.category).toBe("TIMEOUT_ERROR");
      expect(result.retryable).toBe(true);
      expect(result.statusCode).toBe(504);
    });

    it("should categorize a 401 response as an auth error", () => {
      const error = { response: { status: 401 } };
      const result = categorizeAiError(error);
      expect(result.category).toBe("AUTH_ERROR");
      expect(result.retryable).toBe(false);
    });

    it("should categorize a malformed response as a parse error", () => {
      const error = new Error("Unexpected token < in JSON at position 0");
      const result = categorizeAiError(error);
      expect(result.category).toBe("MALFORMED_RESPONSE");
      expect(result.retryable).toBe(true);
    });
  });

  describe("handleAiError", () => {
    it("should return a structured error response with the category", () => {
      const error = new Error("rate limit exceeded");
      const req = { headers: {}, user: {}, path: "/ai/test", method: "POST" } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      handleAiError(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: "RATE_LIMIT_ERROR" }),
        })
      );
    });
  });
});

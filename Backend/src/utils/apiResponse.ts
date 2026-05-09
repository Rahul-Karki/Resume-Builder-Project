// ─── apiResponse.ts ──────────────────────────────────────────────────────────
// Standardized API response helpers to ensure consistent response shapes across
// all endpoints. All successful endpoints return { ok: true, data, csrfToken? }
// and all errors return { ok: false, error, code, csrfToken? }

import { Response } from "express";

/**
 * Standard success response shape
 */
export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
  csrfToken?: string;
}

/**
 * Standard error response shape
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  csrfToken?: string;
}

/**
 * Send a success response with consistent shape
 * @param res Response object
 * @param data Response payload
 * @param statusCode HTTP status code (default: 200)
 * @param csrfToken CSRF token if needed
 */
export const sendSuccess = <T = unknown>(
  res: Response,
  data: T,
  statusCode = 200,
  csrfToken?: string,
): Response => {
  // Maintain backward-compatible top-level fields for common response shapes
  // If `data` is a plain object, spread its properties to the top-level while
  // still including the structured `data` field. This preserves existing
  // client expectations (e.g., `body.user`, `body.csrfToken`) while moving
  // towards a consistent envelope `{ ok, data }`.
  const payload: any = { ok: true, data };

  if (data && typeof data === "object" && !Array.isArray(data)) {
    try {
      // shallow copy enumerable own properties
      Object.assign(payload, data as Record<string, unknown>);
    } catch {
      // ignore on failures and fall back to envelope only
    }
  }

  if (csrfToken) {
    payload.csrfToken = csrfToken;
  }

  return res.status(statusCode).json(payload as ApiSuccessResponse<T>);
};

/**
 * Send a success response with 201 Created
 */
export const sendCreated = <T = unknown>(
  res: Response,
  data: T,
  csrfToken?: string,
): Response => {
  return sendSuccess(res, data, 201, csrfToken);
};

/**
 * Send an error response with consistent shape
 * @param res Response object
 * @param error Error message
 * @param statusCode HTTP status code (default: 400)
 * @param code Optional error code for client-side handling
 * @param csrfToken CSRF token if needed
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode = 400,
  code?: string,
  csrfToken?: string,
): Response => {
  const payload: ApiErrorResponse = { ok: false, error };
  if (code) {
    payload.code = code;
  }
  if (csrfToken) {
    payload.csrfToken = csrfToken;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Convenience helper for 400 Bad Request
 */
export const sendBadRequest = (
  res: Response,
  error: string,
  code?: string,
  csrfToken?: string,
): Response => {
  return sendError(res, error, 400, code, csrfToken);
};

/**
 * Convenience helper for 401 Unauthorized
 */
export const sendUnauthorized = (
  res: Response,
  error: string,
  code?: string,
  csrfToken?: string,
): Response => {
  return sendError(res, error, 401, code, csrfToken);
};

/**
 * Convenience helper for 403 Forbidden
 */
export const sendForbidden = (
  res: Response,
  error: string,
  code?: string,
  csrfToken?: string,
): Response => {
  return sendError(res, error, 403, code, csrfToken);
};

/**
 * Convenience helper for 404 Not Found
 */
export const sendNotFound = (
  res: Response,
  error: string,
  code?: string,
  csrfToken?: string,
): Response => {
  return sendError(res, error, 404, code, csrfToken);
};

/**
 * Convenience helper for 500 Internal Server Error
 */
export const sendServerError = (
  res: Response,
  error: string = "Internal server error",
  code?: string,
  csrfToken?: string,
): Response => {
  return sendError(res, error, 500, code, csrfToken);
};

/**
 * Type-safe wrapper for use in generic handlers
 */
export const apiResponse = {
  success: sendSuccess,
  created: sendCreated,
  error: sendError,
  badRequest: sendBadRequest,
  unauthorized: sendUnauthorized,
  forbidden: sendForbidden,
  notFound: sendNotFound,
  serverError: sendServerError,
};

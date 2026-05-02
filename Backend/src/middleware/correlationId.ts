import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Middleware to attach a unique correlation ID to each request
 * Used for tracing requests across logs, metrics, and traces
 * Follows W3C Trace Context standard (traceparent header)
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check for existing trace ID (W3C traceparent or X-Trace-ID)
  let correlationId =
    extractTraceId(req.header("traceparent")) ||
    req.header("x-trace-id") ||
    req.header("x-correlation-id") ||
    randomUUID();

  req.correlationId = correlationId;

  // Add to response headers for client to track
  res.setHeader("X-Correlation-ID", correlationId);
  res.setHeader("X-Trace-ID", correlationId);

  next();
};

/**
 * Extract trace ID from W3C traceparent header format
 * Format: "version-trace_id-parent_id-trace_flags"
 * Example: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
 */
function extractTraceId(traceparent?: string): string | null {
  if (!traceparent) return null;

  const parts = traceparent.split("-");
  if (parts.length >= 2) {
    return parts[1]; // Extract trace_id part
  }

  return null;
}

/**
 * Add correlation ID to log context
 * Usage: logger.info({ ...logContext(req) }, "message")
 */
export const logContext = (req: Request) => ({
  correlationId: req.correlationId,
  method: req.method,
  path: req.path,
  ip: req.ip,
});

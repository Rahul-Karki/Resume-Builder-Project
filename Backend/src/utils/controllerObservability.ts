import { Request } from "express";
import { Span, SpanStatusCode } from "@opentelemetry/api";
import { tracer } from "../observability";

const resolveRoutePath = (req: Request) => {
  if (req.route?.path) {
    return `${req.baseUrl || ""}${String(req.route.path)}`;
  }

  return req.path;
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === "string" ? error : "Unknown error");
};

export const startControllerSpan = (name: string, req: Request) => {
  const span = tracer.startSpan(name);
  span.setAttribute("http.method", req.method);
  span.setAttribute("http.route", resolveRoutePath(req));

  const requestId = req.headers["x-request-id"];
  if (typeof requestId === "string" && requestId.length > 0) {
    span.setAttribute("http.request_id", requestId);
  }

  return span;
};

export const markSpanSuccess = (span: Span) => {
  span.setStatus({ code: SpanStatusCode.OK });
};

export const markSpanError = (span: Span, error: unknown, message: string) => {
  const normalized = normalizeError(error);
  span.recordException(normalized);
  span.setStatus({ code: SpanStatusCode.ERROR, message });
};

export const finishControllerSpan = (span: Span) => {
  span.end();
};

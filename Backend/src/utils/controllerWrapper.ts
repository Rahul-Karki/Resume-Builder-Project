import { Request, Response, RequestHandler } from "express";
import { finishControllerSpan, markSpanError, markSpanSuccess, startControllerSpan } from "./controllerObservability";
import { logger } from "../observability";
import { sendErrorResponse } from "./errorResponse";

type ControllerFn = (req: Request, res: Response) => Promise<void | Response>;

type WrapControllerOptions = {
  spanName?: string;
  onError?: (error: unknown, req: Request) => void;
};

export const wrapController = (
  fn: ControllerFn,
  optionsOrSpanName?: string | WrapControllerOptions,
): RequestHandler => {
  const opts: WrapControllerOptions = typeof optionsOrSpanName === "string"
    ? { spanName: optionsOrSpanName }
    : optionsOrSpanName ?? {};

  const spanName = opts.spanName || fn.name;

  return async (req, res, next) => {
    const span = startControllerSpan(spanName, req);
    try {
      await fn(req, res);
      markSpanSuccess(span);
    } catch (error) {
      markSpanError(span, error as Error, `${spanName} failed`);
      logger.error({ error }, `${spanName} failed`);

      opts.onError?.(error, req);

      if (!res.headersSent) {
        sendErrorResponse(res, error, {
          statusCode: 500,
          code: "SERVER_ERROR",
          message: "Server error",
        });
      }
    } finally {
      finishControllerSpan(span);
    }
  };
};

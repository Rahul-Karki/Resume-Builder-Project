import { NextFunction, Request, Response } from "express";
import { ZodIssue, ZodTypeAny } from "zod";
import { ValidationError } from "../errors/AppError";
import { sendErrorResponse } from "../utils/errorResponse";

type ValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

const formatIssues = (issues: ZodIssue[]) => {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
};

export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const issues: ZodIssue[] = [];

    if (schemas.body) {
      const parsedBody = schemas.body.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        issues.push(...parsedBody.error.issues);
      } else {
        req.body = parsedBody.data;
      }
    }

    if (schemas.params) {
      const parsedParams = schemas.params.safeParse(req.params ?? {});
      if (!parsedParams.success) {
        issues.push(...parsedParams.error.issues);
      } else {
        req.params = parsedParams.data as Request["params"];
      }
    }

    if (schemas.query) {
      const parsedQuery = schemas.query.safeParse(req.query ?? {});
      if (!parsedQuery.success) {
        issues.push(...parsedQuery.error.issues);
      } else {
        req.query = parsedQuery.data as Request["query"];
      }
    }

    if (issues.length > 0) {
      return sendErrorResponse(res, new ValidationError("Invalid request payload", formatIssues(issues)));
    }

    return next();
  };
};
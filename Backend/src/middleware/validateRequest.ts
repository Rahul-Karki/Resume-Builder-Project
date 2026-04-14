import { NextFunction, Request, Response } from "express";
import { ZodIssue, ZodTypeAny } from "zod";

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

    if (issues.length > 0) {
      return res.status(400).json({
        message: "Invalid request payload",
        errors: formatIssues(issues),
      });
    }

    return next();
  };
};
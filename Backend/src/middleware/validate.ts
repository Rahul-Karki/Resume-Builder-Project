import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

type SchemaMap = Partial<{
  body: ZodSchema<any>;
  params: ZodSchema<any>;
  query: ZodSchema<any>;
}>;

export const validate = (schemas: SchemaMap) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      return next();
    } catch (err: any) {
      const issues = err?.issues || err?.message || "Invalid request";
      return res.status(400).json({ error: "validation_error", details: issues });
    }
  };
};

export default validate;

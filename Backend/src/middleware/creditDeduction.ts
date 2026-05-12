import { Request, Response, NextFunction } from "express";
import { calculateEstimatedCredits, type AiOperation } from "../utils/creditCalculator";
import { compactText } from "../../../shared/src/ai";

export interface CreditDeductionOptions {
  operation: AiOperation;
  textLength?: number;
}

export interface CreditDeductionContext {
  userId: string;
  operation: string;
  estimatedCredits: number;
  remainingCredits: number;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      creditsUsed?: number;
      creditContext?: CreditDeductionContext;
    }
  }
}

/**
 * Middleware to check and deduct AI credits before processing requests.
 */
export const creditDeductionMiddleware = (options: CreditDeductionOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next();

      const rawText = options.operation === "ats-analysis"
        ? compactText(req.body?.jobDescription ?? "") + "\n" + JSON.stringify(req.body?.resume ?? {})
        : compactText(req.body?.text ?? "");

      const inferredLength = options.textLength ?? rawText.length;
      const estimatedCredits = calculateEstimatedCredits(options.operation, inferredLength);

      req.creditsUsed = estimatedCredits;
      req.creditContext = {
        userId,
        operation: options.operation,
        estimatedCredits,
        remainingCredits: -1,
      };
    } catch {
      // Estimation errors should never break the request.
    }

    return next();
  };
};

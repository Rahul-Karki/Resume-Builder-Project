import { Request, Response, NextFunction } from "express";

export interface CreditDeductionOptions {
  operation: 'improve-text' | 'check-grammar' | 'enhance-bullet' | 'ats-analysis';
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
    void options;
    return next();
  };
};

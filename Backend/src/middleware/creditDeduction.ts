import { Request, Response, NextFunction } from "express";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { AuthError } from "../errors/AppError";
import { calculateEstimatedCredits } from "../utils/creditCalculator"
import User from "../models/User";

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
    const requestId = String(req.headers["x-request-id"] || "");
    const startTime = Date.now();
    
    try {
      // Get user ID from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        throw new AuthError("User not authenticated", { code: "AUTH_REQUIRED" });
      }

      const bodyText = typeof req.body?.text === "string" ? req.body.text : "";
      const textLength = options.textLength ?? bodyText.length;
      // Calculate estimated credits based on operation and text length
      const estimatedCredits = calculateEstimatedCredits(options.operation, textLength);
      
      // Get user's remaining credits (this would be implemented in a user service)
      const remainingCredits = await getUserRemainingCredits(userId);
      
      // Check if user has sufficient credits
      if (remainingCredits < estimatedCredits) {
        logger.warn({
          requestId,
          userId,
          operation: options.operation,
          estimatedCredits,
          remainingCredits,
          path: req.path,
        }, "Insufficient AI credits");
        
        return res.status(402).json({
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: `Insufficient credits. Required: ${estimatedCredits}, Available: ${remainingCredits}`,
            estimatedCredits,
            remainingCredits,
            operation: options.operation,
          },
        });
      }

      // Deduct credits from user's account
      await deductUserCredits(userId, estimatedCredits);
      
      // Store credit context in request for tracking
      req.creditsUsed = estimatedCredits;
      req.creditContext = {
        userId,
        operation: options.operation,
        estimatedCredits,
        remainingCredits: remainingCredits - estimatedCredits,
      };

      logger.info({
        requestId,
        userId,
        operation: options.operation,
        creditsUsed: estimatedCredits,
        remainingCredits: remainingCredits - estimatedCredits,
        path: req.path,
      }, "AI credits deducted successfully");

      next();
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error({
        requestId,
        userId: (req.user as Record<string, unknown> | undefined)?.id || "unknown",
        operation: options.operation,
        error: error instanceof Error ? error.message : String(error),
        duration,
        path: req.path,
      }, "Credit deduction failed");
      
      sendErrorResponse(res, error, { 
        statusCode: 500, 
        code: "CREDIT_DEDUCTION_ERROR", 
        message: "Failed to process credits" 
      });
    }
  };
};

/**
 * Get user's remaining AI credits from database.
 * This would be implemented with your user service.
 */
const getUserRemainingCredits = async (userId: string): Promise<number> => {
  const user = await User.findById(userId).select("aiCreditsRemaining aiCreditsResetAt aiCreditsPlan");
  if (!user) {
    throw new AuthError("User not found", { code: "USER_NOT_FOUND" });
  }

  const now = new Date();
  const resetAt = user.aiCreditsResetAt ? new Date(user.aiCreditsResetAt) : null;
  if (!resetAt || resetAt <= now) {
    const plan = user.aiCreditsPlan || "free";
    const resetCredits = getPlanCredits(plan);
    const nextResetAt = getNextCreditsResetAt(now);
    user.aiCreditsRemaining = resetCredits;
    user.aiCreditsResetAt = nextResetAt;
    user.aiCreditsPlan = plan;
    await user.save();
    return resetCredits;
  }

  return Math.max(0, user.aiCreditsRemaining || 0);
};

/**
 * Deduct AI credits from user's account.
 * This would be implemented with your user service.
 */
const deductUserCredits = async (userId: string, amount: number): Promise<void> => {
  if (amount <= 0) return;

  await User.findByIdAndUpdate(userId, {
    $inc: { aiCreditsRemaining: -Math.abs(amount) },
  });

  logger.info({ userId, amount, action: "credit_deduction" }, "Credits deducted");
};

const getPlanCredits = (plan: string | undefined) => {
  switch (plan) {
    case "basic":
      return 1000;
    case "premium":
      return 5000;
    case "enterprise":
      return 20000;
    case "free":
    default:
      return 200;
  }
};

const getNextCreditsResetAt = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

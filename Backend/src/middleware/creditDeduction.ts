import { Request, Response, NextFunction } from "express";
import { logger } from "../observability";
import { sendErrorResponse } from "../utils/errorResponse";
import { AuthError } from "../errors/AppError";
import { calculateEstimatedCredits } from "../utils/creditCalculator"

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

      // Calculate estimated credits based on operation and text length
      const estimatedCredits = calculateEstimatedCredits(options.operation, options.textLength);
      
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
  // TODO: Implement actual database query to get user credits
  // For now, return a placeholder value
  // Example: const user = await User.findById(userId);
  // return user?.aiCreditsRemaining || 0;
  
  // Placeholder implementation - replace with actual database logic
  return 200; // Default free plan amount
};

/**
 * Deduct AI credits from user's account.
 * This would be implemented with your user service.
 */
const deductUserCredits = async (userId: string, amount: number): Promise<void> => {
  // TODO: Implement actual database update to deduct credits
  // Example: await User.findByIdAndUpdate(userId, { $inc: { aiCreditsRemaining: -amount } });
  
  logger.info({
    userId,
    amount,
    action: "credit_deduction",
  }, "Credits deducted (placeholder implementation)");
};

import { logger } from "../observability";

export type AiOperation = 'improve-text' | 'enhance-bullet' | 'ats-analysis';

export interface CreditCalculationResult {
  baseCredits: number;
  lengthBonus: number;
  totalCredits: number;
  breakdown: {
    base: number;
    length: number;
    capped: number;
  };
}

/**
 * Calculate estimated AI credits for a given operation and text length.
 * Optimized to prevent excessive credit usage on long text.
 */
export const calculateEstimatedCredits = (
  operation: AiOperation,
  textLength: number = 0
): number => {
  const baseCredits = getBaseCredits(operation);
  const lengthBonus = calculateLengthBonus(textLength, operation);
  const totalCredits = baseCredits + lengthBonus;
  
  // Cap total credits to prevent excessive deductions
  const cappedTotal = Math.min(totalCredits, getCappedCredits(operation));
  
  const breakdown = {
    base: baseCredits,
    length: lengthBonus,
    capped: cappedTotal - baseCredits,
  };
  
  logger.debug({
    operation,
    textLength,
    baseCredits,
    lengthBonus,
    totalCredits,
    cappedTotal,
    breakdown,
  }, "AI credit calculation");
  
  return cappedTotal;
};

/**
 * Get base credits for each AI operation.
 */
const getBaseCredits = (operation: AiOperation): number => {
  const baseCredits: Record<AiOperation, number> = {
    'improve-text': 2,
    'enhance-bullet': 2,
    'ats-analysis': 5,
  };
  
  return baseCredits[operation];
};

/**
 * Calculate length-based bonus credits with optimization.
 * Only adds credits for text beyond reasonable limits to prevent abuse.
 */
const calculateLengthBonus = (textLength: number, operation: AiOperation): number => {
  // Define optimal text lengths for each operation
  const optimalLengths: Record<AiOperation, number> = {
    'improve-text': 1000,
    'enhance-bullet': 600,
    'ats-analysis': 2000,
  };
  
  const optimalLength = optimalLengths[operation];
  
  // Only charge extra credits for text significantly beyond optimal length
  if (textLength <= optimalLength) {
    return 0;
  }
  
  const excessLength = textLength - optimalLength;
  
  // More efficient scaling: 1 credit per 2000 chars beyond optimal (instead of 1000)
  // This reduces the impact of long text on credit consumption
  let bonusCredits = Math.floor(excessLength / 2000);
  
  // Cap bonus credits to prevent excessive charges
  const maxBonus = getMaxBonusCredits(operation);
  bonusCredits = Math.min(bonusCredits, maxBonus);
  
  return bonusCredits;
};

/**
 * Get maximum bonus credits for each operation to prevent abuse.
 */
const getMaxBonusCredits = (operation: AiOperation): number => {
  const maxBonuses: Record<AiOperation, number> = {
    'improve-text': 3,  // Max 5 total credits (2 + 3)
    'enhance-bullet': 3,  // Max 5 total credits (2 + 3)
    'ats-analysis': 5,   // Max 10 total credits (5 + 5)
  };
  
  return maxBonuses[operation];
};

/**
 * Get maximum total credits for each operation.
 */
const getCappedCredits = (operation: AiOperation): number => {
  const cappedCredits: Record<AiOperation, number> = {
    'improve-text': 5,
    'enhance-bullet': 5,
    'ats-analysis': 10,
  };
  
  return cappedCredits[operation];
};

/**
 * Validate that calculated credits are within expected ranges.
 */
export const validateCreditCalculation = (
  operation: AiOperation,
  textLength: number,
  calculatedCredits: number
): { valid: boolean; reason?: string } => {
  const minCredits = getBaseCredits(operation);
  const maxCredits = getCappedCredits(operation);
  
  if (calculatedCredits < minCredits) {
    return {
      valid: false,
      reason: `Calculated credits (${calculatedCredits}) below minimum (${minCredits})`,
    };
  }
  
  if (calculatedCredits > maxCredits) {
    return {
      valid: false,
      reason: `Calculated credits (${calculatedCredits}) above maximum (${maxCredits})`,
    };
  }
  
  return { valid: true };
};

/**
 * Estimate credits for a batch of operations.
 * Useful for showing users total cost before committing to multiple operations.
 */
export const estimateBatchCredits = (
  operations: Array<{ operation: AiOperation; textLength: number }>
): {
  totalCredits: number;
  breakdown: Record<AiOperation, number>;
  savings: number;
} => {
  const breakdown: Record<AiOperation, number> = {
    'improve-text': 0,
    'enhance-bullet': 0,
    'ats-analysis': 0,
  };
  
  let totalCredits = 0;
  
  operations.forEach(({ operation, textLength }) => {
    const credits = calculateEstimatedCredits(operation, textLength);
    breakdown[operation] += credits;
    totalCredits += credits;
  });
  
  // Calculate potential savings from batching (if any)
  const individualTotal = operations.reduce(
    (sum, { operation, textLength }) => sum + calculateEstimatedCredits(operation, textLength),
    0
  );
  
  const savings = individualTotal - totalCredits;
  
  return {
    totalCredits,
    breakdown,
    savings,
  };
};
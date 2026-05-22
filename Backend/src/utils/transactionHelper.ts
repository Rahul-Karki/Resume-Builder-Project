import mongoose from "mongoose";
import { logger } from "../observability";

const MAX_TRANSACTION_RETRIES = 3;
const TRANSIENT_ERROR_CODES = new Set([
  "TransientTransactionError",
  "UnknownTransactionCommitResult",
]);

type TransactionOptions = {
  maxRetries?: number;
};

export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_TRANSACTION_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      await session.abortTransaction();

      if (
        attempt < maxRetries &&
        error?.errorLabels?.some((label: string) => TRANSIENT_ERROR_CODES.has(label))
      ) {
        logger.warn({ attempt, maxRetries, error: error.message }, "Transaction transient error, retrying");
        lastError = error;
        continue;
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw lastError || new Error("Transaction failed after all retries");
}

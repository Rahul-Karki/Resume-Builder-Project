import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStartSession = vi.fn();
const mockStartTransaction = vi.fn();
const mockCommitTransaction = vi.fn();
const mockAbortTransaction = vi.fn();
const mockEndSession = vi.fn();

vi.mock("mongoose", () => ({
  default: {
    startSession: mockStartSession,
  },
}));

vi.mock("../../observability", () => ({ logger: { warn: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  mockStartSession.mockResolvedValue({
    startTransaction: mockStartTransaction,
    commitTransaction: mockCommitTransaction,
    abortTransaction: mockAbortTransaction,
    endSession: mockEndSession,
  });
});

describe("transactionHelper", () => {
  describe("withTransaction", () => {
    it("should execute the callback within a transaction", async () => {
      const { withTransaction } = await import("../../utils/transactionHelper");
      const fn = vi.fn().mockResolvedValue("result");

      const result = await withTransaction(fn);

      expect(result).toBe("result");
      expect(mockStartSession).toHaveBeenCalled();
      expect(mockStartTransaction).toHaveBeenCalled();
      expect(mockCommitTransaction).toHaveBeenCalled();
      expect(mockEndSession).toHaveBeenCalled();
    });

    it("should commit the transaction on success", async () => {
      const { withTransaction } = await import("../../utils/transactionHelper");
      const fn = vi.fn().mockResolvedValue("done");

      await withTransaction(fn);

      expect(mockCommitTransaction).toHaveBeenCalled();
      expect(mockAbortTransaction).not.toHaveBeenCalled();
    });

    it("should abort the transaction on error", async () => {
      const { withTransaction } = await import("../../utils/transactionHelper");
      const fn = vi.fn().mockRejectedValue(new Error("Operation failed"));

      await expect(withTransaction(fn)).rejects.toThrow("Operation failed");
      expect(mockAbortTransaction).toHaveBeenCalled();
    });

    it("should retry on transient transaction errors", async () => {
      const { withTransaction } = await import("../../utils/transactionHelper");
      const errorWithLabel = new Error("TransientError") as any;
      errorWithLabel.errorLabels = ["TransientTransactionError"];

      const fn = vi.fn()
        .mockRejectedValueOnce(errorWithLabel)
        .mockResolvedValueOnce("success");

      const result = await withTransaction(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});

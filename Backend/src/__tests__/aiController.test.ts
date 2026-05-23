import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../utils/memoryCache", () => ({
  MemoryLRUCache: class {
    constructor(maxSize = 200) {}
    get = vi.fn(() => null);
    set = vi.fn();
    delete = vi.fn(() => true);
    deleteByPattern = vi.fn(() => 0);
    size = vi.fn(() => 0);
    cleanup = vi.fn();
    clear = vi.fn();
  },
  memoryCache: { get: vi.fn(() => null), set: vi.fn(), delete: vi.fn(() => true), deleteByPattern: vi.fn(() => 0) }
}));
vi.mock("../services/aiService");
vi.mock("../utils/aiCredits");
vi.mock("../utils/controllerObservability", () => ({ startControllerSpan: vi.fn(() => ({})), markSpanSuccess: vi.fn(), markSpanError: vi.fn(), finishControllerSpan: vi.fn() }));
vi.mock("../utils/errorResponse", () => ({ sendErrorResponse: vi.fn((res: any, err: any) => res.status(err?.statusCode ?? 500).json({ message: err?.message ?? "Error" })) }));
vi.mock("../utils/tokenCounter", () => ({ calculateAICost: vi.fn(() => ({ input: 0, output: 0, total: 0 })) }));
vi.mock("../observability/aiMetrics", () => ({ trackAiRequest: vi.fn(), trackValidationError: vi.fn() }));
vi.mock("../errors/AppError", () => ({ AuthError: class extends Error { statusCode = 401; code = "AUTH_REQUIRED"; constructor(m: string) { super(m); } } }));
vi.mock("../observability", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { improveTextHandler, checkGrammarHandler, enhanceBulletHandler } from "../controllers/aiController";
import { improveText, checkGrammar, enhanceBullet } from "../services/aiService";
import { assertAiCreditsAvailable, deductAiCredits, refreshAiCreditsIfNeeded } from "../utils/aiCredits";

const mockAiResult = (overrides = {}) => ({
  result: "Improved text",
  _provider: "openai",
  _model: "gpt-4",
  _tokens: { input: 10, output: 20 },
  _fallback: false,
  ...overrides,
});

describe("aiController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("improveTextHandler", () => {
    it("should improve text and return the result", async () => {
      vi.mocked(assertAiCreditsAvailable).mockResolvedValue(true);
      vi.mocked(refreshAiCreditsIfNeeded).mockResolvedValue(undefined);
      vi.mocked(improveText).mockResolvedValue(mockAiResult() as any);
      vi.mocked(deductAiCredits).mockResolvedValue(true);

      const req = { user: { id: "user1" }, body: { text: "sample text", section: "summary", tone: "professional" }, headers: {}, creditContext: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as any;

      await improveTextHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(improveText).toHaveBeenCalledWith(expect.objectContaining({ text: "sample text", section: "summary" }));
    });


  });

  describe("checkGrammarHandler", () => {
    it("should check grammar and return corrections", async () => {
      vi.mocked(assertAiCreditsAvailable).mockResolvedValue(true);
      vi.mocked(refreshAiCreditsIfNeeded).mockResolvedValue(undefined);
      vi.mocked(checkGrammar).mockResolvedValue(mockAiResult({ result: [{ original: "was", corrected: "were", offset: 0, explanation: "Subject-verb agreement" }] }) as any);
      vi.mocked(deductAiCredits).mockResolvedValue(true);

      const req = { user: { id: "user1" }, body: { text: "He was going there" }, headers: {}, creditContext: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as any;

      await checkGrammarHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("enhanceBulletHandler", () => {
    it("should enhance a bullet point and return the result", async () => {
      vi.mocked(assertAiCreditsAvailable).mockResolvedValue(true);
      vi.mocked(refreshAiCreditsIfNeeded).mockResolvedValue(undefined);
      vi.mocked(enhanceBullet).mockResolvedValue(mockAiResult() as any);
      vi.mocked(deductAiCredits).mockResolvedValue(true);

      const req = { user: { id: "user1" }, body: { text: "Did stuff", context: "Software engineer role" }, headers: {}, creditContext: {} } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as any;

      await enhanceBulletHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

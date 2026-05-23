import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReferentialIntegrityValidator } from "../middleware/referentialIntegrity";

vi.mock("../utils/mongooseModelResolver", () => ({
  getModelIfRegistered: vi.fn(),
  resolveModelByCollection: vi.fn(),
}));

import { getModelIfRegistered } from "../utils/mongooseModelResolver";

describe("referentialIntegrityMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow the request when all referenced documents exist", async () => {
    vi.mocked(getModelIfRegistered).mockReturnValue({
      findById: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "user1" }) }) }),
    });

    const validator = new ReferentialIntegrityValidator([]);
    const result = await validator.validate("resumes", { userId: "user1" });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return errors when a referenced document does not exist", async () => {
    vi.mocked(getModelIfRegistered).mockReturnValue({
      findById: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }),
    });

    const validator = new ReferentialIntegrityValidator([]);
    const result = await validator.validate("resumes", { userId: "nonexistent" });

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("does not exist");
  });

  it("should skip validation when referenced fields are not present in the data", async () => {
    vi.mocked(getModelIfRegistered).mockReturnValue({
      findById: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "user1" }) }) }),
    });

    const validator = new ReferentialIntegrityValidator([]);
    const result = await validator.validate("aiusages", { userId: "user1" });

    expect(result.valid).toBe(true);
  });

  it("should handle nested object references", async () => {
    vi.mocked(getModelIfRegistered).mockReturnValue({
      findById: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: "tmpl1" }) }) }),
    });

    const validator = new ReferentialIntegrityValidator([
      { collection: "resumes", field: "templateId", references: { model: "Template", field: "_id" }, allowNull: false },
    ]);
    const result = await validator.validate("resumes", { userId: "user1", templateId: "tmpl1" });

    expect(result.valid).toBe(true);
  });
});

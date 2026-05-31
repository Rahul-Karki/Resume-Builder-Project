import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReferentialIntegrityValidator } from "../middleware/referentialIntegrity";

vi.mock("../utils/mongooseModelResolver", () => ({
  getModelIfRegistered: vi.fn(),
  resolveModelByCollection: vi.fn(),
}));

import { getModelIfRegistered, resolveModelByCollection } from "../utils/mongooseModelResolver";

describe("referentialIntegrityMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findOrphanedDocuments", () => {
    it("uses aggregation pipeline to avoid loading all parent IDs into memory", async () => {
      const mockAggregate = vi.fn().mockResolvedValue([{ _id: "orphan1" }]);
      const mockCollection = { name: "users" };

      vi.mocked(getModelIfRegistered).mockReturnValue({
        collection: mockCollection,
      });
      vi.mocked(resolveModelByCollection).mockReturnValue({
        aggregate: mockAggregate,
      });

      // Default rules include one for resumes/userId → User
      const validator = new ReferentialIntegrityValidator([]);

      const orphans = await validator.findOrphanedDocuments("resumes");

      expect(mockAggregate).toHaveBeenCalledTimes(1);
      const pipeline = mockAggregate.mock.calls[0][0];
      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ $lookup: expect.objectContaining({ from: "users" }) }),
          expect.objectContaining({ $match: expect.objectContaining({ parent: { $size: 0 } }) }),
        ]),
      );
      expect(orphans).toHaveLength(1);
      expect(orphans[0]._id).toBe("orphan1");
    });

    it("returns empty array when no orphans exist", async () => {
      const mockCollection = { name: "users" };
      vi.mocked(getModelIfRegistered).mockReturnValue({
        collection: mockCollection,
      });
      vi.mocked(resolveModelByCollection).mockReturnValue({
        aggregate: vi.fn().mockResolvedValue([]),
      });

      const validator = new ReferentialIntegrityValidator([]);
      const orphans = await validator.findOrphanedDocuments("resumes");

      expect(orphans).toHaveLength(0);
    });

    it("returns empty array when model is not registered", async () => {
      vi.mocked(getModelIfRegistered).mockReturnValue(null);
      vi.mocked(resolveModelByCollection).mockReturnValue(null);

      const validator = new ReferentialIntegrityValidator([]);
      const orphans = await validator.findOrphanedDocuments("resumes");

      expect(orphans).toHaveLength(0);
    });
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

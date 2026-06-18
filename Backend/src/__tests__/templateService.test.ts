import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../models/Template", () => {
  const mockSave = vi.fn();
  const mockTemplate = {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    bulkWrite: vi.fn(),
  };
  const TemplateClass = vi.fn(() => ({ save: mockSave }));
  Object.assign(TemplateClass, mockTemplate);
  TemplateClass.prototype.save = mockSave;
  return { default: TemplateClass, ITemplate: {} };
});

vi.mock("../models/TemplateUsage", () => ({
  default: {
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../models/User", () => ({
  default: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../models/Resume", () => ({
  default: {
    countDocuments: vi.fn(),
  },
}));

vi.mock("../observability", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import Template from "../models/Template";
import { TemplateService } from "../services/templateService";

describe("templateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should return paginated templates", async () => {
      const mockTemplates = [{ _id: "1", name: "Template 1" }];
      (Template.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockTemplates),
      });
      (Template.countDocuments as any).mockResolvedValue(1);

      const result = await TemplateService.getAll({ status: "published" }, 1, 10);

      expect(result.templates).toEqual(mockTemplates);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should apply status filter", async () => {
      (Template.find as any).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });
      (Template.countDocuments as any).mockResolvedValue(0);

      await TemplateService.getAll({ status: "draft" });

      expect(Template.find).toHaveBeenCalledWith({ status: "draft" });
    });
  });

  describe("getById", () => {
    it("should return template by id", async () => {
      const mockTpl = { _id: "tpl-1", name: "Test Template" };
      (Template.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockTpl) });

      const result = await TemplateService.getById("tpl-1");

      expect(result).toEqual(mockTpl);
    });

    it("should return null when not found", async () => {
      (Template.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

      const result = await TemplateService.getById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should throw when layoutId already exists", async () => {
      (Template.findOne as any).mockResolvedValue({ _id: "existing" });

      const dto = {
        layoutId: "dup-layout",
        name: "Duplicate",
        description: "",
        category: "tech" as const,
        audience: "tech" as const,
        tag: "",
        tags: [],
        isPremium: false,
        sortOrder: 0,
        cssVars: {},
        slots: {},
      };

      await expect(TemplateService.create(dto, "admin-1")).rejects.toThrow(
        'layoutId "dup-layout" is already in use',
      );
    });
  });

  describe("update", () => {
    it("should update template fields", async () => {
      const updated = { _id: "tpl-1", name: "Updated", status: "published" };
      (Template.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) });

      const result = await TemplateService.update("tpl-1", { name: "Updated" }, "admin-1");

      expect(result).toEqual(updated);
    });
  });

  describe("setStatus", () => {
    it("should set published status with date", async () => {
      const updated = { _id: "tpl-1", status: "published", publishedAt: expect.any(Date) };
      (Template.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) });

      const result = await TemplateService.setStatus("tpl-1", "published", "admin-1");

      expect(result).toEqual(updated);
    });

    it("should set draft status without date", async () => {
      const updated = { _id: "tpl-1", status: "draft" };
      (Template.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) });

      const result = await TemplateService.setStatus("tpl-1", "draft", "admin-1");

      expect(result).toEqual(updated);
    });
  });

  describe("togglePremium", () => {
    it("should return null when template not found", async () => {
      (Template.findById as any).mockResolvedValue(null);

      const result = await TemplateService.togglePremium("nonexistent", "admin-1");

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should return true when deletion succeeds", async () => {
      (Template.findByIdAndDelete as any).mockResolvedValue({ _id: "tpl-1" });

      const result = await TemplateService.delete("tpl-1");

      expect(result).toBe(true);
    });

    it("should return false when template not found", async () => {
      (Template.findByIdAndDelete as any).mockResolvedValue(null);

      const result = await TemplateService.delete("nonexistent");

      expect(result).toBe(false);
    });
  });
});

// ─── Module: resumeTemplate ───────────────────────────
import { describe, it, expect } from "vitest";
import { normalizeResumeTemplateId } from "../../utils/resumeTemplate";
import {
  createTemplateSchema,
  createResumeSchema,
  publicTemplateListQuerySchema,
  updateResumeSchema,
} from "../../validation/schemas";

describe("resumeTemplate", () => {
  describe("normalizeResumeTemplateId", () => {
    it("maps legacy template labels to current ids", () => {
      expect(normalizeResumeTemplateId("Classic Template")).toBe("classic");
      expect(normalizeResumeTemplateId("executive-template")).toBe("executive");
      expect(normalizeResumeTemplateId("Academic")).toBe("scholarly");
      expect(normalizeResumeTemplateId("two column")).toBe("sidebar");
      expect(normalizeResumeTemplateId("customer-support-template")).toBe("customer-service");
      expect(normalizeResumeTemplateId("Healthcare Template")).toBe("healthcare");
      expect(normalizeResumeTemplateId("Functional Template")).toBe("functional");
      expect(normalizeResumeTemplateId("Administrative Assistant Template")).toBe("traditional-assistant");
      expect(normalizeResumeTemplateId("Simple Volunteer Template")).toBe("community-impact");
    });

    it("falls back to classic for removed unknown templates", () => {
      expect(normalizeResumeTemplateId("retired-template")).toBe("classic");
      expect(normalizeResumeTemplateId("")).toBe("classic");
      expect(normalizeResumeTemplateId(undefined)).toBe("classic");
    });
  });

  describe("schemas", () => {
    it("createResumeSchema accepts github in personal info", () => {
      const parsed = createResumeSchema.parse({
        title: "Rahul Resume",
        templateId: "Classic Template",
        personalInfo: {
          name: "Rahul",
          github: "https://github.com/rahul",
        },
      });

      expect(parsed.personalInfo?.github).toBe("https://github.com/rahul");
    });

    it("updateResumeSchema accepts legacy template ids and github-only updates", () => {
      const parsed = updateResumeSchema.parse({
        templateId: "Academic Template",
        personalInfo: {
          github: "https://github.com/rahul",
        },
      });

      expect(parsed.templateId).toBe("Academic Template");
      expect(parsed.personalInfo?.github).toBe("https://github.com/rahul");
    });

    it("createTemplateSchema accepts the new audience split", () => {
      const parsed = createTemplateSchema.parse({
        layoutId: "operations",
        name: "Operations",
        category: "non-tech",
        audience: "non-tech",
        tags: ["SDE", "Backend"],
      });

      expect(parsed.audience).toBe("non-tech");
      expect(parsed.tags).toEqual(["SDE", "Backend"]);
    });

    it("publicTemplateListQuerySchema accepts audience filters", () => {
      const parsed = publicTemplateListQuerySchema.parse({
        audience: "tech",
      });

      expect(parsed.audience).toBe("tech");
    });
  });
});

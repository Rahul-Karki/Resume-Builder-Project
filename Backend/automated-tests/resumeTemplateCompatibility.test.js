const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeResumeTemplateId } = require("../dist/utils/resumeTemplate");
const {
  createTemplateSchema,
  createResumeSchema,
  publicTemplateListQuerySchema,
  updateResumeSchema,
} = require("../dist/validation/schemas");

test("normalizeResumeTemplateId maps legacy template labels to current ids", () => {
  assert.equal(normalizeResumeTemplateId("Classic Template"), "classic");
  assert.equal(normalizeResumeTemplateId("executive-template"), "executive");
  assert.equal(normalizeResumeTemplateId("Academic"), "scholarly");
  assert.equal(normalizeResumeTemplateId("two column"), "sidebar");
  assert.equal(normalizeResumeTemplateId("customer-support-template"), "customer-service");
  assert.equal(normalizeResumeTemplateId("Healthcare Template"), "healthcare");
  assert.equal(normalizeResumeTemplateId("Functional Template"), "functional");
  assert.equal(normalizeResumeTemplateId("Administrative Assistant Template"), "traditional-assistant");
  assert.equal(normalizeResumeTemplateId("Simple Volunteer Template"), "community-impact");
});

test("normalizeResumeTemplateId falls back to classic for removed unknown templates", () => {
  assert.equal(normalizeResumeTemplateId("retired-template"), "classic");
  assert.equal(normalizeResumeTemplateId(""), "classic");
  assert.equal(normalizeResumeTemplateId(undefined), "classic");
});

test("createResumeSchema accepts github in personal info", () => {
  const parsed = createResumeSchema.parse({
    title: "Rahul Resume",
    templateId: "Classic Template",
    personalInfo: {
      name: "Rahul",
      github: "https://github.com/rahul",
    },
  });

  assert.equal(parsed.personalInfo.github, "https://github.com/rahul");
});

test("updateResumeSchema accepts legacy template ids and github-only updates", () => {
  const parsed = updateResumeSchema.parse({
    templateId: "Academic Template",
    personalInfo: {
      github: "https://github.com/rahul",
    },
  });

  assert.equal(parsed.templateId, "Academic Template");
  assert.equal(parsed.personalInfo.github, "https://github.com/rahul");
});

test("createTemplateSchema accepts the new audience split", () => {
  const parsed = createTemplateSchema.parse({
    layoutId: "operations",
    name: "Operations",
    category: "non-tech",
    audience: "non-tech",
    tags: ["SDE", "Backend"],
  });

  assert.equal(parsed.audience, "non-tech");
  assert.deepEqual(parsed.tags, ["SDE", "Backend"]);
});

test("publicTemplateListQuerySchema accepts audience filters", () => {
  const parsed = publicTemplateListQuerySchema.parse({
    audience: "tech",
  });

  assert.equal(parsed.audience, "tech");
});

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildSafePdfDocument } = require("../dist/utils/pdfDocument");

test("buildSafePdfDocument preserves the provided resume markup", () => {
  const html = buildSafePdfDocument("Sample Resume", "<div class=\"resume-root\"><span>Custom style</span></div>");

  assert.match(html, /<div class="resume-root"><span>Custom style<\/span><\/div>/);
  assert.match(html, /@page \{ size: A4; margin: 0; \}/);
});

test("buildSafePdfDocument does not force the child to a fixed height", () => {
  const html = buildSafePdfDocument("Sample Resume", "<div class=\"resume-root\">Content</div>");

  assert.doesNotMatch(html, /max-height:\s*297mm/);
  assert.doesNotMatch(html, /overflow:\s*hidden/);
});
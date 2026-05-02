const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("./helpers/setupEnv");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const controllerPath = path.join(distRoot, "controllers", "templateController.js");
const servicePath = path.join(distRoot, "services", "templateService.js");
const observabilityPath = path.join(distRoot, "observability.js");
const spanUtilsPath = path.join(distRoot, "utils", "controllerObservability.js");
const redisCachePath = path.join(distRoot, "middleware", "redisCache.js");
const templatePath = path.join(distRoot, "models", "Template.js");
const templateUsagePath = path.join(distRoot, "models", "TemplateUsage.js");

function createRes() {
  return {
    statusCode: null,
    jsonBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
  };
}

function loadController(overrides = {}) {
  const serviceMock = overrides.serviceMock ?? {
    getAll: async () => [{ layoutId: "modern", category: "tech" }],
    create: async (dto) => ({ _id: "template-1", ...dto }),
  };

  return loadWithMocks(controllerPath, {
    [servicePath]: {
      TemplateService: serviceMock,
    },
    [observabilityPath]: {
      logger: {
        info: () => {},
        error: () => {},
      },
    },
    [spanUtilsPath]: {
      startControllerSpan: () => ({}),
      finishControllerSpan: () => {},
      markSpanError: () => {},
      markSpanSuccess: () => {},
    },
    [redisCachePath]: {
      invalidateRedisCache: async () => {},
      redisCacheScopes: {
        publicTemplates: "public-templates",
        adminTemplates: "admin-templates",
        adminDashboard: "admin-dashboard",
        adminAnalytics: "admin-analytics",
      },
    },
    [templatePath]: {},
    [templateUsagePath]: {},
  });
}

test("listPublicTemplates requests published tech templates", async () => {
  const calls = [];
  const { listPublicTemplates } = loadController({
    serviceMock: {
      getAll: async (filter) => {
        calls.push(filter);
        return [{ layoutId: "modern", category: "tech" }];
      },
    },
  });

  const req = { query: { category: "tech", audience: "tech" } };
  const res = createRes();

  await listPublicTemplates(req, res);

  assert.deepEqual(calls, [{ status: "published", category: "tech", audience: "tech" }]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.ok, true);
  assert.equal(res.jsonBody.data[0].layoutId, "modern");
});

test("createTemplate normalizes tags and tech category fields", async () => {
  const calls = [];
  const { createTemplate } = loadController({
    serviceMock: {
      create: async (dto, adminId) => {
        calls.push({ dto, adminId });
        return { _id: "template-2", ...dto };
      },
    },
  });

  const req = {
    body: {
      layoutId: "data-scientist",
      name: "Data Scientist",
      category: "tech",
      tag: "SDE",
      tags: ["SDE", "Backend"],
    },
    user: { id: "admin-1" },
  };
  const res = createRes();

  await createTemplate(req, res);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].dto.category, "tech");
  assert.deepEqual(calls[0].dto.audience, "tech");
  assert.deepEqual(calls[0].dto.tags, ["SDE", "Backend"]);
  assert.equal(calls[0].adminId, "admin-1");
  assert.equal(res.statusCode, 201);
  assert.equal(res.jsonBody.ok, true);
  assert.equal(res.jsonBody.data.layoutId, "data-scientist");
});

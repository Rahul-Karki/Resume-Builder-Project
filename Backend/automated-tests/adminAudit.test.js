const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const adminAuditPath = path.join(distRoot, "middleware", "adminAudit.js");
const securityLoggerPath = path.join(distRoot, "utils", "securityLogger.js");

function createRes() {
  const handlers = {};
  return {
    statusCode: 200,
    once(event, handler) {
      handlers[event] = handler;
    },
    trigger(event) {
      if (handlers[event]) {
        handlers[event]();
      }
    },
  };
}

test("adminAuditMiddleware logs the completed admin action", () => {
  const calls = [];
  const { adminAuditMiddleware } = loadWithMocks(adminAuditPath, {
    [securityLoggerPath]: {
      logAdminAction: (req, action, details) => {
        calls.push({ req, action, details });
      },
    },
  });

  const middleware = adminAuditMiddleware("templates");
  const req = {
    method: "PATCH",
    originalUrl: "/api/admin/templates/123/status",
    path: "/templates/123/status",
    route: { path: "/:id/status" },
    params: { id: "123" },
    query: { preview: "true" },
    user: { id: "admin-1" },
  };
  const res = createRes();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  res.trigger("finish");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, "PATCH templates:/:id/status");
  assert.equal(calls[0].details.resourceGroup, "templates");
  assert.equal(calls[0].details.resource, "/api/admin/templates/123/status");
  assert.equal(calls[0].details.statusCode, 200);
  assert.deepEqual(calls[0].details.params, { id: "123" });
});

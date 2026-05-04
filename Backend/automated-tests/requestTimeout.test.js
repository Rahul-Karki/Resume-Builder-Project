const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const requestTimeoutPath = path.join(distRoot, "middleware", "requestTimeout.js");
const observabilityPath = path.join(distRoot, "observability.js");
const envPath = path.join(distRoot, "config", "env.js");

const { requestTimeoutMiddleware, resolveRequestTimeoutMs } = loadWithMocks(requestTimeoutPath, {
  [observabilityPath]: {
    logger: {
      warn() {},
      info() {},
      error() {},
    },
  },
  [envPath]: {
    env: {},
  },
});

function createRes() {
  return {
    statusCode: null,
    body: null,
    headersSent: false,
    once() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("resolveRequestTimeoutMs extends PDF export routes", () => {
  const pdfReq = { baseUrl: "/api/resumes", path: "/123/export-pdf", originalUrl: "/api/resumes/123/export-pdf" };
  const regularReq = { baseUrl: "/api/templates", path: "/", originalUrl: "/api/templates" };

  assert.equal(resolveRequestTimeoutMs(pdfReq), 120000);
  assert.equal(resolveRequestTimeoutMs(regularReq), 30000);
});

test("requestTimeoutMiddleware sends a timeout response when the timer fires", () => {
  const originalSetTimeout = global.setTimeout;
  let capturedDelay = null;
  let capturedCallback = null;

  global.setTimeout = (callback, delay) => {
    capturedDelay = delay;
    capturedCallback = callback;
    return { mocked: true };
  };

  const req = {
    baseUrl: "/api/resumes",
    path: "/123/export-pdf",
    originalUrl: "/api/resumes/123/export-pdf",
  };
  const res = createRes();
  let nextCalled = false;

  requestTimeoutMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(capturedDelay, 120000);
  assert.equal(typeof capturedCallback, "function");

  capturedCallback();

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.message, "Request timed out");
  assert.equal(res.body.code, "REQUEST_TIMEOUT");
  assert.equal(typeof res.body.traceId, "string");

  global.setTimeout = originalSetTimeout;
});

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("./helpers/setupEnv");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const csrfProtectionPath = path.join(distRoot, "middleware", "csrfProtection.js");

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

function createReq(overrides = {}) {
  const headers = overrides.headers ?? {};

  return {
    method: overrides.method ?? "GET",
    path: overrides.path ?? "/api/test",
    headers,
    header(name) {
      return headers[name.toLowerCase()] ?? headers[name] ?? "";
    },
  };
}

test("csrfProtection allows safe methods without a token", () => {
  const { csrfProtection } = loadWithMocks(csrfProtectionPath, {});
  const req = createReq({ method: "GET" });
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("csrfProtection exempts the refresh route", () => {
  const { csrfProtection } = loadWithMocks(csrfProtectionPath, {});
  const req = createReq({ method: "POST", path: "/api/refresh" });
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test("csrfProtection blocks unsafe requests with missing or mismatched tokens", () => {
  const { csrfProtection } = loadWithMocks(csrfProtectionPath, {});
  const req = createReq({
    method: "POST",
    headers: {
      cookie: "csrfToken=csrf-cookie-token",
      "x-csrf-token": "csrf-header-token",
    },
  });
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.jsonBody, { message: "CSRF validation failed" });
});

test("csrfProtection allows matching CSRF tokens", () => {
  const { csrfProtection } = loadWithMocks(csrfProtectionPath, {});
  const req = createReq({
    method: "POST",
    headers: {
      cookie: "csrfToken=csrf-token",
      "x-csrf-token": "csrf-token",
    },
  });
  const res = createRes();
  let nextCalled = false;

  csrfProtection(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});
const test = require("node:test");
const assert = require("node:assert/strict");

require("./helpers/setupEnv");

const {
  clearAuthCookies,
  setAccessTokenCookie,
  setAuthCookies,
  setCsrfCookie,
} = require("../dist/utils/authCookies");

const createReq = (overrides = {}) => ({
  secure: false,
  headers: {},
  ...overrides,
});

const createRes = () => {
  const cookies = [];
  const cleared = [];

  return {
    cookies,
    cleared,
    cookie(name, value, options) {
      cookies.push({ name, value, options });
    },
    clearCookie(name, options) {
      cleared.push({ name, options });
    },
  };
};

test("setAccessTokenCookie sets expected auth cookie attributes", () => {
  const req = createReq();
  const res = createRes();

  setAccessTokenCookie(req, res, "access-123");

  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, "accessToken");
  assert.equal(res.cookies[0].value, "access-123");
  assert.equal(res.cookies[0].options.httpOnly, true);
  assert.equal(res.cookies[0].options.path, "/");
  assert.equal(res.cookies[0].options.maxAge, 15 * 60 * 1000);
  assert.equal(res.cookies[0].options.sameSite, "lax");
  assert.equal(res.cookies[0].options.secure, false);
});

test("setCsrfCookie returns token and sets client-readable cookie", () => {
  const req = createReq();
  const res = createRes();

  const csrfToken = setCsrfCookie(req, res);

  assert.match(csrfToken, /^[a-f0-9]{64}$/);
  assert.equal(res.cookies.length, 1);
  assert.equal(res.cookies[0].name, "csrfToken");
  assert.equal(res.cookies[0].value, csrfToken);
  assert.equal(res.cookies[0].options.httpOnly, false);
});

test("setAuthCookies sets access, refresh, and csrf cookies", () => {
  const req = createReq();
  const res = createRes();

  const csrfToken = setAuthCookies(req, res, "access-token", "refresh-token");

  assert.match(csrfToken, /^[a-f0-9]{64}$/);
  assert.equal(res.cookies.length, 3);
  assert.deepEqual(
    res.cookies.map((cookie) => cookie.name),
    ["accessToken", "refreshToken", "csrfToken"],
  );
});

test("clearAuthCookies clears auth and csrf cookies", () => {
  const req = createReq();
  const res = createRes();

  clearAuthCookies(req, res);

  assert.equal(res.cleared.length, 3);
  assert.deepEqual(
    res.cleared.map((cookie) => cookie.name),
    ["accessToken", "refreshToken", "csrfToken"],
  );
});

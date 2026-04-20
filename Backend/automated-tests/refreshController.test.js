const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("./helpers/setupEnv");

const { loadWithMocks } = require("./helpers/mockModule");

const distRoot = path.join(__dirname, "..", "dist");
const refreshControllerPath = path.join(distRoot, "controllers", "refreshController.js");
const generateTokenPath = path.join(distRoot, "utils", "generateToken.js");
const cookieParserPath = path.join(distRoot, "utils", "cookieParser.js");
const authCookiesPath = path.join(distRoot, "utils", "authCookies.js");
const envPath = path.join(distRoot, "config", "env.js");
const observabilityPath = path.join(distRoot, "observability.js");
const controllerObservabilityPath = path.join(distRoot, "utils", "controllerObservability.js");

function loadRefreshController(overrides = {}) {
  return loadWithMocks(refreshControllerPath, {
    [generateTokenPath]: {
      generateAccessToken: overrides.generateAccessToken ?? (() => "new-access-token"),
      generateRefreshToken: () => "unused-refresh-token",
    },
    [cookieParserPath]: {
      parseCookies: overrides.parseCookies ?? (() => ({ refreshToken: "refresh-token" })),
    },
    [authCookiesPath]: {
      setAccessTokenCookie: overrides.setAccessTokenCookie ?? (() => {}),
      setCsrfCookie: overrides.setCsrfCookie ?? (() => "csrf-token"),
    },
    [envPath]: {
      env: {
        JWT_REFRESH_SECRET: "refresh-secret",
      },
    },
    [observabilityPath]: {
      logger: overrides.logger ?? {
        warn() {},
        info() {},
        error() {},
      },
    },
    [controllerObservabilityPath]: {
      startControllerSpan: overrides.startControllerSpan ?? (() => ({
        setAttribute() {},
        recordException() {},
        setStatus() {},
        end() {},
      })),
      markSpanSuccess: overrides.markSpanSuccess ?? (() => {}),
      markSpanError: overrides.markSpanError ?? (() => {}),
      finishControllerSpan: overrides.finishControllerSpan ?? (() => {}),
    },
    jsonwebtoken: {
      verify: overrides.verify ?? (() => ({ userId: "user-123" })),
    },
  });
}

function createRes() {
  return {
    statusCode: null,
    jsonBody: null,
    sendStatusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
    sendStatus(code) {
      this.sendStatusCode = code;
      return this;
    },
  };
}

test("refreshAccessToken returns 401 when refresh token cookie is missing", () => {
  const calls = {
    verify: 0,
    generateAccessToken: 0,
    setAccessTokenCookie: 0,
    setCsrfCookie: 0,
  };

  const { refreshAccessToken } = loadRefreshController({
    parseCookies: () => ({}),
    verify: () => {
      calls.verify += 1;
      return { userId: "user-123" };
    },
    generateAccessToken: () => {
      calls.generateAccessToken += 1;
      return "new-access-token";
    },
    setAccessTokenCookie: () => {
      calls.setAccessTokenCookie += 1;
    },
    setCsrfCookie: () => {
      calls.setCsrfCookie += 1;
      return "csrf-token";
    },
  });

  const req = {
    headers: {},
    originalUrl: "/api/refresh",
  };
  const res = createRes();

  refreshAccessToken(req, res);

  assert.equal(res.sendStatusCode, 401);
  assert.equal(calls.verify, 0);
  assert.equal(calls.generateAccessToken, 0);
  assert.equal(calls.setAccessTokenCookie, 0);
  assert.equal(calls.setCsrfCookie, 0);
});

test("refreshAccessToken refreshes access cookie and returns csrf token for a valid refresh token", () => {
  const setAccessTokenCalls = [];
  const setCsrfCalls = [];

  const { refreshAccessToken } = loadRefreshController({
    parseCookies: () => ({ refreshToken: "refresh-token" }),
    verify: (token, secret) => {
      assert.equal(token, "refresh-token");
      assert.equal(secret, "refresh-secret");
      return { userId: "user-123" };
    },
    generateAccessToken: (userId) => {
      assert.equal(userId, "user-123");
      return "new-access-token";
    },
    setAccessTokenCookie: (req, res, accessToken) => {
      setAccessTokenCalls.push({ req, res, accessToken });
    },
    setCsrfCookie: (req, res) => {
      setCsrfCalls.push({ req, res });
      return "csrf-token";
    },
  });

  const req = {
    headers: {
      cookie: "refreshToken=refresh-token",
    },
    originalUrl: "/api/refresh",
  };
  const res = createRes();

  refreshAccessToken(req, res);

  assert.equal(res.jsonBody?.message, "Token refreshed");
  assert.equal(res.jsonBody?.csrfToken, "csrf-token");
  assert.equal(res.sendStatusCode, null);
  assert.equal(setAccessTokenCalls.length, 1);
  assert.equal(setAccessTokenCalls[0].accessToken, "new-access-token");
  assert.equal(setCsrfCalls.length, 1);
});

test("refreshAccessToken returns 403 when refresh token verification fails", () => {
  const { refreshAccessToken } = loadRefreshController({
    parseCookies: () => ({ refreshToken: "refresh-token" }),
    verify: () => {
      throw new Error("invalid refresh token");
    },
  });

  const req = {
    headers: {
      cookie: "refreshToken=refresh-token",
    },
    originalUrl: "/api/refresh",
  };
  const res = createRes();

  refreshAccessToken(req, res);

  assert.equal(res.sendStatusCode, 403);
});
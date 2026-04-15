const test = require("node:test");
const assert = require("node:assert/strict");

const { parseCookies } = require("../dist/utils/cookieParser");

test("parseCookies returns empty object when cookie header is missing", () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies(""), {});
});

test("parseCookies decodes keys and values and preserves equals signs", () => {
  const parsed = parseCookies("sessionId=abc123; csrfToken=hello%20world; nested=a%3Db%3Dc");

  assert.deepEqual(parsed, {
    sessionId: "abc123",
    csrfToken: "hello world",
    nested: "a=b=c",
  });
});

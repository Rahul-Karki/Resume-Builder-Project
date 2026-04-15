const test = require("node:test");
const assert = require("node:assert/strict");

require("./helpers/setupEnv");

const hashToken = require("../dist/utils/hashToken").default;

test("hashToken returns deterministic 64-char sha256 hex", () => {
  const token = "reset-token-value";
  const first = hashToken(token);
  const second = hashToken(token);

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("hashToken returns different hashes for different values", () => {
  const one = hashToken("token-one");
  const two = hashToken("token-two");

  assert.notEqual(one, two);
});

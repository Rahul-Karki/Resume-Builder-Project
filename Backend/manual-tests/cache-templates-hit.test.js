const { parseIntEnv, runRepeatedHttpTest } = require("./lib/http-test-runner");

const TEST_URL = process.env.TEST_URL ?? "https://resume-builder-project-backend-x5d8.onrender.com/api/templates";
const TEST_ATTEMPTS = parseIntEnv(process.env.TEST_ATTEMPTS, 2);
const TEST_DELAY_MS = parseIntEnv(process.env.TEST_DELAY_MS, 50);
const TEST_TIMEOUT_MS = parseIntEnv(process.env.TEST_TIMEOUT_MS, 12000);

runRepeatedHttpTest({
  testName: "Cache - Templates HIT",
  url: TEST_URL,
  method: "GET",
  attempts: TEST_ATTEMPTS,
  delayMs: TEST_DELAY_MS,
  timeoutMs: TEST_TIMEOUT_MS,
  evaluateSummary: (results) => {
    const first = results[0];
    const second = results[1];

    console.log("\nSummary:");
    if (!first || !second) {
      console.log("Need at least 2 attempts to validate MISS->HIT behavior.");
      return;
    }

    console.log(`Attempt1 x-cache: ${first.xCache ?? "-"} reason: ${first.xCacheReason ?? "-"}`);
    console.log(`Attempt2 x-cache: ${second.xCache ?? "-"} reason: ${second.xCacheReason ?? "-"}`);

    if (first.xCache === "MISS" && second.xCache === "HIT") {
      console.log("Cache behavior verified: MISS then HIT.");
    } else {
      console.log("Cache behavior not verified. Check cache provider and endpoint consistency.");
    }
  },
}).catch((error) => {
  console.error("Cache templates test failed:", error);
  process.exit(1);
});

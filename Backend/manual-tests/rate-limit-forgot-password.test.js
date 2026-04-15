const { parseIntEnv, runRepeatedHttpTest } = require("./lib/http-test-runner");

const TEST_URL = process.env.TEST_URL ?? "https://resume-builder-project-backend-x5d8.onrender.com/api/auth/forgot-password";
const TEST_EMAIL = process.env.TEST_EMAIL ?? "rate-limit-test@example.com";
const TEST_ATTEMPTS = parseIntEnv(process.env.TEST_ATTEMPTS, 30);
const TEST_DELAY_MS = parseIntEnv(process.env.TEST_DELAY_MS, 0);
const TEST_TIMEOUT_MS = parseIntEnv(process.env.TEST_TIMEOUT_MS, 12000);

runRepeatedHttpTest({
  testName: "Rate Limit - Forgot Password",
  url: TEST_URL,
  method: "POST",
  headers: { "Content-Type": "application/json" },
  bodyFactory: () => JSON.stringify({ email: TEST_EMAIL }),
  attempts: TEST_ATTEMPTS,
  delayMs: TEST_DELAY_MS,
  timeoutMs: TEST_TIMEOUT_MS,
  evaluateSummary: (results) => {
    const first429 = results.find((item) => item.status === 429);

    console.log("\nSummary:");
    console.log(`Total attempts: ${results.length}`);
    console.log(`429 observed: ${first429 ? "YES" : "NO"}`);

    if (first429) {
      console.log(`First 429 at attempt: ${first429.attempt}`);
      console.log(`Retry-After header: ${first429.retryAfter ?? "-"}`);
    } else {
      console.log("No 429 observed. Endpoint can still return 404/200 before limiter threshold.");
    }
  },
}).catch((error) => {
  console.error("Rate-limit forgot-password test failed:", error);
  process.exit(1);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async (requestFactory, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await requestFactory(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const parseIntEnv = (value, fallback) => {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const runRepeatedHttpTest = async ({
  testName,
  url,
  method = "GET",
  headers = {},
  bodyFactory,
  attempts = 10,
  delayMs = 0,
  timeoutMs = 12000,
  evaluateSummary,
}) => {
  console.log(`\n=== ${testName} ===`);
  console.log(
    JSON.stringify(
      {
        url,
        method,
        attempts,
        delayMs,
        timeoutMs,
      },
      null,
      2,
    ),
  );

  const results = [];

  for (let i = 1; i <= attempts; i += 1) {
    try {
      const requestBody = bodyFactory ? bodyFactory(i) : undefined;

      const response = await withTimeout(
        (signal) =>
          fetch(url, {
            method,
            headers,
            body: requestBody,
            signal,
          }),
        timeoutMs,
      );

      const responseText = await response.text();
      let parsedBody = null;

      try {
        parsedBody = JSON.parse(responseText);
      } catch {
        parsedBody = { raw: responseText.slice(0, 300) };
      }

      const summary = {
        attempt: i,
        status: response.status,
        limit: response.headers.get("x-ratelimit-limit"),
        remaining: response.headers.get("x-ratelimit-remaining"),
        retryAfter: response.headers.get("retry-after"),
        xCache: response.headers.get("x-cache"),
        xCacheReason: response.headers.get("x-cache-reason"),
        message: parsedBody?.message ?? null,
        retryAfterSeconds: parsedBody?.retryAfterSeconds ?? null,
      };

      results.push(summary);

      console.log(
        `[Attempt ${summary.attempt}] status=${summary.status} x-cache=${summary.xCache ?? "-"} reason=${summary.xCacheReason ?? "-"} limit=${summary.limit ?? "-"} remaining=${summary.remaining ?? "-"} retry-after=${summary.retryAfter ?? "-"}`,
      );
    } catch (error) {
      const reason = error?.name === "AbortError" ? "request-timeout" : String(error);
      console.error(`[Attempt ${i}] failed: ${reason}`);
      results.push({ attempt: i, status: 0, error: reason });
    }

    if (delayMs > 0 && i < attempts) {
      await sleep(delayMs);
    }
  }

  if (evaluateSummary) {
    evaluateSummary(results);
  }

  return results;
};

module.exports = {
  parseIntEnv,
  runRepeatedHttpTest,
};

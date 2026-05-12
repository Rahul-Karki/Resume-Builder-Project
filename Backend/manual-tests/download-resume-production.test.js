const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BASE_URL = "https://resume-builder-project-backend-x5d8.onrender.com";
const BASE_URL = (process.env.PRODUCTION_API_BASE_URL ?? process.env.TEST_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
const RESUME_ID = process.env.RESUME_ID ?? "";
const RESUME_PAYLOAD_FILE = process.env.RESUME_PAYLOAD_FILE ?? "";
const LOGIN_EMAIL = process.env.PRODUCTION_LOGIN_EMAIL ?? process.env.TEST_EMAIL ?? "";
const LOGIN_PASSWORD = process.env.PRODUCTION_LOGIN_PASSWORD ?? process.env.TEST_PASSWORD ?? "";
const AUTH_COOKIE = process.env.PRODUCTION_AUTH_COOKIE ?? process.env.AUTH_COOKIE ?? "";
const POLL_INTERVAL_MS = Number.parseInt(process.env.POLL_INTERVAL_MS ?? "5000", 10);
const MAX_POLLS = Number.parseInt(process.env.MAX_POLLS ?? "24", 10);
const TIMEOUT_MS = Number.parseInt(process.env.TIMEOUT_MS ?? "15000", 10);
const PRESET = process.env.PRESET ?? "standard";

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

const assertProductionUrl = (value) => {
  const parsed = new URL(value);
  if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
    throw new Error("This smoke test is production-only. Use PRODUCTION_API_BASE_URL, not localhost.");
  }
  return parsed;
};

const parseSetCookie = (setCookieHeader) => {
  if (!setCookieHeader) return "";
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : String(setCookieHeader)
        .split(/,\s*(?=[^;,=]+=)/)
        .filter(Boolean);
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
};

const readJsonFile = (filePath) => {
  const resolved = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
};

const fetchJson = async (url, options = {}) => {
  const response = await withTimeout(
    (signal) => fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
      signal,
    }),
    options.timeoutMs ?? TIMEOUT_MS,
  );

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { response, json };
};

const getAuthenticatedSession = async () => {
  if (AUTH_COOKIE) {
    return { cookieHeader: AUTH_COOKIE, csrfToken: process.env.PRODUCTION_CSRF_TOKEN ?? process.env.CSRF_TOKEN ?? "" };
  }

  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
    throw new Error("Provide either PRODUCTION_AUTH_COOKIE or PRODUCTION_LOGIN_EMAIL/PRODUCTION_LOGIN_PASSWORD.");
  }

  const loginUrl = `${BASE_URL}/api/auth/login`;
  const { response, json } = await fetchJson(loginUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(json)}`);
  }

  const cookieHeader = parseSetCookie(response.headers.getSetCookie ? response.headers.getSetCookie() : response.headers.get("set-cookie"));
  const csrfToken = json.csrfToken || "";

  if (!cookieHeader) {
    throw new Error("Login succeeded but no auth cookies were returned.");
  }

  return { cookieHeader, csrfToken };
};

const getResumePayload = () => {
  if (RESUME_PAYLOAD_FILE) {
    return { resume: readJsonFile(RESUME_PAYLOAD_FILE) };
  }

  if (RESUME_ID) {
    return { resumeId: RESUME_ID };
  }

  throw new Error("Provide RESUME_ID or RESUME_PAYLOAD_FILE.");
};

const main = async () => {
  const parsedBaseUrl = assertProductionUrl(BASE_URL);
  const session = await getAuthenticatedSession();
  const payload = { ...getResumePayload(), preset: PRESET };
  const cookies = session.cookieHeader;

  console.log("Production smoke test config:");
  console.log(JSON.stringify({ baseUrl: parsedBaseUrl.toString(), preset: PRESET, hasCookie: Boolean(cookies), hasCsrf: Boolean(session.csrfToken) }, null, 2));

  const queueResponse = await fetchJson(`${BASE_URL}/api/resumes/download-resume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
      ...(session.csrfToken ? { "x-csrf-token": session.csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  console.log(`Queue response status: ${queueResponse.response.status}`);
  console.log(JSON.stringify(queueResponse.json, null, 2));

  if (![200, 202].includes(queueResponse.response.status)) {
    throw new Error(`Queue endpoint failed: ${queueResponse.response.status}`);
  }

  const jobId = queueResponse.json.jobId;
  if (!jobId) {
    throw new Error("Queue response did not include a jobId.");
  }

  let lastStatus = null;
  for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
    const statusResponse = await fetchJson(`${BASE_URL}/api/resumes/job-status/${encodeURIComponent(jobId)}`, {
      headers: { Cookie: cookies },
    });

    lastStatus = statusResponse.json;
    console.log(`[Poll ${attempt}] status=${statusResponse.json.status} attempts=${statusResponse.json.attemptsMade}/${statusResponse.json.totalAttempts} lastError=${statusResponse.json.lastError ?? "-"}`);

    if (statusResponse.json.status === "completed") {
      break;
    }

    if (statusResponse.json.status === "failed") {
      throw new Error(`Job failed: ${JSON.stringify(statusResponse.json)}`);
    }

    if (attempt < MAX_POLLS) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  if (!lastStatus || lastStatus.status !== "completed") {
    throw new Error(`Job did not complete within ${MAX_POLLS} polls.`);
  }

  const downloadUrl = queueResponse.json.downloadUrl || lastStatus.resultUrl;
  if (!downloadUrl) {
    throw new Error("Completed job did not return a download URL.");
  }

  const pdfResponse = await fetch(`${BASE_URL}${downloadUrl.startsWith("/") ? downloadUrl : `/${downloadUrl}`}`, {
    headers: { Cookie: cookies },
  });

  const contentType = pdfResponse.headers.get("content-type") || "";
  const pdfBytes = await pdfResponse.arrayBuffer();

  console.log("Download verification:");
  console.log(JSON.stringify({ status: pdfResponse.status, contentType, bytes: pdfBytes.byteLength }, null, 2));

  if (!pdfResponse.ok) {
    throw new Error(`Download failed with status ${pdfResponse.status}`);
  }

  if (!contentType.includes("application/pdf")) {
    throw new Error(`Expected application/pdf, got ${contentType || "unknown"}`);
  }

  if (pdfBytes.byteLength < 1000) {
    throw new Error("Downloaded PDF is unexpectedly small.");
  }

  console.log("Production resume download queue smoke test passed.");
};

main().catch((error) => {
  console.error("Production resume download queue smoke test failed:", error);
  process.exit(1);
});
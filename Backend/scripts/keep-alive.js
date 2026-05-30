const http = require("http");
const https = require("https");

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ENDPOINT = "/api/health";

// Determine URL: prioritize BACKEND_URL (for production), fallback to local config
let FULL_URL;
if (process.env.BACKEND_URL) {
  FULL_URL = `${process.env.BACKEND_URL.replace(/\/+$/, "")}${ENDPOINT}`;
} else if (process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_URL) {
  FULL_URL = `${(process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_URL).replace(/\/+$/, "")}${ENDPOINT}`;
} else {
  const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;
  const HOST = process.env.BACKEND_HOST || "localhost";
  const protocol = process.env.BACKEND_PROTOCOL || "http";
  FULL_URL = `${protocol}://${HOST}:${PORT}${ENDPOINT}`;
}

const ping = () => {
  const start = Date.now();
  const isHttps = FULL_URL.startsWith("https");
  const client = isHttps ? https : http;

  client
    .get(FULL_URL, { timeout: 10000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const ms = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? "FAIL" : "OK";
        console.log(
          `[${new Date().toISOString()}] keep-alive ping ${statusColor}: ${FULL_URL} → ${res.statusCode} (${ms}ms)`,
        );
      });
    })
    .on("error", (err) => {
      console.error(
        `[${new Date().toISOString()}] keep-alive ping FAILED: ${FULL_URL} - ${err.message}`,
      );
    });
};

console.log(`Keep-alive service started: pinging ${FULL_URL} every ${INTERVAL_MS / 1000}s`);
ping();
setInterval(ping, INTERVAL_MS);

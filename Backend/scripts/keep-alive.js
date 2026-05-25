const http = require("http");

const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;
const HOST = process.env.BACKEND_HOST || "http://localhost";
const INTERVAL_MS = 5 * 60 * 1000;
const ENDPOINT = "/api/health";

const ping = () => {
  const url = new URL(ENDPOINT, `${HOST}:${PORT}`);
  const start = Date.now();

  http
    .get(url.toString(), (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const ms = Date.now() - start;
        console.log(
          `[${new Date().toISOString()}] ping ${url} → ${res.statusCode} (${ms}ms)`,
        );
      });
    })
    .on("error", (err) => {
      console.error(
        `[${new Date().toISOString()}] ping ${url} failed: ${err.message}`,
      );
    });
};

console.log(`Keep-alive pinging ${HOST}:${PORT}${ENDPOINT} every ${INTERVAL_MS / 1000}s`);
ping();
setInterval(ping, INTERVAL_MS);

const { spawn } = require("child_process");

const keepAlive = spawn(process.execPath, ["scripts/keep-alive.js"], {
  stdio: "inherit",
  shell: false,
});

const devCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const dev = spawn(devCommand, ["run", "dev"], {
  stdio: "inherit",
  shell: false,
});

const shutdown = (signal) => {
  if (!keepAlive.killed) {
    keepAlive.kill(signal);
  }

  if (!dev.killed) {
    dev.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

keepAlive.on("exit", (code, signal) => {
  if (signal || code !== 0) {
    shutdown(signal || "SIGTERM");
    process.exit(code ?? 1);
  }
});

dev.on("exit", (code, signal) => {
  if (signal || code !== 0) {
    shutdown(signal || "SIGTERM");
    process.exit(code ?? 1);
  }
});
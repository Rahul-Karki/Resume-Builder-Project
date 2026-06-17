import puppeteer from "puppeteer";
import { env } from "./env";
import fs from "fs";
import { execSync } from "child_process";

const isBinaryExecutable = (filePath: string): boolean => {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (process.platform !== "win32") {
      return !!(stat.mode & 0o111);
    }
    return true;
  } catch {
    return false;
  }
};

const which = (binary: string): string | null => {
  try {
    const cmd = process.platform === "win32" ? `where ${binary}` : `which ${binary}`;
    const out = execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return out.split("\n")[0] || null;
  } catch {
    return null;
  }
};

const resolveExecutablePath = (): string | undefined => {
  const configured = String(env.PUPPETEER_EXECUTABLE_PATH ?? "").trim();

  if (configured) {
    if (isBinaryExecutable(configured)) {
      return configured;
    }
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  try {
    const bundled = puppeteer.executablePath();
    if (bundled && isBinaryExecutable(bundled)) {
      return bundled;
    }
  } catch {
    // ignored - fall through to system chrome detection
  }

  const candidates =
    process.platform === "win32"
      ? ["chrome", "chromium", "google-chrome", "msedge"]
      : ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"];
  for (const name of candidates) {
    const resolved = which(name);
    if (resolved && isBinaryExecutable(resolved)) {
      return resolved;
    }
  }

  return undefined;
};

export const createPuppeteerLaunchOptions = () => {
  const executablePath = resolveExecutablePath();

  return {
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--js-flags=--max-old-space-size=512",
    ],
  };
};

export const launchPuppeteerBrowser = async () => {
  const options = createPuppeteerLaunchOptions();
  return puppeteer.launch(options);
};

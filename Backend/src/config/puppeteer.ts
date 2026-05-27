import puppeteer from "puppeteer";
import { env } from "./env";
import fs from "fs";

const isBinaryExecutable = (filePath: string): boolean => {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    // On Unix, check executable bit
    if (process.platform !== "win32") {
      // eslint-disable-next-line no-bitwise
      return !!(stat.mode & 0o111);
    }
    return true;
  } catch {
    return false;
  }
};

export const createPuppeteerLaunchOptions = () => {
  const configured = String(env.PUPPETEER_EXECUTABLE_PATH ?? "").trim();
  let executablePath: string | undefined = undefined;

  if (configured) {
    if (isBinaryExecutable(configured)) {
      executablePath = configured;
    } else {
      console.warn(
        `PUPPETEER_EXECUTABLE_PATH="${configured}" is not a valid executable; falling back to managed Chromium`
      );
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  }

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
  const primaryOptions = createPuppeteerLaunchOptions();

  try {
    return await puppeteer.launch(primaryOptions);
  } catch (error) {
    // Always fall back to Puppeteer's managed binary — the configured path may be
    // missing, invalid, or not executable even if the file exists (e.g. Render stub).
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    return puppeteer.launch({
      ...primaryOptions,
      executablePath: undefined,
    });
  }
};

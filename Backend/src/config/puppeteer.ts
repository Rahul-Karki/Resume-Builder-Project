import puppeteer from "puppeteer";
import { env } from "./env";
import fs from "fs";

export const createPuppeteerLaunchOptions = () => {
  const configured = String(env.PUPPETEER_EXECUTABLE_PATH ?? "").trim();
  let executablePath: string | undefined = undefined;

  if (configured) {
    try {
      if (fs.existsSync(configured)) {
        executablePath = configured;
      } else {
        // configured path doesn't exist; ignore and let Puppeteer use its managed binary
        // (do not throw here to avoid startup failure)
        // eslint-disable-next-line no-console
        console.warn(`Configured PUPPETEER_EXECUTABLE_PATH not found: ${configured}; falling back to bundled Chromium`);
        delete process.env.PUPPETEER_EXECUTABLE_PATH;
      }
    } catch (err) {
      // If checking the path fails for any reason, fall back gracefully
      // eslint-disable-next-line no-console
      console.warn(`Failed to validate PUPPETEER_EXECUTABLE_PATH: ${configured}; falling back to bundled Chromium`, err);
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  }

  return {
    headless: true,
    executablePath: executablePath || undefined,
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
    // Some deployments keep an outdated executable path env; retry with Puppeteer's managed binary.
    if (!env.PUPPETEER_EXECUTABLE_PATH) {
      throw error;
    }

    return puppeteer.launch({
      ...primaryOptions,
      executablePath: undefined,
    });
  }
};
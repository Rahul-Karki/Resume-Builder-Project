import puppeteer from "puppeteer";
import { env } from "./env";

export const createPuppeteerLaunchOptions = () => ({
  headless: true,
  executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--js-flags=--max-old-space-size=512",
  ],
});

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
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

export const launchPuppeteerBrowser = async () => puppeteer.launch(createPuppeteerLaunchOptions());
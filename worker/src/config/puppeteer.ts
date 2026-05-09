import puppeteer from "puppeteer";
import { env } from "./env";

export const createPuppeteerLaunchOptions = () => ({
  headless: true,
  executablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

export const launchPuppeteerBrowser = async () => puppeteer.launch(createPuppeteerLaunchOptions());

import pino from "pino";
import { env } from "./config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: env.SERVICE_NAME,
    version: env.SERVICE_VERSION,
    env: env.NODE_ENV,
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return {
        level: label,
        severity: label.toUpperCase(),
      };
    },
  },
});

import pino from "pino";
import { env } from "./config/env";

const redactCommandArgs = (record: Record<string, unknown>) => {
  const command = record.command;

  if (command && typeof command === "object") {
    const commandRecord = { ...(command as Record<string, unknown>) };
    if (Array.isArray(commandRecord.args)) {
      commandRecord.args = `[redacted:${commandRecord.args.length}]`;
    }
    record.command = commandRecord;
  }

  return record;
};

const sanitizeErrorForLogs = (value: unknown) => {
  if (value instanceof Error) {
    const errorRecord: Record<string, unknown> = {
      type: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as unknown as Record<string, unknown>),
    };
    return redactCommandArgs(errorRecord);
  }

  if (value && typeof value === "object") {
    return redactCommandArgs({ ...(value as Record<string, unknown>) });
  }

  return value;
};

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
  serializers: {
    error: sanitizeErrorForLogs,
    err: sanitizeErrorForLogs,
  },
});

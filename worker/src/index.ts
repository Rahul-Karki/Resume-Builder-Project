import connectDB from "./config/db";
import { logger } from "./observability";
import { startAtsWorker } from "./workers/ats.worker";
import { startResumeWorker } from "./workers/resume.worker";

const shutdownHandlers: Array<(signal: string) => Promise<void>> = [];

const start = async () => {
  await connectDB();

  const resumeHandle = await startResumeWorker();
  shutdownHandlers.push(resumeHandle.shutdown);

  const atsHandle = await startAtsWorker();
  shutdownHandlers.push(atsHandle.shutdown);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down worker service");

    for (const handler of shutdownHandlers) {
      await handler(signal).catch((error) => {
        logger.warn({ error, signal }, "Worker shutdown handler failed");
      });
    }

    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

void start().catch((error) => {
  logger.error({ error }, "Worker service failed to start");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Worker unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Worker uncaught exception");
  process.exit(1);
});

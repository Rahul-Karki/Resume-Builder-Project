import { env } from "../config/env";
import { getResumeQueueRuntimeInfo, resumeDownloadQueueName } from "../queues/resume.queue";
import { processResumeDownloadJob } from "../processors/resume.processor";
import { startManagedWorker } from "./workerRuntime";

export const startResumeWorker = async () => startManagedWorker({
  workerLabel: "resume-download",
  queueName: resumeDownloadQueueName,
  queuePrefix: env.RESUME_DOWNLOAD_QUEUE_PREFIX,
  concurrency: env.RESUME_DOWNLOAD_WORKER_CONCURRENCY,
  processJob: processResumeDownloadJob,
}).then((handle) => {
  void getResumeQueueRuntimeInfo();
  return handle;
});

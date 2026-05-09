import { env } from "../config/env";
import { atsAnalysisQueueName, getAtsQueueRuntimeInfo } from "../queues/ats.queue";
import { processAtsAnalysisJob } from "../processors/ats.processor";
import { startManagedWorker } from "./workerRuntime";

export const startAtsWorker = async () => startManagedWorker({
  workerLabel: "ats-analysis",
  queueName: atsAnalysisQueueName,
  concurrency: env.ATS_ANALYSIS_WORKER_CONCURRENCY,
  processJob: processAtsAnalysisJob,
}).then((handle) => {
  void getAtsQueueRuntimeInfo();
  return handle;
});

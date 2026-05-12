export const trackWorkerCrash = (_queue: string, _reason: "uncaught_exception" | "unhandled_rejection") => {
  return;
};

export const updateQueueDepth = (_queue: string, _depth: number) => {
  return;
};

export const updateStalledJobs = (_queue: string, _count: number) => {
  return;
};

export const trackQueueJob = (
  _queue: string,
  _jobType: string,
  _status: "success" | "failed" | "retried",
  _durationMs: number,
  _retries: number
) => {
  return;
};

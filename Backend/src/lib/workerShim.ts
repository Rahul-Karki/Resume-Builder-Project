import path from "path";

// Thin runtime shim that loads worker processors from the compiled worker output.
// This avoids compile-time type dependencies on the worker dist files.
const resolveWorkerProcessorPath = (relativePath: string) => path.resolve(process.cwd(), relativePath);

export const loadResumeProcessor = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(resolveWorkerProcessorPath("../worker/dist/worker/src/processors/resume.processor"));
};

export const loadAtsProcessor = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(resolveWorkerProcessorPath("../worker/dist/worker/src/processors/ats.processor"));
};

export const processResumeDownloadJob = async (job: any) => {
  const mod = loadResumeProcessor();
  return mod.processResumeDownloadJob(job);
};

export const processAtsAnalysisJob = async (job: any) => {
  const mod = loadAtsProcessor();
  return mod.processAtsAnalysisJob(job);
};

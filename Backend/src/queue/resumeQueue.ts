export const createResumeDownloadJobId = (data: Record<string, unknown>) => `resume-download-${String(data.resumeId ?? cryptoRandom())}`;

const cryptoRandom = () => Math.random().toString(16).slice(2);

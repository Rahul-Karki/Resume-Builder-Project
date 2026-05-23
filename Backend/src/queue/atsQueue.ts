export const createAtsAnalysisJobId = (data: Record<string, unknown>) => `ats-${String(data.analysisId ?? cryptoRandom())}`;

const cryptoRandom = () => Math.random().toString(16).slice(2);

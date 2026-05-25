import { api } from "@/services/api";

type DownloadResponse = {
  jobId: string;
  statusUrl: string;
  downloadUrl: string;
  status: string;
  resultUrl?: string | null;
};

type JobStatusResponse = {
  status: string;
  lastError?: string;
  resultUrl?: string;
};

export async function requestResumeDownload(payload: { resumeId?: string; resume?: unknown; preset?: string }) {
  const resp = await api.post("/resumes/download-resume", payload, { timeout: 120000 });
  return resp.data as DownloadResponse;
}

export async function waitForJobCompletion(jobId: string, pollInterval = 1200, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await api.get(`/resumes/job-status/${encodeURIComponent(jobId)}`);
    const json = resp.data as JobStatusResponse;
    if (json.status === 'completed') return json;
    if (json.status === 'failed') throw new Error(json.lastError || 'PDF generation failed');
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error('PDF generation timed out');
}

export async function downloadResult(jobId: string) {
  const url = `/api/resumes/download-result/${encodeURIComponent(jobId)}`;
  window.open(url, '_blank');
}

export function streamJobEvents(jobId: string, onEvent: (event: { type: string; data: any }) => void) {
  const url = `/api/resumes/job-events/${encodeURIComponent(jobId)}`;
  const es = new EventSource(url);
  es.addEventListener('init', (ev: MessageEvent) => onEvent({ type: 'init', data: JSON.parse(String((ev as any).data)) }));
  es.addEventListener('update', (ev: MessageEvent) => onEvent({ type: 'update', data: JSON.parse(String((ev as any).data)) }));
  es.onerror = (err) => onEvent({ type: 'error', data: err });
  return () => { try { es.close(); } catch { /* ignore */ } };
}

export async function cancelJob(jobId: string) {
  const resp = await api.post(`/resumes/job-cancel/${encodeURIComponent(jobId)}`);
  return resp.data;
}

export default async function downloadResumeAndOpen(payload: { resumeId?: string; resume?: unknown; preset?: string }) {
  const resp = await requestResumeDownload(payload);
  const jobId = resp.jobId;
  if (resp.status === 'completed' && resp.resultUrl) {
    window.open(resp.resultUrl, '_blank');
    return { jobId, status: 'completed' };
  }

  let resolved = false;
  const finish = (status: string) => {
    resolved = true;
    if (status === 'completed') downloadResult(jobId);
  };

  const unsub = streamJobEvents(jobId, (ev) => {
    if (ev.type === 'update' && ev.data?.status) {
      if (ev.data.status === 'completed') finish('completed');
      if (ev.data.status === 'failed') finish('failed');
    }
  });

  try {
    await waitForJobCompletion(jobId, 2000, 120000);
    if (!resolved) finish('completed');
  } finally {
    try { unsub(); } catch { /* ignore */ }
  }

  return { jobId, status: 'completed' };
}

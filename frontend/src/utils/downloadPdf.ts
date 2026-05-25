type DownloadResponse = {
  jobId: string;
  statusUrl: string;
  downloadUrl: string;
  status: string;
  resultUrl?: string | null;
};

export async function requestResumeDownload(payload: { resumeId?: string; resume?: unknown; preset?: string }) {
  const resp = await fetch('/api/resumes/download-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Download request failed: ${resp.status}`);
  return (await resp.json()) as DownloadResponse;
}

export async function waitForJobCompletion(jobId: string, pollInterval = 1200, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await fetch(`/api/resumes/job-status/${encodeURIComponent(jobId)}`);
    if (!resp.ok) throw new Error('Failed to fetch job status');
    const json = await resp.json();
    if (json.status === 'completed') return json;
    if (json.status === 'failed') throw new Error(json.lastError || 'PDF generation failed');
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error('PDF generation timed out');
}

export async function downloadResult(jobId: string) {
  // Open the inline PDF result in a new tab
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
  const resp = await fetch(`/api/resumes/job-cancel/${encodeURIComponent(jobId)}`, { method: 'POST' });
  if (!resp.ok) throw new Error('Failed to cancel job');
  return await resp.json();
}

export default async function downloadResumeAndOpen(payload: { resumeId?: string; resume?: unknown; preset?: string }) {
  const resp = await requestResumeDownload(payload);
  const jobId = resp.jobId;
  if (resp.status === 'completed' && resp.resultUrl) {
    window.open(resp.resultUrl, '_blank');
    return { jobId, status: 'completed' };
  }

  // Prefer live SSE updates where available, fallback to polling timeout
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

  // Safety fallback: poll until timeout if SSE not informing
  try {
    await waitForJobCompletion(jobId, 2000, 120000);
    if (!resolved) finish('completed');
  } finally {
    try { unsub(); } catch { /* ignore */ }
  }

  return { jobId, status: 'completed' };
}

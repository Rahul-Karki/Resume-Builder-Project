import { performanceMonitor } from "@/utils/performance";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";
const REPORT_INTERVAL_MS = 30_000;

let intervalId: ReturnType<typeof setInterval> | null = null;

function getMetricsPayload(): Record<string, any>[] {
  const all = performanceMonitor.getMetrics();
  if (!all.length) return [];
  performanceMonitor.clearMetrics();
  return all.map((m) => ({
    name: m.name,
    value: m.value,
    unit: m.unit,
    context: m.context || {},
  }));
}

async function reportBatch(): Promise<void> {
  const metrics = getMetricsPayload();
  if (!metrics.length) return;

  try {
    await fetch(`${API_BASE}/client-metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics }),
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

function reportOnUnload(): void {
  const metrics = getMetricsPayload();
  if (!metrics.length) return;

  try {
    const blob = new Blob([JSON.stringify({ metrics })], { type: "application/json" });
    navigator.sendBeacon(`${API_BASE}/client-metrics`, blob);
  } catch {
    // best-effort
  }
}

export function initMetricsReporter(): () => void {
  if (intervalId) return () => {};

  intervalId = setInterval(reportBatch, REPORT_INTERVAL_MS);
  window.addEventListener("beforeunload", reportOnUnload);

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    window.removeEventListener("beforeunload", reportOnUnload);
  };
}

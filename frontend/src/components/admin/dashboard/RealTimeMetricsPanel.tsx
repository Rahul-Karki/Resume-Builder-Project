import { MetricsSnapshot } from "@/types/admin.types";
import { MetricCard, MetricRow } from "./MetricCard";
import { DashboardSection, EmptyState } from "./DashboardSection";

interface Props {
  metrics?: MetricsSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

function formatMs(ms: number): string {
  return ms < 1 ? "<1ms" : `${Math.round(ms)}ms`;
}

function formatPercent(pct: number): string {
  return `${Math.round(pct * 10) / 10}%`;
}

export function RealTimeMetricsPanel({ metrics, isLoading, isError, onRetry }: Props) {
  return (
    <DashboardSection
      title="Real-Time Metrics"
      subtitle="System performance and throughput"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      isEmpty={!metrics || Object.values(metrics).every(v => v === 0)}
      emptyState={
        <EmptyState
          title="No metrics available"
          subtitle="Metrics will appear once the system starts processing requests"
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
          <QuickStat label="Req/min" value={metrics?.requestsPerMinute ?? 0} unit="" color="#818CF8" />
          <QuickStat label="Avg Latency" value={metrics?.avgLatencyMs ?? 0} unit="ms" color="#C8F55A" />
          <QuickStat label="P95" value={metrics?.p95LatencyMs ?? 0} unit="ms" color="#F59E0B" />
          <QuickStat label="P99" value={metrics?.p99LatencyMs ?? 0} unit="ms" color="#F87171" />
          <QuickStat label="Error Rate" value={metrics?.errorRate ?? 0} unit="%" color={metricErrorColor(metrics?.errorRate)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
          <div>
            <MetricRow label="Active Connections" value={metrics?.activeConnections ?? 0} accent="#818CF8" />
            <MetricRow label="Memory Usage" value={metrics ? `${metrics.memoryUsageMb} MB` : "—"} accent="#C8F55A" />
            <MetricRow label="CPU Usage" value={metrics ? formatPercent(metrics.cpuUsagePercent) : "—"} accent="#F59E0B" />
          </div>
          <div>
            <MetricRow label="DB Query Time" value={metrics ? formatMs(metrics.dbQueryTimeMs) : "—"} accent="#818CF8" />
            <MetricRow label="Cache Hit Ratio" value={metrics ? formatPercent(metrics.cacheHitRatio) : "—"} accent="#4ADE80" />
            <MetricRow label="AI Requests Today" value="—" accent="#C8F55A" />
          </div>
        </div>
      </div>
    </DashboardSection>
  );
}

function QuickStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div style={{
      background: "#0A0A0A", border: "1px solid #27272a", borderRadius: 10,
      padding: "12px 14px", textAlign: "center", fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fafafa", fontFamily: "'Fraunces', serif", letterSpacing: "-1px" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span style={{ fontSize: 12, fontWeight: 400, color: "#71717a", marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ marginTop: 8, height: 2, background: "#27272a", borderRadius: 1 }}>
        <div style={{ height: 2, width: `${Math.min(100, value)}%`, background: color, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function metricErrorColor(rate?: number): string {
  if (!rate) return "#4ADE80";
  if (rate < 1) return "#4ADE80";
  if (rate < 5) return "#F59E0B";
  return "#F87171";
}

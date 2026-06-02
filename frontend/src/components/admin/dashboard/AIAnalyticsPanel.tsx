import { AIMetricsSnapshot } from "@/types/admin.types";
import { MetricRow } from "./MetricCard";
import { DashboardSection, EmptyState } from "./DashboardSection";

interface Props {
  aiMetrics?: AIMetricsSnapshot | null;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function AIAnalyticsPanel({ aiMetrics, isLoading, isError, onRetry }: Props) {
  const hasData = aiMetrics && aiMetrics.totalRequests > 0;

  return (
    <DashboardSection
      title="AI Analytics"
      subtitle="AI generation performance and cost tracking"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      isEmpty={!hasData}
      emptyState={
        <EmptyState
          icon="⚡"
          title="No AI activity yet"
          subtitle="AI metrics will appear once users start generating or rewriting content"
        />
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div>
          <MetricRow label="Total AI Requests" value={aiMetrics?.totalRequests ?? 0} accent="#818CF8" />
          <MetricRow label="Success Rate" value={aiMetrics ? `${aiMetrics.successRate}%` : "—"} accent="#4ADE80" subtitle={aiMetrics ? `Average latency: —` : undefined} />
          <MetricRow label="Tokens Used" value={aiMetrics?.totalTokens?.toLocaleString() ?? "—"} accent="#C8F55A" subtitle={aiMetrics ? `Est. cost: ~$${aiMetrics.estimatedCost.toFixed(2)}` : undefined} />
        </div>
        <div>
          <MetricRow label="Fallback Rate" value={aiMetrics ? `${aiMetrics.fallbackRate}%` : "—"} accent="#F59E0B" />
          <MetricRow label="AI Failure Count" value={getTotalFailures(aiMetrics)} accent="#F87171" />
          <MetricRow label="Hallucinations" value="—" accent="#F59E0B" />
        </div>
      </div>
      {aiMetrics?.recentErrors && aiMetrics.recentErrors.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid #27272a", paddingTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Provider Errors</div>
          {aiMetrics.recentErrors.slice(0, 4).map((err, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, color: "#a1a1aa" }}>
              <span>{err.provider} — {err.errorCategory}</span>
              <span style={{ color: "#F87171", fontWeight: 700 }}>{err.count}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}

function getTotalFailures(metrics?: AIMetricsSnapshot | null): number | string {
  if (!metrics?.failuresByType) return "—";
  const vals = Object.values(metrics.failuresByType);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : "—";
}

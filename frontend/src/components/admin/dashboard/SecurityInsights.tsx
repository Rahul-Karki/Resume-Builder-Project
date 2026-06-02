import { ErrorMetrics } from "@/types/admin.types";
import { MetricRow } from "./MetricCard";
import { DashboardSection, EmptyState } from "./DashboardSection";

interface Props {
  errorMetrics?: ErrorMetrics | null;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function SecurityInsights({ errorMetrics, isLoading, isError, onRetry }: Props) {
  const hasData = errorMetrics && (errorMetrics.totalErrors > 0 || errorMetrics.authFailures > 0);

  return (
    <DashboardSection
      title="Security & Reliability"
      subtitle="Auth failures, errors, and rate limiting"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      isEmpty={!hasData}
      emptyState={
        <EmptyState
          icon="⚔"
          title="No security events"
          subtitle="Security metrics will appear as events are detected"
        />
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div>
          <MetricRow label="Total API Errors" value={errorMetrics?.totalErrors ?? "—"} accent="#F87171" />
          <MetricRow label="Auth Failures" value={errorMetrics?.authFailures ?? "—"} accent="#F59E0B" subtitle="Failed login + token refresh" />
        </div>
        <div>
          <MetricRow label="Rate Limits Hit" value={errorMetrics?.rateLimitHits ?? "—"} accent="#F59E0B" />
          <MetricRow label="Suspicious Activity" value="—" accent="#F87171" />
        </div>
      </div>
      {errorMetrics?.errorsByType && Object.keys(errorMetrics.errorsByType).length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid #27272a", paddingTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Errors by Route</div>
          {Object.entries(errorMetrics.errorsByType).slice(0, 5).map(([route, count]) => (
            <div key={route} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, color: "#a1a1aa" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10 }}>{route}</span>
              <span style={{ color: "#F87171", fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}

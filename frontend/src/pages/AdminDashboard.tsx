import { useState, useMemo, useCallback } from "react";
import { useDashboardStats } from "@/hooks/useDashboardQuery";
import { useObservabilityOverview } from "@/hooks/useObservability";
import { SystemOverviewCards } from "@/components/admin/dashboard/SystemOverviewCards";
import { RealTimeMetricsPanel } from "@/components/admin/dashboard/RealTimeMetricsPanel";
import { AIAnalyticsPanel } from "@/components/admin/dashboard/AIAnalyticsPanel";
import { SystemHealthGrid } from "@/components/admin/dashboard/SystemHealthGrid";
import { SecurityInsights } from "@/components/admin/dashboard/SecurityInsights";
import { UsageHighlights } from "@/components/admin/dashboard/UsageHighlights";
import { ActivityTimeline } from "@/components/admin/dashboard/ActivityTimeline";
import { BarChart, AnalyticsRow } from "@/components/admin/AnalyticsChart";
import { useViewport } from "@/hooks/useViewport";
import { Skeleton } from "@/components/Skeleton";
import { BACKEND_WAKING_UP_MESSAGE, isBackendWakingUpError } from "@/utils/backendStatus";

function PeriodBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20, border: "1px solid",
      borderColor: active ? "#C8F55A" : "#3f3f46",
      background: active ? "rgba(200,245,90,0.1)" : "transparent",
      color: active ? "#C8F55A" : "#a1a1aa",
      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      padding: "14px 18px", marginBottom: 20,
      background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
      borderRadius: 10, fontSize: 13, color: "#fca5a5",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          flexShrink: 0, padding: "6px 14px", borderRadius: 7,
          border: "1px solid rgba(220,38,38,0.4)", background: "transparent",
          color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>
          Retry
        </button>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [period, setPeriod] = useState<7 | 30>(30);
  const [selected, setSelected] = useState<string | null>(null);
  const isMobile = useViewport(1024);

  const { data: dashboardData, isLoading: dbLoading, isError: dbError, error, refetch } = useDashboardStats(period);
  const { data: obsData, isLoading: obsLoading, isError: obsError, refetch: obsRefetch } = useObservabilityOverview();

  const stats = dashboardData?.stats ?? null;
  const analytics = dashboardData?.analytics ?? [];
  const metrics = obsData?.metrics ?? null;
  const aiMetrics = obsData?.aiMetrics ?? null;
  const systemHealth = obsData?.systemHealth ?? null;
  const errorMetrics = obsData?.errorMetrics ?? null;

  const publishedAnalytics = useMemo(
    () => analytics.filter((item) => item.status === "published"),
    [analytics],
  );

  const selectedAnalytics = useMemo(
    () => analytics.find((item) => item.templateId === selected) ?? publishedAnalytics[0] ?? analytics[0] ?? null,
    [analytics, publishedAnalytics, selected],
  );

  const totalUsageSeries = useMemo(() => {
    const dateMap: Record<string, { date: string; count: number; resumesCreated: number; resumesEdited: number }> = {};
    analytics.forEach((item) => {
      item.daily.forEach((day) => {
        if (!dateMap[day.date]) {
          dateMap[day.date] = { date: day.date, count: 0, resumesCreated: 0, resumesEdited: 0 };
        }
        dateMap[day.date].count += day.count;
        dateMap[day.date].resumesCreated += day.resumesCreated;
        dateMap[day.date].resumesEdited += day.resumesEdited;
      });
    });
    return Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-period);
  }, [analytics, period]);

  const handleRetry = useCallback(() => { refetch(); obsRefetch(); }, [refetch, obsRefetch]);

  const PADDING = isMobile ? "16px 10px" : "24px 28px";

  return (
    <div style={{ padding: PADDING, fontFamily: "'Outfit', sans-serif", maxWidth: 1440, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 22, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 0,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 300,
            color: "#F0EFE8", letterSpacing: "-0.5px", margin: 0, marginBottom: 4,
          }}>
            Operations Center
          </h1>
          <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0 }}>
            System observability, analytics, and infrastructure monitoring
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <PeriodBtn label="7 days"  active={period === 7}  onClick={() => setPeriod(7)}  />
          <PeriodBtn label="30 days" active={period === 30} onClick={() => setPeriod(30)} />
        </div>
      </div>

      {/* Error banner */}
      {(dbError || obsError) && (
        <ErrorBanner
          message={error && isBackendWakingUpError(error) ? BACKEND_WAKING_UP_MESSAGE : "Some data failed to load"}
          onRetry={handleRetry}
        />
      )}

      {/* Section 1: System Overview */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 3, height: 14, background: "#C8F55A", borderRadius: 2 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px" }}>System Overview</span>
        </div>
        <SystemOverviewCards stats={stats} metrics={metrics} isLoading={dbLoading} />
      </div>

      {/* Section 2: Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Total usage bar chart */}
        <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "18px 20px 14px" }}>
          {dbLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton className="h-3 w-36 rounded-md" />
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 180, paddingTop: 30 }}>
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${20 + Math.random() * 60}%` }} />
                ))}
              </div>
            </div>
          ) : (
            <BarChart
              data={totalUsageSeries}
              color="#C8F55A"
              label={`Total Uses — Last ${period} Days`}
              height={180}
            />
          )}
        </div>

        {/* Selected template chart */}
        <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "18px 20px 14px" }}>
          {dbLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Skeleton className="h-3 w-36 rounded-md" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 148 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${20 + Math.random() * 60}%` }} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {publishedAnalytics.length === 0 ? (
                  <span style={{ fontSize: 10, color: "#71717a", padding: "3px 0" }}>No published templates</span>
                ) : (
                  publishedAnalytics.slice(0, 6).map(a => (
                    <button key={a.templateId}
                      onClick={() => setSelected(a.templateId)}
                      style={{
                        padding: "3px 10px", borderRadius: 20, border: "1px solid",
                        borderColor: (selected ?? publishedAnalytics[0]?.templateId) === a.templateId ? "#C8F55A" : "#1E1E1E",
                        background: (selected ?? publishedAnalytics[0]?.templateId) === a.templateId ? "rgba(200,245,90,0.1)" : "transparent",
                        color: (selected ?? publishedAnalytics[0]?.templateId) === a.templateId ? "#C8F55A" : "#444",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.12s",
                      }}>
                      {a.name}
                    </button>
                  ))
                )}
              </div>
              {selectedAnalytics ? (
                <BarChart
                  data={selectedAnalytics.daily.slice(-period)}
                  color="#818CF8"
                  label={`${selectedAnalytics.name} — Last ${period} Days`}
                  height={148}
                />
              ) : (
                <div style={{ height: 148, display: "flex", alignItems: "center", justifyContent: "center", color: "#71717a", fontSize: 12 }}>
                  No data available
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 3: Observability & AI metrics */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <RealTimeMetricsPanel
          metrics={metrics}
          isLoading={obsLoading}
          isError={obsError}
          onRetry={obsRefetch}
        />
        <AIAnalyticsPanel
          aiMetrics={aiMetrics}
          isLoading={obsLoading}
          isError={obsError}
          onRetry={obsRefetch}
        />
      </div>

      {/* Section 4: Usage highlights */}
      <div style={{ marginBottom: 20 }}>
        <UsageHighlights stats={stats} isLoading={dbLoading} />
      </div>

      {/* Section 5: System health & security */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <SystemHealthGrid
          health={systemHealth}
          isLoading={obsLoading}
          isError={obsError}
          onRetry={obsRefetch}
        />
        <SecurityInsights
          errorMetrics={errorMetrics}
          isLoading={obsLoading}
          isError={obsError}
          onRetry={obsRefetch}
        />
      </div>

      {/* Section 6: Activity */}
      <div style={{ marginBottom: 20 }}>
        <ActivityTimeline />
      </div>

      {/* Section 7: Analytics Table */}
      <div style={{
        background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px 10px", borderBottom: "1px solid #1A1A1A",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fafafa", fontFamily: "'Fraunces', serif" }}>Template Analytics</div>
            <div style={{ fontSize: 10.5, color: "#71717a", marginTop: 2 }}>Per-template usage and performance</div>
          </div>
        </div>
        {dbLoading ? (
          <div style={{ padding: "6px 16px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: isMobile ? "32px 1fr 84px 80px 68px" : "32px 1fr 80px 80px 80px 80px",
                gap: 16, padding: "12px 0", borderBottom: i < 4 ? "1px solid #27272a" : "none",
              }}>
                {Array.from({ length: isMobile ? 5 : 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-3 rounded-md" style={{
                    width: j === 0 ? "60%" : j === 1 ? "80%" : "70%",
                    marginLeft: j === 0 ? "auto" : 0, marginRight: j === 0 ? "auto" : 0,
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : analytics.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 12, color: "#a1a1aa" }}>◈</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>No analytics data yet</div>
            <div style={{ fontSize: 12, color: "#71717a" }}>
              Data will appear once templates start being used
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "32px 1fr 84px 80px 68px" : "32px 1fr 80px 80px 80px 80px",
              gap: 16, padding: "10px 16px",
              background: "#0A0A0A",
              borderBottom: "1px solid #1A1A1A",
              position: "sticky", top: 0, zIndex: 1,
              minWidth: isMobile ? "auto" : 560,
            }}>
              {(isMobile ? ["#", "Template", "This Week", "30d", "Trend"] : ["#", "Template", "This Week", "This Month", "Trend", "14-day"]).map(h => (
                <div key={h} style={{
                  fontSize: 9.5, fontWeight: 700, color: "#a1a1aa",
                  textTransform: "uppercase", letterSpacing: "0.8px",
                  textAlign: h === "#" ? "center" : h === "This Week" || h === "This Month" || h === "Trend" || h === "14-day" ? "right" : "left",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {h}
                </div>
              ))}
            </div>
            <div style={{ minWidth: isMobile ? "auto" : 560 }}>
              {analytics.map((a, i) => (
                <AnalyticsRow key={a.templateId} analytics={a} rank={i + 1} compact={isMobile} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

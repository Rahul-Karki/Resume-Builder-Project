import { useState, useMemo, useCallback } from "react";
import { useDashboardStats } from "@/hooks/useDashboardQuery";
import { StatsBar, StatsBarSkeleton } from "@/components/admin/StatusBar";
import { BarChart, AnalyticsRow } from "@/components/admin/AnalyticsChart";
import { useViewport } from "@/hooks/useViewport";
import { Skeleton, SkeletonChart } from "@/components/Skeleton";

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

  const { data, isLoading, isError, error, refetch } = useDashboardStats(period);
  const stats = data?.stats ?? null;
  const analytics = data?.analytics ?? [];

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

  const handleRetry = useCallback(() => { refetch(); }, [refetch]);

  const PADDING = isMobile ? "20px 12px" : "28px 32px";

  return (
    <div style={{ padding: PADDING, fontFamily: "'Outfit', sans-serif", maxWidth: 1400, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 24, flexDirection: isMobile ? "column" : "row", gap: isMobile ? 10 : 0,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 300,
            color: "#F0EFE8", letterSpacing: "-0.5px", margin: 0, marginBottom: 4,
          }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "#a1a1aa", margin: 0 }}>
            Template usage analytics and performance
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <PeriodBtn label="Last 7 days"  active={period === 7}  onClick={() => setPeriod(7)}  />
          <PeriodBtn label="Last 30 days" active={period === 30} onClick={() => setPeriod(30)} />
        </div>
      </div>

      {/* Error banner - shown on top while keeping data visible if cached */}
      {isError && (
        <ErrorBanner
          message={error instanceof Error ? error.message : "Failed to load analytics"}
          onRetry={handleRetry}
        />
      )}

      {/* Stats row */}
      {isLoading ? (
        <div style={{ marginBottom: 28 }}>
          <StatsBarSkeleton />
        </div>
      ) : stats ? (
        <div style={{ marginBottom: 28, animation: "fadeSlideUp 0.3s ease" }}>
          <StatsBar stats={stats} />
        </div>
      ) : null}

      {/* Charts section */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Left: Total usage bar chart */}
        <div style={{
          background: "#111", border: "1px solid #1A1A1A", borderRadius: 14,
          padding: "20px 20px 16px", animation: "fadeSlideUp 0.35s ease",
        }}>
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <BarChart
              data={totalUsageSeries}
              color="#C8F55A"
              label={`Total Uses — Last ${period} Days`}
              height={180}
            />
          )}
        </div>

        {/* Right: Selected template chart */}
        <div style={{
          background: "#111", border: "1px solid #1A1A1A", borderRadius: 14,
          padding: "20px 20px 16px", animation: "fadeSlideUp 0.4s ease",
        }}>
          {isLoading ? (
            <SkeletonChart />
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

      {/* Most / Least used highlight cards */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "18px 20px",
            }}>
              <Skeleton className="h-3 w-32 rounded-md" style={{ marginBottom: 12 }} />
              <Skeleton className="h-5 w-40 rounded-md" style={{ marginBottom: 8 }} />
              <Skeleton className="h-3 w-52 rounded-md" />
            </div>
          ))}
        </div>
      ) : stats?.mostUsed || stats?.leastUsed ? (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Most Used This Week",  data: stats.mostUsed,  accent: "#4ADE80" },
            { label: "Least Used This Week", data: stats.leastUsed, accent: "#F87171" },
          ].filter(item => item.data).map(({ label, data, accent }) => data && (
            <div key={label} style={{
              background: "#111", border: "1px solid #1A1A1A", borderRadius: 14,
              padding: "18px 20px", display: "flex", gap: 16, alignItems: "center",
              animation: "fadeSlideUp 0.35s ease",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", marginBottom: 4 }}>{data.name}</div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                  <span style={{ color: accent, fontWeight: 700 }}>{data.weeklyUses.toLocaleString()}</span> uses this week ·{" "}
                  <span style={{ color: data.trend === "up" ? "#4ADE80" : data.trend === "down" ? "#F87171" : "#555" }}>
                    {data.trend === "up" ? "↑" : data.trend === "down" ? "↓" : "→"} {data.trend}
                  </span>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontFamily: "'Fraunces', serif" }}>
                  {data.weeklyUses.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "#71717a", textAlign: "right" }}>uses / week</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Full analytics table */}
      <div style={{
        background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, overflow: "hidden",
        animation: "fadeSlideUp 0.45s ease",
      }}>
        {isLoading ? (
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
            <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 12 }}>◈</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>No analytics data yet</div>
            <div style={{ fontSize: 12, color: "#71717a" }}>
              Data will appear once templates start being used
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {/* Sticky header */}
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
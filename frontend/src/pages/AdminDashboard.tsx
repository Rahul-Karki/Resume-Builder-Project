import { useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { StatsBar } from "../components/admin/StatsBar";
import { BarChart, AnalyticsRow } from "../components/admin/AnalyticsChart";

// ─── Period selector ──────────────────────────────────────────────────────────
function PeriodBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "5px 14px", borderRadius: 20, border: "1px solid",
      borderColor: active ? "#C8F55A" : "#1E1E1E",
      background: active ? "rgba(200,245,90,0.1)" : "transparent",
      color: active ? "#C8F55A" : "#444",
      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
      transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

export function AdminDashboard() {
  const [period, setPeriod] = useState<7 | 30>(30);
  const [selected, setSelected] = useState<string | null>(null);
  const { stats, analytics, loading, error } = useAnalytics(period);

  const selectedAnalytics = analytics.find(a => a.templateId === selected) ?? analytics[0] ?? null;

  if (loading) return (
    <div style={{ padding: 40, fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, background: "#111", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, color: "#F87171", fontFamily: "'Outfit', sans-serif" }}>
      Failed to load analytics: {error}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Outfit', sans-serif", maxWidth: 1400, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 300, color: "#F0EFE8", letterSpacing: "-0.5px", margin: 0, marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "#444", margin: 0 }}>Template usage analytics and performance</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <PeriodBtn label="Last 7 days"  active={period === 7}  onClick={() => setPeriod(7)}  />
          <PeriodBtn label="Last 30 days" active={period === 30} onClick={() => setPeriod(30)} />
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ marginBottom: 28 }}>
          <StatsBar stats={stats} />
        </div>
      )}

      {/* Charts section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Left: Total usage bar chart */}
        <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 20px 16px" }}>
          <BarChart
            data={(() => {
              // Aggregate all templates per day
              const dateMap: Record<string, { date: string; count: number; resumesCreated: number; resumesEdited: number }> = {};
              analytics.forEach(a => {
                a.daily.forEach(d => {
                  if (!dateMap[d.date]) dateMap[d.date] = { date: d.date, count: 0, resumesCreated: 0, resumesEdited: 0 };
                  dateMap[d.date].count          += d.count;
                  dateMap[d.date].resumesCreated += d.resumesCreated;
                  dateMap[d.date].resumesEdited  += d.resumesEdited;
                });
              });
              return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-period);
            })()}
            color="#C8F55A"
            label={`Total Uses — Last ${period} Days`}
            height={180}
          />
        </div>

        {/* Right: Selected template chart */}
        <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "20px 20px 16px" }}>
          {/* Template picker for chart */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {analytics.filter(a => a.status === "published").slice(0, 5).map(a => (
              <button key={a.templateId}
                onClick={() => setSelected(a.templateId)}
                style={{
                  padding: "3px 10px", borderRadius: 20, border: "1px solid",
                  borderColor: (selected ?? analytics[0]?.templateId) === a.templateId ? "#C8F55A" : "#1E1E1E",
                  background: (selected ?? analytics[0]?.templateId) === a.templateId ? "rgba(200,245,90,0.1)" : "transparent",
                  color: (selected ?? analytics[0]?.templateId) === a.templateId ? "#C8F55A" : "#444",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                {a.name}
              </button>
            ))}
          </div>
          {selectedAnalytics && (
            <BarChart
              data={selectedAnalytics.daily.slice(-period)}
              color="#818CF8"
              label={`${selectedAnalytics.name} — Last ${period} Days`}
              height={148}
            />
          )}
        </div>
      </div>

      {/* Most / Least used highlight cards */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Most Used This Week",  data: stats.mostUsed,  accent: "#4ADE80" },
            { label: "Least Used This Week", data: stats.leastUsed, accent: "#F87171" },
          ].map(({ label, data, accent }) => data && (
            <div key={label} style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "18px 20px", display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#F0EFE8", marginBottom: 4 }}>{data.name}</div>
                <div style={{ fontSize: 12, color: "#555" }}>
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
                <div style={{ fontSize: 10, color: "#333", textAlign: "right" }}>uses / week</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full analytics table */}
      <div style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 80px",
          gap: 16, padding: "10px 16px",
          background: "#0A0A0A", borderBottom: "1px solid #1A1A1A",
        }}>
          {["#", "Template", "This Week", "This Month", "Trend", "14-day"].map(h => (
            <div key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: h === "#" ? "center" : h === "This Week" || h === "This Month" || h === "Trend" || h === "14-day" ? "right" : "left", fontFamily: "'Outfit', sans-serif" }}>
              {h}
            </div>
          ))}
        </div>

        {analytics.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#333", fontSize: 13 }}>No analytics data yet.</div>
        ) : (
          analytics.map((a, i) => (
            <AnalyticsRow key={a.templateId} analytics={a} rank={i + 1} />
          ))
        )}
      </div>
    </div>
  );
}
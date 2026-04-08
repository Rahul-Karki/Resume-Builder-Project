import { useState } from "react";
import { TemplateAnalytics, DailyUsage } from "../../types/admin.types";

interface BarChartProps {
  data:    DailyUsage[];
  color:   string;
  label:   string;
  height?: number;
}

// ─── Mini Sparkline ────────────────────────────────────────────────────────────
export function Sparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polyline points={`0,${height} ${pts} ${width},${height}`}
        fill={color} stroke="none" opacity="0.08" />
    </svg>
  );
}

// ─── Full Bar Chart ────────────────────────────────────────────────────────────
export function BarChart({ data, color, label, height = 180 }: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 12 }}>No data</div>;

  const max = Math.max(...data.map(d => d.count), 1);
  const barW = Math.max(4, Math.floor((600 / data.length) - 3));

  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, fontFamily: "'Outfit', sans-serif" }}>
        {label}
      </div>

      {/* Tooltip */}
      {hovered !== null && (
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8,
          padding: "6px 12px", fontSize: 11, fontFamily: "'Outfit', sans-serif",
          color: "#C8C7C0", zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          <span style={{ color: "#555" }}>{data[hovered]?.date?.slice(5)} · </span>
          <span style={{ fontWeight: 700, color }}>{data[hovered]?.count} uses</span>
          <span style={{ color: "#444" }}> ({data[hovered]?.resumesCreated} new)</span>
        </div>
      )}

      {/* Chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height, paddingTop: 30 }}>
        {data.map((day, i) => {
          const barH = Math.max(2, (day.count / max) * (height - 30));
          const isHov = hovered === i;
          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} uses`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flex: 1, minWidth: 0,
                height: barH,
                background: isHov ? color : color + "55",
                borderRadius: "3px 3px 0 0",
                cursor: "default",
                transition: "background 0.1s, height 0.2s",
                position: "relative",
              }}
            />
          );
        })}
      </div>

      {/* X-axis labels — show ~6 evenly spaced */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {[data[0], data[Math.floor(data.length / 4)], data[Math.floor(data.length / 2)], data[Math.floor(data.length * 3 / 4)], data[data.length - 1]]
          .filter(Boolean)
          .map(d => (
            <span key={d.date} style={{ fontSize: 9.5, color: "#333", fontFamily: "'Outfit', sans-serif" }}>
              {d.date?.slice(5)}
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── Usage Table Row Sparkline Card ────────────────────────────────────────────
export function AnalyticsRow({ analytics, rank }: { analytics: TemplateAnalytics; rank: number }) {
  const trendColor = analytics.trend === "up" ? "#4ADE80" : analytics.trend === "down" ? "#F87171" : "#555";
  const trendIcon  = analytics.trend === "up" ? "↑" : analytics.trend === "down" ? "↓" : "→";
  const counts     = analytics.daily.slice(-14).map(d => d.count);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 80px",
      alignItems: "center", gap: 16,
      padding: "12px 16px",
      borderBottom: "1px solid #111",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: rank <= 3 ? "#C8F55A" : "#2A2A2A", textAlign: "center" }}>
        #{rank}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#C8C7C0", marginBottom: 2 }}>{analytics.name}</div>
        <div style={{ fontSize: 10, color: "#333" }}>{analytics.layoutId} · {analytics.status}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EFE8" }}>{analytics.weeklyUses.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: "#333" }}>this week</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#888" }}>{analytics.monthlyUses.toLocaleString()}</div>
        <div style={{ fontSize: 10, color: "#333" }}>this month</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: trendColor }}>{trendIcon}</span>
        <span style={{ fontSize: 11, color: trendColor, textTransform: "capitalize" }}>{analytics.trend}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Sparkline data={counts} color="#C8F55A" width={80} height={28} />
      </div>
    </div>
  );
}
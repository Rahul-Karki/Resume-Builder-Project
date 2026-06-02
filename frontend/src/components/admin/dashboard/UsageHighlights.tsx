import { DashboardStats } from "@/types/admin.types";
import { Skeleton } from "@/components/Skeleton";

interface Props {
  stats?: DashboardStats | null;
  isLoading: boolean;
}

export function UsageHighlights({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ background: "#111", border: "1px solid #1A1A1A", borderRadius: 14, padding: "18px 20px" }}>
            <Skeleton className="h-3 w-32 rounded-md" style={{ marginBottom: 12 }} />
            <Skeleton className="h-5 w-40 rounded-md" style={{ marginBottom: 8 }} />
            <Skeleton className="h-3 w-52 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats?.mostUsed && !stats?.leastUsed) return null;

  const highlights = [
    { label: "Most Used This Week", data: stats.mostUsed, accent: "#4ADE80" },
    { label: "Least Used This Week", data: stats.leastUsed, accent: "#F87171" },
  ].filter(item => item.data);

  if (highlights.length === 0) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${highlights.length}, 1fr)`, gap: 16 }}>
      {highlights.map(({ label, data, accent }) => data && (
        <div key={label} style={{
          background: "#111", border: "1px solid #1A1A1A", borderRadius: 14,
          padding: "18px 20px", display: "flex", gap: 16, alignItems: "center",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", marginBottom: 4 }}>{data.name}</div>
            <div style={{ fontSize: 12, color: "#a1a1aa" }}>
              <span style={{ color: accent, fontWeight: 700 }}>{data.weeklyUses.toLocaleString()}</span> uses this week ·
              <span style={{ color: data.trend === "up" ? "#4ADE80" : data.trend === "down" ? "#F87171" : "#555", marginLeft: 4 }}>
                {data.trend === "up" ? "↑" : data.trend === "down" ? "↓" : "→"} {data.trend}
              </span>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontFamily: "'Fraunces', serif" }}>{data.weeklyUses.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: "#71717a", textAlign: "right" }}>uses / week</div>
          </div>
        </div>
      ))}
    </div>
  );
}

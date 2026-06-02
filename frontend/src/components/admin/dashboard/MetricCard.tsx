import { Skeleton } from "@/components/Skeleton";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
  trend?: { value: number; label: string; isUp: boolean };
  icon?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function MetricCard({ label, value, subtitle, accent = "#C8F55A", trend, icon, loading, onClick }: MetricCardProps) {
  if (loading) {
    return (
      <div style={{
        background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
        padding: "18px 20px", flex: 1, minWidth: 200,
      }}>
        <Skeleton className="h-2.5 w-28 rounded-md" style={{ marginBottom: 12 }} />
        <Skeleton className="h-7 w-20 rounded-md" style={{ marginBottom: 8 }} />
        <Skeleton className="h-2.5 w-36 rounded-md" />
        <div style={{ marginTop: 12, height: 2, background: "#27272a", borderRadius: 1 }}>
          <div style={{ height: 2, width: "40%", background: "#3f3f46", borderRadius: 1 }} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
        padding: "18px 20px", flex: 1, minWidth: 200,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
        fontFamily: "'Outfit', sans-serif",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = "#52525b"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = "#3f3f46"; e.currentTarget.style.boxShadow = "none"; } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px" }}>
          {label}
        </div>
        {icon && <span style={{ fontSize: 14, opacity: 0.3, color: "#a1a1aa" }}>{icon}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fafafa", letterSpacing: "-1px",
          fontFamily: "'Fraunces', serif", lineHeight: 1,
        }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {trend && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: trend.isUp ? "#4ADE80" : "#F87171",
            display: "flex", alignItems: "center", gap: 2,
          }}>
            {trend.isUp ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>
          {subtitle}
        </div>
      )}
      <div style={{ marginTop: 12, height: 2, background: "#27272a", borderRadius: 1 }}>
        <div style={{ height: 2, width: "40%", background: accent, borderRadius: 1, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string | number;
  accent?: string;
  subtitle?: string;
  compact?: boolean;
}

export function MetricRow({ label, value, accent = "#C8F55A", subtitle, compact = false }: MetricRowProps) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: compact ? "6px 0" : "8px 0",
      borderBottom: "1px solid #27272a",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div>
        <div style={{ fontSize: compact ? 11 : 12, color: "#a1a1aa", fontWeight: 500 }}>{label}</div>
        {subtitle && <div style={{ fontSize: 10, color: "#52525b", marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div style={{
        fontSize: compact ? 13 : 15, fontWeight: 700, color: "#fafafa",
        fontFamily: "'Fraunces', serif",
      }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

interface StatusDotProps {
  status: "healthy" | "degraded" | "down";
  label: string;
  subtitle?: string;
}

export function StatusDot({ status, label, subtitle }: StatusDotProps) {
  const colors: Record<string, string> = {
    healthy: "#4ADE80",
    degraded: "#F59E0B",
    down: "#F87171",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: colors[status],
        boxShadow: `0 0 8px ${colors[status]}40`,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{label}</div>
        {subtitle && <div style={{ fontSize: 10, color: "#71717a", marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

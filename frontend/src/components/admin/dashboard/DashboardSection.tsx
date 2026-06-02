import { ReactNode } from "react";
import { Skeleton } from "@/components/Skeleton";

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  grid?: boolean;
  gridCols?: number;
}

export function DashboardSection({
  title, subtitle, action, children,
  isLoading, isError, errorMessage, onRetry,
  emptyState, isEmpty, grid, gridCols = 2,
}: DashboardSectionProps) {
  return (
    <div style={{
      background: "#111", border: "1px solid #1A1A1A", borderRadius: 14,
      overflow: "hidden", fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "16px 20px 12px", borderBottom: "1px solid #1A1A1A",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fafafa", fontFamily: "'Fraunces', serif" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10.5, color: "#71717a", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      <div style={{ padding: "14px 20px 18px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : isError ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 13, color: "#fca5a5", marginBottom: 10 }}>{errorMessage || "Failed to load data"}</div>
            {onRetry && (
              <button onClick={onRetry} style={{
                padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(220,38,38,0.4)",
                background: "transparent", color: "#fca5a5", fontSize: 11, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Retry
              </button>
            )}
          </div>
        ) : isEmpty && emptyState ? (
          emptyState
        ) : grid ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 12 }}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "◈", title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ padding: "24px", textAlign: "center" }}>
      <div style={{ fontSize: 28, opacity: 0.12, marginBottom: 10, color: "#a1a1aa" }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#71717a" }}>{subtitle}</div>}
    </div>
  );
}

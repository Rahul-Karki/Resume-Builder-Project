import { DashboardSection, EmptyState } from "./DashboardSection";

interface ActivityEntry {
  id: string;
  type: string;
  action: string;
  user: string;
  resource: string;
  timestamp: string;
  details?: string;
}

interface Props {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const MOCK_ACTIVITY: ActivityEntry[] = [];

export function ActivityTimeline({ isLoading, isError, onRetry }: Props) {
  return (
    <DashboardSection
      title="Recent Activity"
      subtitle="Latest admin actions and system events"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      isEmpty={MOCK_ACTIVITY.length === 0}
      emptyState={
        <EmptyState
          icon="≡"
          title="No recent activity"
          subtitle="Activity will appear here as admin actions are performed"
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {MOCK_ACTIVITY.slice(0, 10).map((entry, i) => (
          <div key={entry.id} style={{
            display: "flex", gap: 12, padding: "10px 0",
            borderBottom: i < Math.min(MOCK_ACTIVITY.length, 10) - 1 ? "1px solid #27272a" : "none",
            fontFamily: "'Outfit', sans-serif",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: "#27272a", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, flexShrink: 0, marginTop: 1,
            }}>
              {entry.type === "create" ? "+" : entry.type === "delete" ? "×" : "↻"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#d4d4d8" }}>
                <span style={{ fontWeight: 600 }}>{entry.user}</span>
                {" "}{entry.action}{" "}
                <span style={{ color: "#a1a1aa" }}>{entry.resource}</span>
              </div>
              {entry.details && <div style={{ fontSize: 10.5, color: "#71717a", marginTop: 2 }}>{entry.details}</div>}
            </div>
            <div style={{ fontSize: 10, color: "#52525b", whiteSpace: "nowrap", flexShrink: 0 }}>
              {new Date(entry.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  );
}

import { SystemHealth } from "@/types/admin.types";
import { StatusDot } from "./MetricCard";
import { DashboardSection } from "./DashboardSection";

interface Props {
  health?: SystemHealth | null;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function SystemHealthGrid({ health, isLoading, isError, onRetry }: Props) {
  return (
    <DashboardSection
      title="System Health"
      subtitle="Infrastructure and service status"
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div>
          <StatusDot
            status={health?.redis?.status ?? "down"}
            label="Redis Cache"
            subtitle={health?.redis?.latency ? `${health.redis.latency}ms` : health?.redis?.message || "Not connected"}
          />
          <StatusDot
            status={health?.mongodb?.status ?? "down"}
            label="MongoDB"
            subtitle={health?.mongodb?.latency ? `${health.mongodb.latency}ms` : health?.mongodb?.message || "Not connected"}
          />
        </div>
        <div>
          <StatusDot
            status={health?.api?.status ?? "healthy"}
            label="API Server"
            subtitle={health?.api?.latency ? `${health.api.latency}ms` : "Running"}
          />
          <StatusDot
            status={health?.queue?.status ?? "healthy"}
            label="Job Queue"
            subtitle={health?.queue?.message || "Operational"}
          />
        </div>
      </div>
    </DashboardSection>
  );
}

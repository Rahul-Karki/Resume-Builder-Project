import { DashboardStats } from "@/types/admin.types";
import { MetricCard } from "./MetricCard";
import { Skeleton } from "@/components/Skeleton";

interface Props {
  stats?: DashboardStats | null;
  isLoading: boolean;
}

export function SystemOverviewCards({ stats, isLoading }: Props) {
  if (isLoading) {
    return (
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{
            background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
            padding: "18px 20px", flex: 1, minWidth: 180,
          }}>
            <Skeleton className="h-2.5 w-24 rounded-md" style={{ marginBottom: 10 }} />
            <Skeleton className="h-7 w-16 rounded-md" style={{ marginBottom: 6 }} />
            <Skeleton className="h-2.5 w-32 rounded-md" />
            <div style={{ marginTop: 10, height: 2, background: "#27272a", borderRadius: 1 }}>
              <div style={{ height: 2, width: "40%", background: "#3f3f46", borderRadius: 1 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <MetricCard
        label="Total Users"
        value={stats?.totalUsers ?? 0}
        subtitle="All registered accounts"
        accent="#818CF8"
        icon="👤"
      />
      <MetricCard
        label="Resumes Generated"
        value={stats?.totalResumes ?? 0}
        subtitle="Total resumes created"
        accent="#C8F55A"
        icon="◇"
      />
      <MetricCard
        label="Templates"
        value={stats?.totalTemplates ?? 0}
        subtitle={`${stats?.publishedTemplates ?? 0} published · ${stats?.draftTemplates ?? 0} draft`}
        accent="#F59E0B"
        icon="◈"
      />
      <MetricCard
        label="Uses This Week"
        value={stats?.totalUsesThisWeek ?? 0}
        subtitle="All templates combined"
        accent="#4ADE80"
        icon="≡"
      />
      <MetricCard
        label="Uses This Month"
        value={stats?.totalUsesThisMonth ?? 0}
        subtitle="Rolling 30 days"
        accent="#818CF8"
        icon="▤"
      />
    </div>
  );
}

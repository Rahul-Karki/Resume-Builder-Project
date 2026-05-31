import { DashboardStats } from "@/types/admin.types";
import { Skeleton } from "@/components/Skeleton";

interface Props { stats: DashboardStats; }

interface StatCardProps {
  label:   string;
  value:   string | number;
  sub?:    string;
  accent?: string;
}

function StatCard({ label, value, sub, accent = "#C8F55A" }: StatCardProps) {
  return (
    <div style={{
      background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12,
      padding: "18px 20px", flex: 1, minWidth: 200,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#fafafa", letterSpacing: "-1px", fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>
          {sub}
        </div>
      )}
      <div style={{ marginTop: 12, height: 2, background: "#27272a", borderRadius: 1 }}>
        <div style={{ height: 2, width: "40%", background: accent, borderRadius: 1 }} />
      </div>
    </div>
  );
}

export function StatsBar({ stats }: Props) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <StatCard label="Total Users"     value={stats.totalUsers}         sub="All registered accounts" accent="#818CF8" />
      <StatCard label="Total Templates"    value={stats.totalTemplates}     sub={`${stats.publishedTemplates} published · ${stats.draftTemplates} draft`} />
      <StatCard label="Premium Templates"  value={stats.premiumTemplates}   sub="Paid-only access" accent="#F59E0B" />
      <StatCard label="Uses This Week"     value={stats.totalUsesThisWeek}  sub="All templates combined" accent="#4ADE80" />
      <StatCard label="Uses This Month"    value={stats.totalUsesThisMonth} sub="Rolling 30 days" accent="#818CF8" />
      {stats.mostUsed && (
        <StatCard label="Most Used" value={stats.mostUsed.name}
          sub={`${stats.mostUsed.weeklyUses.toLocaleString()} uses this week`} accent="#C8F55A" />
      )}
    </div>
  );
}

export function StatsBarSkeleton() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
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
      ))}
    </div>
  );
}
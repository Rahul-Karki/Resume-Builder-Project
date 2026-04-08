import { DashboardStats } from "../../types/admin.types";

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
      background: "#111", border: "1px solid #1A1A1A", borderRadius: 12,
      padding: "18px 20px", flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#333", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#F0EFE8", letterSpacing: "-1px", fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#3A3A3A", marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>
          {sub}
        </div>
      )}
      <div style={{ marginTop: 12, height: 2, background: "#1A1A1A", borderRadius: 1 }}>
        <div style={{ height: 2, width: "40%", background: accent, borderRadius: 1 }} />
      </div>
    </div>
  );
}

export function StatsBar({ stats }: Props) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
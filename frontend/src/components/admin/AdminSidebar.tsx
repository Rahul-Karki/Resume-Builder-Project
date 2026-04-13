import { AdminPage, NAV_ITEMS } from "../../types/admin.types";

interface Props {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  adminName:  string;
}

export function AdminSidebar({ activePage, onNavigate, adminName }: Props) {
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: "#0A0A0A",
      borderRight: "1px solid #141414",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      fontFamily: "'Outfit', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #141414" }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px", color: "#F0EFE8" }}>
          Resume<span style={{ color: "#C8F55A" }}>Studio</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#2A2A2A", marginTop: 4, textTransform: "uppercase", letterSpacing: "1.5px" }}>
          Admin Panel
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, border: "none",
                background: active ? "#161616" : "transparent",
                color: active ? "#F0EFE8" : "#444",
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: "pointer", fontFamily: "inherit", marginBottom: 2,
                transition: "all 0.15s",
                borderLeft: active ? "2px solid #C8F55A" : "2px solid transparent",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#888"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#444"; }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
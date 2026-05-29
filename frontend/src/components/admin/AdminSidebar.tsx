import { AdminPage, NAV_ITEMS } from "../../types/admin.types";
import { Logo } from "../Logo";

interface Props {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  adminName:  string;
  isMobile?: boolean;
}

export function AdminSidebar({ activePage, onNavigate, adminName, isMobile = false }: Props) {
  return (
    <aside style={{
      width: isMobile ? "100%" : 248,
      minWidth: isMobile ? "100%" : 248,
      flexShrink: 0,
      background: "#18181b",
      borderRight: isMobile ? "none" : "1px solid #3f3f46",
      borderBottom: isMobile ? "1px solid #3f3f46" : "none",
      display: "flex", flexDirection: "column",
      height: isMobile ? "auto" : "100vh",
      position: isMobile ? "relative" : "sticky",
      top: 0,
      alignSelf: "stretch",
      overflow: "hidden",
      fontFamily: "'Outfit', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: isMobile ? "10px 12px" : "20px 20px 16px", borderBottom: "1px solid #3f3f46" }}>
        <Logo isCompact={true} />
        <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", marginTop: 4, textTransform: "uppercase", letterSpacing: "1.5px", display: isMobile ? "none" : "block" }}>
          Admin Panel
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginTop: 6, display: isMobile ? "none" : "block" }}>
          {adminName}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{
        padding: isMobile ? "10px 10px 12px" : "12px 10px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflowX: "hidden",
        overflowY: "auto",
        whiteSpace: "normal",
        scrollbarWidth: "none",
      }}>
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : "flex-start", gap: 10,
                padding: isMobile ? "12px 10px" : "10px 12px", borderRadius: 10, border: "none",
                background: active ? "#27272a" : "transparent",
                color: active ? "#fafafa" : "#a1a1aa",
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: "pointer", fontFamily: "inherit", marginBottom: isMobile ? 0 : 2,
                transition: "all 0.15s",
                borderLeft: active ? "2px solid #C8F55A" : "2px solid transparent",
                flexShrink: 0,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#d4d4d8"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#a1a1aa"; }}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
              <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

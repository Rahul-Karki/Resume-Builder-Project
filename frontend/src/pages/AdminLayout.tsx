import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPage, PAGE_LABELS, PAGE_SUBTITLES } from "@/types/admin.types";
import { api } from "@/services/api";
import { useViewport } from "@/hooks/useViewport";

const ALL_PAGES: AdminPage[] = ["dashboard", "templates"];

function getPageFromPath(pathname: string): AdminPage {
  if (pathname.includes("/admin/templates")) return "templates";
  return "dashboard";
}

function TopBar({ page, onLogout, isMobile }: { page: AdminPage; onLogout: () => Promise<void>; isMobile: boolean }) {
  return (
    <div style={{
      height: 52, background: "#18181b", borderBottom: "1px solid #3f3f46",
      display: "flex", alignItems: "center", padding: isMobile ? "0 12px" : "0 24px",
      justifyContent: "space-between", flexShrink: 0,
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fafafa" }}>{PAGE_LABELS[page]}</div>
        <div style={{ fontSize: 10.5, color: "#a1a1aa", marginTop: 1 }}>{PAGE_SUBTITLES[page]}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#52525b", display: isMobile ? "none" : "inline" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
        <a href="/" style={{
          fontSize: 11.5, color: "#a1a1aa", textDecoration: "none",
          padding: "5px 10px", borderRadius: 6, border: "1px solid #3f3f46",
          transition: "all 0.12s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#d4d4d8"; e.currentTarget.style.borderColor = "#71717a"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.borderColor = "#3f3f46"; }}
        >
          ← Site
        </a>
        <button
          onClick={onLogout}
          style={{
            padding: "5px 12px", borderRadius: 6, border: "1px solid #3f3f46",
            background: "transparent", color: "#a1a1aa", fontSize: 11.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#d4d4d8"; e.currentTarget.style.borderColor = "#71717a"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.borderColor = "#3f3f46"; }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

interface Props {
  adminName?: string;
}

export default function AdminLayout({ adminName = "Admin User" }: Props) {
  const isMobile = useViewport(1024);
  const location = useLocation();
  const navigate = useNavigate();

  const page = getPageFromPath(location.pathname);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Always clear client-side auth state even if API logout fails.
    } finally {
      localStorage.removeItem("accessToken");
      window.location.href = "/";
    }
  };

  const handleNavigate = (nextPage: AdminPage) => {
    const routes: Record<string, string> = {
      dashboard: "/admin",
      templates: "/admin/templates",
    };
    navigate(routes[nextPage]);
  };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100vh", minHeight: "100vh", background: "#09090b", alignItems: "stretch" }}>
      <AdminSidebar activePage={page} onNavigate={handleNavigate} adminName={adminName} isMobile={isMobile} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar page={page} onLogout={handleLogout} isMobile={isMobile} />
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

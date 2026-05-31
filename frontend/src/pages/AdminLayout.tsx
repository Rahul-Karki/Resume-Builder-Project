import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminPage } from "@/types/admin.types";
import { api } from "@/services/api";
import { useViewport } from "@/hooks/useViewport";

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ page, onLogout, isMobile }: { page: AdminPage; onLogout: () => Promise<void>; isMobile: boolean }) {
  const titles: Record<AdminPage, string> = {
    dashboard: "Dashboard",
    templates: "Template Management",
  };
  const subtitles: Record<AdminPage, string> = {
    dashboard: "Usage analytics and performance overview",
    templates: "Create, publish, and configure resume templates",
  };
  return (
    <div style={{
      height: 56, background: "#18181b", borderBottom: "1px solid #3f3f46",
      display: "flex", alignItems: "center", padding: isMobile ? "0 12px" : "0 32px",
      justifyContent: "space-between", flexShrink: 0,
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fafafa" }}>{titles[page]}</div>
        <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 1 }}>{subtitles[page]}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Back to site */}
        <Link to="/" style={{
          fontSize: 12, color: "#a1a1aa", textDecoration: "none",
          padding: "5px 12px", borderRadius: 7, border: "1px solid #3f3f46",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#d4d4d8"; e.currentTarget.style.borderColor = "#71717a"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.borderColor = "#3f3f46"; }}
        >
          ← Back to site
        </Link>
        <button
          onClick={onLogout}
          style={{
            padding: "6px 14px", borderRadius: 7, border: "1px solid #3f3f46",
            background: "transparent", color: "#a1a1aa", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
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

// ─── Main Layout ──────────────────────────────────────────────────────────────

interface Props {
  adminName?: string;
}

export default function AdminLayout({ adminName = "Admin User" }: Props) {
  const isMobile = useViewport(1024);
  const location = useLocation();
  const navigate = useNavigate();

  const page: AdminPage = location.pathname.includes("/admin/templates") ? "templates" : "dashboard";
  const resolvedPage: AdminPage = page;

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
    navigate(nextPage === "dashboard" ? "/admin" : "/admin/templates");
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100vh", minHeight: "100vh", background: "#09090b", alignItems: "stretch" }}>

        {/* Sidebar */}
        <AdminSidebar activePage={resolvedPage} onNavigate={handleNavigate} adminName={adminName} isMobile={isMobile} />

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar page={resolvedPage} onLogout={handleLogout} isMobile={isMobile} />
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}


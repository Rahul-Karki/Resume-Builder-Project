import { useEffect, useState } from "react";
import { Link } from "react-router-dom"
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { AdminDashboard } from "./AdminDashboard";
import { AdminTemplates } from "./AdminTemplates";
import { AdminPage } from "../types/admin.types";
import { api } from "@/services/api";

// ─── Global CSS (same design system as landing + my-resumes pages) ─────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root { height: 100%; }

  body {
    background: #080808;
    color: #F0EFE8;
    font-family: 'Outfit', sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #080808; }
  ::-webkit-scrollbar-thumb { background: #1E1E1E; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #2A2A2A; }

  input, textarea, select {
    box-sizing: border-box;
    background: #141414;
    color: #C8C7C0;
  }
  input:focus, textarea:focus, select:focus { outline: none; }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 8px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }
`;

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
      height: 56, background: "#0A0A0A", borderBottom: "1px solid #111",
      display: "flex", alignItems: "center", padding: isMobile ? "0 12px" : "0 32px",
      justifyContent: "space-between", flexShrink: 0,
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EFE8" }}>{titles[page]}</div>
        <div style={{ fontSize: 11, color: "#3A3A3A", marginTop: 1 }}>{subtitles[page]}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Back to site */}
        <Link to="/" style={{
          fontSize: 12, color: "#444", textDecoration: "none",
          padding: "5px 12px", borderRadius: 7, border: "1px solid #1A1A1A",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#2A2A2A"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.borderColor = "#1A1A1A"; }}
        >
          ← Back to site
        </Link>
        <button
          onClick={onLogout}
          style={{
            padding: "6px 14px", borderRadius: 7, border: "1px solid #1A1A1A",
            background: "transparent", color: "#666", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#C8C7C0"; e.currentTarget.style.borderColor = "#2A2A2A"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#666"; e.currentTarget.style.borderColor = "#1A1A1A"; }}
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
  // In production: pass from auth context
}

export default function AdminLayout({ adminName = "Admin User" }: Props) {
  const [page, setPage] = useState<AdminPage>("dashboard");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 1024);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "100vh", minHeight: "100vh", overflow: "hidden", background: "#080808" }}>

        {/* Sidebar */}
        <AdminSidebar activePage={page} onNavigate={setPage} adminName={adminName} isMobile={isMobile} />

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <TopBar page={page} onLogout={handleLogout} isMobile={isMobile} />
          <div style={{ flex: 1, overflowY: "auto" }}>
            {page === "dashboard" && <AdminDashboard />}
            {page === "templates" && <AdminTemplates />}
          </div>
        </div>
      </div>
    </>
  );
}

/*
  Mount in your React Router:

    import AdminLayout from "./pages/AdminLayout";
    import { RequireRole } from "./components/auth/RequireRole";

    <Route path="/admin" element={
      <RequireRole role="admin">
        <AdminLayout adminName={currentUser.name} />
      </RequireRole>
    } />

  RequireRole example:
    export function RequireRole({ role, children }) {
      const { user } = useAuth();
      if (!user || !["admin","superadmin"].includes(user.role)) {
        return <Navigate to="/login" replace />;
      }
      return children;
    }
*/
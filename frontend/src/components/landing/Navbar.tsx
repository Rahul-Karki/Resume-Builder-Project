import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { Logo } from "../Logo";

// ─── Navbar.tsx ───────────────────────────────────────────────────────────────
// Sticky nav: transparent → solid on scroll
// Nav links: Templates, My Resumes
// Auth: Log In (ghost), Sign Up Free (lime CTA)

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 900);
      setIsCompact(window.innerWidth < 640);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("accessToken")));
  }, []);

  useEffect(() => {
    let active = true;

    const loadRole = async () => {
      if (!localStorage.getItem("accessToken")) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");
        if (!active) return;
        setIsAdmin(response.data?.user?.role === "admin");
      } catch {
        if (!active) return;
        setIsAdmin(false);
      }
    };

    void loadRole();

    return () => {
      active = false;
    };
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
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        minHeight: isMobile ? 52 : 60,
        height: "auto",
        background: scrolled ? "rgba(8,8,8,0.96)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        display: "flex", alignItems: "center",
        padding: isMobile ? "8px 12px" : isCompact ? "0 20px" : "0 40px",
        transition: "all 0.35s ease",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
        <Logo isCompact={isCompact} />

        <div style={{ display: "flex", gap: isMobile ? 8 : isCompact ? 16 : 30, marginLeft: isMobile ? 8 : isCompact ? 16 : 36, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
          {[
            { label: "Templates", href: "/templates" },
            { label: "My Resumes", href: "/resumes" },
            ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
          ].map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              style={{ fontSize: isCompact ? 12 : 13, fontWeight: 500, color: "#555", textDecoration: "none", padding: "6px 0", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#C8C7C0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#555")}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            style={{
              padding: isMobile ? "8px 12px" : "7px 20px", borderRadius: 8, border: "1px solid #222",
              background: "transparent", color: "#777", fontSize: isCompact ? 12 : 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", minHeight: 36, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#777"; }}
          >
            Logout
          </button>
        ) : (
          <>
            <Link
              to="/login"
              style={{
                padding: isMobile ? "8px 12px" : "7px 20px", borderRadius: 8, border: "1px solid #222",
                background: "transparent", color: "#777", fontSize: isCompact ? 12 : 13, fontWeight: 600,
                textDecoration: "none", display: "inline-flex", alignItems: "center",
                minHeight: 36, transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#777"; }}
            >
              Log In
            </Link>
            <Link
              to="/signup"
              style={{
                padding: isMobile ? "8px 12px" : "7px 20px", borderRadius: 8, border: "none",
                background: "#C8F55A", color: "#0E0E0E", fontSize: isCompact ? 12 : 13, fontWeight: 800,
                textDecoration: "none", display: "inline-flex", alignItems: "center",
                minHeight: 36, transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Sign Up Free
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

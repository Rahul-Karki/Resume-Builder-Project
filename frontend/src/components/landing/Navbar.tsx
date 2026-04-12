import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";

// ─── Navbar.tsx ───────────────────────────────────────────────────────────────
// Sticky nav: transparent → solid on scroll
// Nav links: Templates, My Resumes
// Auth: Log In (ghost), Sign Up Free (lime CTA)

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    setIsAuthenticated(Boolean(localStorage.getItem("accessToken")));
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
        height: 60,
        background: scrolled ? "rgba(8,8,8,0.96)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        display: "flex", alignItems: "center", padding: "0 40px",
        transition: "all 0.35s ease",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{ textDecoration: "none", fontWeight: 800, fontSize: 17, letterSpacing: "-0.4px", color: "#F0EFE8", flexShrink: 0, lineHeight: 1 }}
      >
        Resume<span style={{ color: "#C8F55A" }}>Studio</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 30, marginLeft: 48 }}>
        {[
          { label: "Templates", href: "/templates" },
          { label: "My Resumes", href: "/resumes" },
          { label: "Admin", href: "/admin" },
        ].map(({ label, href }) => (
          <Link
            key={label}
            to={href}
            style={{ fontSize: 13, fontWeight: 500, color: "#555", textDecoration: "none", transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#C8C7C0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#555")}
          >
            {label}
          </Link>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Auth buttons */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            style={{
              padding: "7px 20px", borderRadius: 8, border: "1px solid #222",
              background: "transparent", color: "#777", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
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
                padding: "7px 20px", borderRadius: 8, border: "1px solid #222",
                background: "transparent", color: "#777", fontSize: 13, fontWeight: 600,
                textDecoration: "none", display: "inline-block", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#777"; }}
            >
              Log In
            </Link>
            <Link
              to="/signup"
              style={{
                padding: "7px 20px", borderRadius: 8, border: "none",
                background: "#C8F55A", color: "#0E0E0E", fontSize: 13, fontWeight: 800,
                textDecoration: "none", display: "inline-block", transition: "opacity 0.15s",
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
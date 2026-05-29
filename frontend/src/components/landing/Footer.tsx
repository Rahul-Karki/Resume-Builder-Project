import { useState, useEffect } from "react";

// ─── Footer.tsx ───────────────────────────────────────────────────────────────
// Minimal footer with nav columns and copyright.

const LINKS = {
  Product: [
    { label: "Templates", href: "/templates" },
    { label: "My Resumes", href: "/resumes" },
  ],
  Account: [
    { label: "Log In",    href: "/login"  },
    { label: "Sign Up",   href: "/signup" },
  ],
};

export function Footer() {
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
      setIsCompact(window.innerWidth < 480);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <footer style={{
      background: "#060606",
      borderTop: "1px solid #111",
      padding: isMobile ? "36px 16px 28px" : isCompact ? "40px 24px 32px" : "48px 40px 36px",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 60, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 48 }}>
          {/* Brand */}
          <div style={{ maxWidth: 260 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.3px", color: "#fafafa", marginBottom: 12 }}>
              Resume<span style={{ color: "#C8F55A" }}>Studio</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#a1a1aa", lineHeight: 1.65, margin: 0 }}>
              ATS-verified resume templates with live scoring and full style control.
            </p>
          </div>

          {/* Link columns */}
          <div style={{ display: "flex", gap: 60, flexWrap: "wrap" }}>
            {Object.entries(LINKS).map(([section, links]) => (
              <div key={section}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 14 }}>
                  {section}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {links.map(({ label, href }) => (
                    <a
                      key={label}
                      href={href}
                      style={{ fontSize: 13, color: "#a1a1aa", textDecoration: "none", transition: "color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#d4d4d8")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#a1a1aa")}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid #111", paddingTop: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <span style={{ fontSize: 11, color: "#71717a" }}>
            © {new Date().getFullYear()} ResumeStudio. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {["ATS-Verified", "Live Score", "Full Style Control"].map(tag => (
              <span key={tag} style={{
                fontSize: 10, fontWeight: 700, color: "#71717a",
                background: "#18181b", border: "1px solid #3f3f46",
                padding: "3px 10px", borderRadius: 20,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ─── CTASection.tsx ───────────────────────────────────────────────────────────
// Bottom CTA section. Two actions: Sign Up Free + Browse Templates.
// Minimal editorial layout — no fluff, no fake claims.

export function CTASection() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(Boolean(localStorage.getItem("accessToken")));
    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("focus", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("focus", syncAuth);
    };
  }, []);

  return (
    <section style={{
      background: "#080808",
      padding: "100px 40px 120px",
      borderTop: "1px solid #111",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background radial */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 400,
        background: "radial-gradient(ellipse at center, rgba(200,245,90,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative" }}>
        {/* Eyebrow */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "2px",
          textTransform: "uppercase", marginBottom: 24, fontFamily: "'Outfit', sans-serif",
        }}>
          Get Started
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "clamp(38px, 5vw, 62px)",
          fontWeight: 300, letterSpacing: "-2px", color: "#F0EFE8",
          margin: "0 0 20px", lineHeight: 1.06,
        }}>
          Your resume.<br />
          <em style={{ fontStyle: "italic", color: "#C8F55A" }}>Your style.</em>
        </h2>

        <p style={{
          fontSize: 15, color: "#444", lineHeight: 1.65,
          marginBottom: 44, fontFamily: "'Outfit', sans-serif", fontWeight: 300,
          maxWidth: 480, margin: "0 auto 44px",
        }}>
          Pick a template, fill in your details, and watch your ATS score update live. Save when you're ready.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {!isAuthenticated && (
            <Link
              to="/signup"
              style={{
                padding: "14px 32px", borderRadius: 10, border: "none",
                background: "#C8F55A", color: "#0E0E0E",
                fontSize: 15, fontWeight: 800,
                textDecoration: "none", display: "inline-block",
                transition: "opacity 0.15s", fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Sign Up Free →
            </Link>
          )}
          <Link
            to="/templates"
            style={{
              padding: "14px 32px", borderRadius: 10,
              border: "1px solid #252525", background: "transparent",
              color: "#666", fontSize: 15, fontWeight: 600,
              textDecoration: "none", display: "inline-block",
              transition: "all 0.15s", fontFamily: "'Outfit', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#666"; }}
          >
            Browse Templates
          </Link>
        </div>

        {/* Fine print */}
        <p style={{
          marginTop: 24, fontSize: 11, color: "#2A2A2A",
          fontFamily: "'Outfit', sans-serif",
        }}>
          No credit card required. Free templates available immediately.
        </p>
      </div>
    </section>
  );
}
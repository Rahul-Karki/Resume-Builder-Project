import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// ─── HeroSection.tsx ──────────────────────────────────────────────────────────
// Full-viewport hero with:
//   - Editorial Fraunces headline
//   - 3 real feature pills
//   - Two CTAs: Browse Templates + Log In
//   - Animated live resume mockup (SVG) on the right
//   - Subtle grid texture background

// Animated mock resume that cycles accent colors to show "style how you like"
const ACCENT_COLORS = ["#0F766E", "#1B2B4B", "#1a1a1a", "#7C3AED", "#92400E"];

function LiveMockup() {
  const [accentIdx, setAccentIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setAccentIdx(i => (i + 1) % ACCENT_COLORS.length);
        setTransitioning(false);
      }, 300);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const accent = ACCENT_COLORS[accentIdx];

  return (
    <div style={{
      position: "relative",
      width: "100%",
      maxWidth: 420,
      flexShrink: 0,
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", inset: -40,
        background: `radial-gradient(ellipse at center, ${accent}18 0%, transparent 70%)`,
        transition: "background 0.6s ease",
        pointerEvents: "none",
        borderRadius: "50%",
      }} />

      {/* Paper shadow layers */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: -12, bottom: -12,
        background: "#1A1A1A", borderRadius: 8, opacity: 0.5,
      }} />
      <div style={{
        position: "absolute", top: 6, left: 6, right: -6, bottom: -6,
        background: "#141414", borderRadius: 8, opacity: 0.7,
      }} />

      {/* Resume paper */}
      <div style={{
        position: "relative",
        background: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.8)",
        opacity: transitioning ? 0.7 : 1,
        transition: "opacity 0.3s ease",
      }}>
        <svg viewBox="0 0 380 490" width="100%" xmlns="http://www.w3.org/2000/svg">
          {/* Page background */}
          <rect width="380" height="490" fill="#FAFAF8" />

          {/* Left accent bar (changes color) */}
          <rect x="0" y="0" width="4" height="490" fill={accent} opacity="0.35" style={{ transition: "fill 0.6s ease" }} />

          {/* Header */}
          <rect x="22" y="24" width="140" height="16" rx="3" fill={accent} opacity="0.85" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="44" width="100" height="6" rx="1.5" fill="#888" opacity="0.5" />
          <rect x="22" y="56" width="280" height="2.5" rx="1" fill="#ccc" opacity="0.6" />
          {/* Contact line */}
          {[0, 80, 160, 230].map((x, i) => (
            <rect key={i} x={22 + x} y="64" width={[60, 70, 60, 80][i]} height="2" rx="1" fill="#999" opacity="0.35" />
          ))}

          {/* Summary lines */}
          <rect x="22" y="80" width="336" height="2" rx="1" fill="#ccc" opacity="0.3" />
          {[88, 94, 100].map((y, i) => (
            <rect key={y} x="22" y={y} width={[336, 280, 310][i]} height="1.8" rx="1" fill="#888" opacity="0.2" />
          ))}

          {/* Section: Experience */}
          <rect x="22" y="118" width="60" height="5" rx="1.5" fill={accent} opacity="0.7" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="126" width="336" height="0.75" fill={accent} opacity="0.25" style={{ transition: "fill 0.6s ease" }} />

          {/* Job 1 */}
          <rect x="22" y="134" width="120" height="6" rx="1.5" fill="#333" opacity="0.6" />
          <rect x="22" y="144" width="90" height="3" rx="1" fill="#888" opacity="0.4" />
          {[152, 158, 164].map((y, i) => (
            <rect key={y} x="28" y={y} width={[308, 280, 295][i]} height="2" rx="1" fill="#888" opacity="0.18" />
          ))}

          {/* Job 2 */}
          <rect x="22" y="178" width="110" height="6" rx="1.5" fill="#333" opacity="0.5" />
          <rect x="22" y="188" width="80" height="3" rx="1" fill="#888" opacity="0.35" />
          {[196, 202, 208].map((y, i) => (
            <rect key={y} x="28" y={y} width={[295, 270, 285][i]} height="2" rx="1" fill="#888" opacity="0.15" />
          ))}

          {/* Job 3 */}
          <rect x="22" y="222" width="100" height="6" rx="1.5" fill="#333" opacity="0.4" />
          <rect x="22" y="232" width="75" height="3" rx="1" fill="#888" opacity="0.3" />
          {[240, 246].map((y, i) => (
            <rect key={y} x="28" y={y} width={[280, 260][i]} height="2" rx="1" fill="#888" opacity="0.13" />
          ))}

          {/* Section: Skills */}
          <rect x="22" y="266" width="40" height="5" rx="1.5" fill={accent} opacity="0.7" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="274" width="336" height="0.75" fill={accent} opacity="0.25" style={{ transition: "fill 0.6s ease" }} />

          {/* Skill chips */}
          {[[0, 50], [58, 70], [136, 60], [204, 55], [0, 45], [53, 65], [126, 58]].map(([x, w], i) => (
            <g key={i}>
              <rect x={22 + x} y={i < 4 ? 282 : 298} width={w} height="10" rx="5"
                fill={accent} opacity="0.1" style={{ transition: "fill 0.6s ease" }} />
              <rect x={26 + x} y={i < 4 ? 285 : 301} width={w - 8} height="4" rx="1"
                fill={accent} opacity="0.3" style={{ transition: "fill 0.6s ease" }} />
            </g>
          ))}

          {/* Section: Education */}
          <rect x="22" y="324" width="55" height="5" rx="1.5" fill={accent} opacity="0.7" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="332" width="336" height="0.75" fill={accent} opacity="0.25" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="340" width="130" height="6" rx="1.5" fill="#333" opacity="0.5" />
          <rect x="22" y="350" width="100" height="3" rx="1" fill="#888" opacity="0.35" />

          {/* Section: Projects */}
          <rect x="22" y="372" width="50" height="5" rx="1.5" fill={accent} opacity="0.7" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="380" width="336" height="0.75" fill={accent} opacity="0.25" style={{ transition: "fill 0.6s ease" }} />
          <rect x="22" y="388" width="110" height="6" rx="1.5" fill="#333" opacity="0.5" />
          {[398, 404, 410].map((y, i) => (
            <rect key={y} x="28" y={y} width={[308, 280, 295][i]} height="2" rx="1" fill="#888" opacity="0.15" />
          ))}

          {/* ATS Badge overlay */}
          <rect x="280" y="24" width="80" height="22" rx="11" fill="#0D1A12" />
          <rect x="285" y="29" width="70" height="12" rx="6" fill="#16A34A" opacity="0.15" />
          <circle cx="294" cy="35" r="3.5" fill="#4ADE80" />
          <rect x="302" y="32" width="52" height="3" rx="1.5" fill="#4ADE80" opacity="0.8" />
          <rect x="302" y="38" width="36" height="2" rx="1" fill="#4ADE80" opacity="0.4" />

          {/* Score ring */}
          <circle cx="346" cy="460" r="20" fill="none" stroke="#1A1A1A" strokeWidth="3" />
          <circle cx="346" cy="460" r="20" fill="none" stroke={accent} strokeWidth="3"
            strokeDasharray="100 26" strokeLinecap="round" strokeDashoffset="32"
            style={{ transition: "stroke 0.6s ease" }} />
          <text x="346" y="464" textAnchor="middle" fontSize="8" fontWeight="700" fill={accent}
            style={{ transition: "fill 0.6s ease", fontFamily: "sans-serif" }}>92%</text>

          {/* Color picker dots */}
          {ACCENT_COLORS.map((c, i) => (
            <circle key={i} cx={22 + i * 14} cy={470} r={accentIdx === i ? 5 : 4}
              fill={c} opacity={accentIdx === i ? 1 : 0.4}
              style={{ transition: "all 0.3s" }} />
          ))}
        </svg>
      </div>

      {/* Floating label */}
      <div style={{
        position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)",
        background: "#111", border: "1px solid #222", borderRadius: 20, padding: "5px 14px",
        fontSize: 11, fontWeight: 600, color: "#555", whiteSpace: "nowrap",
        fontFamily: "'Outfit', sans-serif",
      }}>
        Live style preview
      </div>
    </div>
  );
}

export function HeroSection() {
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
      minHeight: "100vh",
      background: "#080808",
      display: "flex", alignItems: "center",
      padding: "80px 40px 60px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grid texture */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        pointerEvents: "none",
      }} />
      {/* Radial vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,245,90,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: 1200, margin: "0 auto", width: "100%",
        display: "flex", alignItems: "center", gap: 80,
      }}>
        {/* Left: copy */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(200,245,90,0.08)", border: "1px solid rgba(200,245,90,0.2)",
            borderRadius: 24, padding: "5px 14px", marginBottom: 28,
            fontSize: 11, fontWeight: 700, color: "#C8F55A",
            letterSpacing: "0.8px", textTransform: "uppercase",
            fontFamily: "'Outfit', sans-serif",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8F55A", flexShrink: 0 }} />
            Resume Templates
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(44px, 5.5vw, 72px)",
            fontWeight: 300,
            lineHeight: 1.06,
            letterSpacing: "-2.5px",
            color: "#F0EFE8",
            margin: "0 0 24px",
          }}>
            Resumes that<br />
            pass the scan,<br />
            <em style={{ fontStyle: "italic", color: "#C8F55A" }}>land the call.</em>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 16, color: "#555", lineHeight: 1.7, maxWidth: 480,
            marginBottom: 36, fontFamily: "'Outfit', sans-serif", fontWeight: 300,
          }}>
            Build your resume with clean templates and style every detail — colors, fonts, spacing — exactly how you want.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
            {[
              "✓ Clean Template Layouts",
              "✓ Live Preview",
              "✓ Full Style Control",
            ].map(f => (
              <div key={f} style={{
                fontSize: 12, fontWeight: 600, color: "#555",
                background: "#111", border: "1px solid #1E1E1E",
                padding: "6px 14px", borderRadius: 20,
                fontFamily: "'Outfit', sans-serif",
              }}>
                {f}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              to="/templates"
              style={{
                padding: "13px 28px", borderRadius: 10, border: "none",
                background: "#C8F55A", color: "#0E0E0E", fontSize: 14, fontWeight: 800,
                textDecoration: "none", display: "inline-block", transition: "opacity 0.15s",
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Browse Templates →
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                style={{
                  padding: "13px 28px", borderRadius: 10,
                  border: "1px solid #252525", background: "transparent",
                  color: "#777", fontSize: 14, fontWeight: 600,
                  textDecoration: "none", display: "inline-block", transition: "all 0.15s",
                  fontFamily: "'Outfit', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#777"; }}
              >
                Log In
              </Link>
            )}
          </div>
        </div>

        {/* Right: animated mockup */}
        <div style={{ flexShrink: 0, width: 420, display: "flex", justifyContent: "center" }}>
          <LiveMockup />
        </div>
      </div>
    </section>
  );
}
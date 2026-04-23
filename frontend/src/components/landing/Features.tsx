import { useEffect, useState } from "react";

// ─── FeaturesSection.tsx ──────────────────────────────────────────────────────
// Only 3 features — exactly what the product delivers:
//   1. Template rendering
//   2. Live preview
//   3. Full style customization

const FEATURES = [
  {
    number: "01",
    title: "Template Rendering",
    body: "Every template is built as real HTML and reusable layout components, so your resume stays consistent across browser preview and export.",
    accent: "#C8F55A",
    visual: (
      <svg viewBox="0 0 320 200" width="100%" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="200" fill="#0A0A0A" rx="10" />
        {/* Two resume columns */}
        {/* Left: image-based (bad) */}
        <rect x="20" y="20" width="120" height="160" rx="6" fill="#141414" />
        <rect x="28" y="30" width="104" height="140" rx="4" fill="#1A1A1A" />
        <rect x="36" y="38" width="60" height="8" rx="2" fill="#333" />
        {[50, 58, 66, 74, 82, 90, 98, 106, 114, 122, 130, 138, 146, 154].map((y, i) => (
          <rect key={y} x="36" y={y} width={[80, 70, 75, 65, 80, 70, 75, 65, 70, 75, 65, 80, 60, 70][i]} height="3" rx="1" fill="#252525" />
        ))}
        {/* Big X overlay */}
        <line x1="28" y1="28" x2="124" y2="164" stroke="#E24B4A" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="124" y1="28" x2="28" y2="164" stroke="#E24B4A" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="40" y="160" width="64" height="12" rx="6" fill="#1A0000" />
        <text x="72" y="169" textAnchor="middle" fontSize="7" fill="#F87171" fontWeight="700" fontFamily="sans-serif">IMAGE BASED</text>

        {/* Right: real HTML (good) */}
        <rect x="180" y="20" width="120" height="160" rx="6" fill="#0D1A12" />
        <rect x="188" y="30" width="104" height="140" rx="4" fill="#111811" />
        <rect x="188" y="30" width="3" height="140" fill="#4ADE80" opacity="0.5" rx="1.5" />
        <rect x="196" y="38" width="60" height="8" rx="2" fill="#4ADE80" opacity="0.6" />
        {[50, 58, 66, 74, 82, 90, 98, 106, 114, 122, 130, 138, 146, 154].map((y, i) => (
          <rect key={y} x="196" y={y} width={[80, 70, 75, 65, 80, 70, 75, 65, 70, 75, 65, 80, 60, 70][i]} height="3" rx="1" fill="#1A3A24" />
        ))}
        {/* Check overlay */}
        <circle cx="278" cy="96" r="18" fill="#0D1A12" />
        <path d="M268 96 L275 103 L290 88" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="196" y="160" width="84" height="12" rx="6" fill="#0D1A12" />
        <text x="238" y="169" textAnchor="middle" fontSize="7" fill="#4ADE80" fontWeight="700" fontFamily="sans-serif">REAL HTML TEXT</text>

        {/* Label in middle */}
        <text x="160" y="106" textAnchor="middle" fontSize="9" fill="#333" fontWeight="700" fontFamily="sans-serif">VS</text>
      </svg>
    ),
  },
  {
    number: "02",
    title: "Live Preview",
    body: "As you fill in your resume, the preview updates instantly. See layout, spacing, and typography changes before you export.",
    accent: "#4ADE80",
    visual: (
      <svg viewBox="0 0 320 200" width="100%" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="200" fill="#0A0A0A" rx="10" />
        {/* Score ring */}
        <circle cx="90" cy="100" r="60" fill="none" stroke="#1A1A1A" strokeWidth="10" />
        <circle cx="90" cy="100" r="60" fill="none" stroke="#4ADE80" strokeWidth="10"
          strokeDasharray="302 376" strokeLinecap="round" strokeDashoffset="94" />
        <text x="90" y="95" textAnchor="middle" fontSize="26" fontWeight="800" fill="#F0EFE8" fontFamily="sans-serif">92</text>
        <text x="90" y="113" textAnchor="middle" fontSize="11" fontWeight="500" fill="#4ADE80" fontFamily="sans-serif">Live Preview</text>

        {/* Breakdown bars */}
        {[
          { label: "Contact Info", pct: 100, y: 40 },
          { label: "Experience",  pct: 100, y: 70 },
          { label: "Education",   pct: 100, y: 100 },
          { label: "Skills",      pct: 80,  y: 130 },
          { label: "Summary",     pct: 60,  y: 160 },
        ].map(({ label, pct, y }) => {
          const col = pct === 100 ? "#4ADE80" : pct >= 70 ? "#F59E0B" : "#F87171";
          return (
            <g key={label}>
              <text x="170" y={y + 4} fontSize="8.5" fill="#555" fontFamily="sans-serif">{label}</text>
              <rect x="230" y={y - 4} width="78" height="8" rx="4" fill="#1A1A1A" />
              <rect x="230" y={y - 4} width={78 * pct / 100} height="8" rx="4" fill={col} opacity="0.8" />
              <text x="312" y={y + 4} fontSize="8" fill={col} fontWeight="700" fontFamily="sans-serif" textAnchor="end">{pct}%</text>
            </g>
          );
        })}
      </svg>
    ),
  },
  {
    number: "03",
    title: "Full Style Control",
    body: "Change accent colors, fonts, line spacing, page margins, section order, bullet styles, and header alignment. Your resume, exactly how you want it.",
    accent: "#818CF8",
    visual: (
      <svg viewBox="0 0 320 200" width="100%" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="200" fill="#0A0A0A" rx="10" />
        {/* Mini resume preview */}
        <rect x="20" y="20" width="130" height="160" rx="6" fill="#FAF8F5" />
        <rect x="20" y="20" width="4" height="160" fill="#818CF8" rx="2" />
        <rect x="30" y="30" width="80" height="9" rx="2" fill="#1a1a1a" opacity="0.75" />
        <rect x="30" y="44" width="110" height="2" rx="1" fill="#818CF8" opacity="0.3" />
        {[50, 57, 64, 74, 82, 90, 100, 108, 116, 126, 134, 142, 154, 162].map((y, i) => (
          <rect key={y} x="30" y={y} width={[108, 90, 100, 108, 85, 98, 108, 90, 98, 108, 85, 95, 108, 88][i]} height="2" rx="1" fill="#888" opacity="0.25" />
        ))}

        {/* Style panel */}
        <rect x="170" y="20" width="130" height="160" rx="8" fill="#111" />
        <rect x="178" y="30" width="114" height="14" rx="4" fill="#1A1A1A" />
        <text x="185" y="41" fontSize="8" fill="#555" fontFamily="sans-serif" fontWeight="700">STYLE PANEL</text>

        {/* Color swatches */}
        <text x="178" y="60" fontSize="7.5" fill="#444" fontFamily="sans-serif">Accent Color</text>
        {["#818CF8", "#4ADE80", "#F59E0B", "#F87171", "#0F766E", "#1B2B4B"].map((c, i) => (
          <rect key={c} x={178 + i * 18} y="64" width="14" height="14" rx="4"
            fill={c} opacity={i === 0 ? 1 : 0.6}
            stroke={i === 0 ? "#fff" : "none"} strokeWidth="1.5" />
        ))}

        {/* Font selector */}
        <text x="178" y="96" fontSize="7.5" fill="#444" fontFamily="sans-serif">Font Family</text>
        <rect x="178" y="100" width="114" height="14" rx="4" fill="#1A1A1A" />
        <text x="185" y="110" fontSize="7.5" fill="#888" fontFamily="sans-serif">Lora, serif</text>
        <text x="282" y="110" fontSize="9" fill="#555" fontFamily="sans-serif">▾</text>

        {/* Spacing toggle */}
        <text x="178" y="128" fontSize="7.5" fill="#444" fontFamily="sans-serif">Line Height</text>
        {["1.4", "1.5", "1.6"].map((v, i) => (
          <g key={v}>
            <rect x={178 + i * 38} y="132" width="34" height="12" rx="4"
              fill={i === 1 ? "#818CF8" : "#1A1A1A"} opacity={i === 1 ? 0.8 : 1} />
            <text x={195 + i * 38} y="141" textAnchor="middle" fontSize="7.5"
              fill={i === 1 ? "#F0EFE8" : "#555"} fontFamily="sans-serif">{v}</text>
          </g>
        ))}

        {/* Bullet style */}
        <text x="178" y="160" fontSize="7.5" fill="#444" fontFamily="sans-serif">Bullet Style</text>
        {["•", "–", "›", "▸"].map((b, i) => (
          <g key={b}>
            <rect x={178 + i * 28} y="164" width="24" height="12" rx="4"
              fill={i === 0 ? "#818CF8" : "#1A1A1A"} opacity={i === 0 ? 0.8 : 1} />
            <text x={190 + i * 28} y="173" textAnchor="middle" fontSize="9"
              fill={i === 0 ? "#F0EFE8" : "#555"} fontFamily="sans-serif">{b}</text>
          </g>
        ))}

        {/* Arrow connecting panel to resume */}
        <path d="M170 100 L155 100" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="3 2" fill="none" markerEnd="url(#arr)" opacity="0.5" />
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M1 1 L6 4 L1 7" fill="none" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
          </marker>
        </defs>
      </svg>
    ),
  },
] as const;

export function FeaturesSection() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 1024);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <section style={{
      background: "#080808",
      padding: isMobile ? "72px 16px" : "100px 40px",
      borderTop: "1px solid #111",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ marginBottom: 64, maxWidth: 540 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "2px",
            textTransform: "uppercase", marginBottom: 16, fontFamily: "'Outfit', sans-serif",
          }}>
            What You Get
          </div>
          <h2 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(32px, 3.5vw, 48px)",
            fontWeight: 300, letterSpacing: "-1.5px", color: "#F0EFE8", margin: 0, lineHeight: 1.1,
          }}>
            Three things, done right.
          </h2>
        </div>

        {/* Feature cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {FEATURES.map((feat, i) => (
            <div
              key={feat.number}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "64px 1fr 360px",
                gap: isMobile ? 16 : 40,
                alignItems: "center",
                padding: isMobile ? "20px 14px" : "48px 32px",
                borderRadius: 16,
                background: hovered === i ? "#0D0D0D" : "transparent",
                border: `1px solid ${hovered === i ? "#1E1E1E" : "transparent"}`,
                transition: "all 0.25s ease",
                cursor: "default",
              }}
            >
              {/* Number */}
              <div style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 36, fontWeight: 300, color: "#1E1E1E",
                lineHeight: 1, userSelect: "none",
                transition: "color 0.25s",
                display: isMobile ? "none" : "block",
                ...(hovered === i ? { color: feat.accent } : {}),
              }}>
                {feat.number}
              </div>

              {/* Text */}
              <div>
                <h3 style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 22, fontWeight: 700, color: "#F0EFE8",
                  margin: "0 0 14px", letterSpacing: "-0.3px",
                }}>
                  {feat.title}
                </h3>
                <p style={{
                  fontSize: 15, color: "#555", lineHeight: 1.65,
                  margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 300,
                  maxWidth: 460,
                }}>
                  {feat.body}
                </p>
              </div>

              {/* Visual */}
              <div style={{
                borderRadius: 12, overflow: "hidden",
                border: "1px solid #1A1A1A",
                opacity: hovered === i ? 1 : 0.6,
                transition: "opacity 0.25s",
                transform: hovered === i ? "scale(1.01)" : "scale(1)",
              }}>
                {feat.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
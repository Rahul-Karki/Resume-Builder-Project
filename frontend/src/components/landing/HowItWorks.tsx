import { useEffect, useState } from "react";

// ─── HowItWorks.tsx ───────────────────────────────────────────────────────────
// Three-step process: Pick Template → Fill Details → Download
// Clean numbered layout with connector lines

const STEPS = [
  {
    num: "1",
    title: "Pick a template",
    body: "Browse the available templates. Each one is built as real HTML for consistent browser and PDF output.",
    icon: (
      <svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="6" width="22" height="28" rx="3" fill="#1A1A1A" stroke="#2A2A2A" strokeWidth="1" />
        <rect x="8" y="6" width="2" height="28" rx="1" fill="#C8F55A" opacity="0.5" />
        <rect x="13" y="12" width="12" height="2.5" rx="1" fill="#C8F55A" opacity="0.6" />
        <rect x="13" y="17" width="14" height="1.5" rx="1" fill="#333" />
        <rect x="13" y="21" width="12" height="1.5" rx="1" fill="#333" />
        <rect x="13" y="25" width="13" height="1.5" rx="1" fill="#333" />
        <rect x="20" y="10" width="18" height="24" rx="3" fill="#222" stroke="#2A2A2A" strokeWidth="1" />
        <rect x="24" y="15" width="10" height="2.5" rx="1" fill="#4ADE80" opacity="0.7" />
        <rect x="24" y="20" width="11" height="1.5" rx="1" fill="#333" />
        <rect x="24" y="24" width="9" height="1.5" rx="1" fill="#333" />
        <rect x="36" y="34" width="10" height="10" rx="5" fill="#C8F55A" />
        <path d="M38 39 L40 41 L44 37" stroke="#0E0E0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "2",
    title: "Fill in your details",
    body: "Type your experience, education, and skills. Every change appears in the live preview instantly. Adjust colors, fonts, and spacing to match your style.",
    icon: (
      <svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="24" height="32" rx="3" fill="#1A1A1A" stroke="#2A2A2A" strokeWidth="1" />
        <rect x="4" y="8" width="2" height="32" rx="1" fill="#C8F55A" opacity="0.4" />
        <rect x="9" y="13" width="8" height="2.5" rx="1" fill="#C8F55A" opacity="0.7" />
        <rect x="9" y="19" width="16" height="1.5" rx="1" fill="#252525" />
        <rect x="9" y="23" width="14" height="1.5" rx="1" fill="#252525" />
        <rect x="9" y="27" width="15" height="1.5" rx="1" fill="#252525" />
        <rect x="9" y="33" width="16" height="1.5" rx="1" fill="#252525" />
        {/* Blinking cursor effect */}
        <rect x="9" y="37" width="8" height="1.5" rx="1" fill="#252525" />
        <rect x="17.5" y="37" width="1.5" height="1.5" rx="0.75" fill="#C8F55A" opacity="0.9" />
        {/* Style panel */}
        <rect x="30" y="14" width="16" height="22" rx="4" fill="#111" stroke="#1E1E1E" strokeWidth="1" />
        {["#C8F55A", "#818CF8", "#F87171", "#F59E0B"].map((c, i) => (
          <rect key={c} x={32 + (i % 2) * 6} y={18 + Math.floor(i / 2) * 6} width="4" height="4" rx="2" fill={c} opacity="0.8" />
        ))}
        <rect x="32" y="32" width="12" height="2" rx="1" fill="#1E1E1E" />
        <rect x="32" y="32" width="8" height="2" rx="1" fill="#C8F55A" opacity="0.5" />
      </svg>
    ),
  },
  {
    num: "3",
    title: "Download your resume",
    body: "Save your resume to your account when you’re ready, then export it as a PDF.",
    icon: (
      <svg viewBox="0 0 48 48" width="48" height="48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="22" r="14" fill="none" stroke="#1A1A1A" strokeWidth="3" />
        <circle cx="22" cy="22" r="14" fill="none" stroke="#4ADE80" strokeWidth="3"
          strokeDasharray="66 88" strokeLinecap="round" strokeDashoffset="22" />
        <text x="22" y="25" textAnchor="middle" fontSize="9" fontWeight="800" fill="#F0EFE8" fontFamily="sans-serif">92%</text>
        <rect x="32" y="32" width="14" height="14" rx="4" fill="#C8F55A" />
        <path d="M35 39 L39 43 M39 43 L43 38" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 36 L39 43" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

export function HowItWorks() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 1024);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <section style={{
      background: "#060606",
      padding: isMobile ? "72px 16px" : "100px 40px",
      borderTop: "1px solid #111",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 72, textAlign: "center" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "2px",
            textTransform: "uppercase", marginBottom: 14, fontFamily: "'Outfit', sans-serif",
          }}>
            How It Works
          </div>
          <h2 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(30px, 3vw, 44px)",
            fontWeight: 300, letterSpacing: "-1.2px", color: "#F0EFE8",
            margin: 0, lineHeight: 1.1,
          }}>
            Three steps to a resume<br />
            <em style={{ fontStyle: "italic", color: "#C8F55A" }}>that gets read.</em>
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 40px 1fr 40px 1fr", alignItems: "start", gap: 0 }}>
          {STEPS.map((step, i) => (
            <>
              <div
                key={step.num}
                style={{
                  background: "#0D0D0D",
                  border: "1px solid #1A1A1A",
                  borderRadius: 16,
                  padding: "32px 28px",
                  position: "relative",
                }}
              >
                {/* Step number */}
                <div style={{
                  position: "absolute", top: -14, left: 24,
                  background: "#080808", border: "1px solid #1A1A1A",
                  borderRadius: 20, padding: "2px 12px",
                  fontSize: 11, fontWeight: 800, color: "#C8F55A",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  Step {step.num}
                </div>

                {/* Icon */}
                <div style={{ marginBottom: 18 }}>{step.icon}</div>

                {/* Text */}
                <h3 style={{
                  fontSize: 17, fontWeight: 700, color: "#F0EFE8",
                  margin: "0 0 10px", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.2px",
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: 13.5, color: "#555", lineHeight: 1.6,
                  margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 300,
                }}>
                  {step.body}
                </p>
              </div>

              {/* Connector arrow (between steps) */}
              {i < 2 && (
                <div key={`arrow-${i}`} style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  height: isMobile ? 42 : 120, color: "#252525", fontSize: 20,
                  fontFamily: "sans-serif",
                }}>
                  {isMobile ? "↓" : "→"}
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </section>
  );
}
import { useEffect, useState, useRef } from "react";
import { JSX } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";

// ─── TemplatesPreview.tsx ─────────────────────────────────────────────────────
// Horizontal-scrolling carousel of all templates.
// Each card shows the SVG thumbnail, template name, category, and a CTA.

type LandingTemplate = {
  id: string;
  name: string;
  tag: string;
  category: string;
  accent: string;
  primary: string;
  secondary: string;
  desc: string;
};

const FALLBACK_TEMPLATES: LandingTemplate[] = [
  {
    id: "classic", name: "Classic", tag: "Timeless", category: "Professional",
    accent: "#1a1a1a", bg: "#FAF8F5", primary: "#1a1a1a", secondary: "#555",
    desc: "Trusted serif layout for finance, law & academia.",
  },
  {
    id: "executive", name: "Executive", tag: "Corporate", category: "Leadership",
    accent: "#1B2B4B", bg: "#EEF1F7", primary: "#1B2B4B", secondary: "#3A5A8A",
    desc: "Navy header with strong hierarchy for leadership roles.",
  },
  {
    id: "modern", name: "Modern", tag: "Tech-Ready", category: "Technical",
    accent: "#0F766E", bg: "#F0FDFB", primary: "#0F766E", secondary: "#134E4A",
    desc: "Teal accent rule and skill chips for tech roles.",
  },
  {
    id: "compact", name: "Compact", tag: "One-Page", category: "Senior",
    accent: "#111111", bg: "#F8F8F8", primary: "#111", secondary: "#444",
    desc: "Dense label-column layout for senior candidates.",
  },
  {
    id: "sidebar", name: "Sidebar", tag: "Structured", category: "Creative",
    accent: "#1E293B", bg: "#fff", primary: "#1E293B", secondary: "#94A3B8",
    desc: "Dark sidebar with two-column structure.",
  },
];

// ─── SVG thumbnails (one per template) ────────────────────────────────────────

function ClassicThumb({ p, s }: { p: string; s: string }) {
  return (
    <>
      <rect width="240" height="310" fill="#FAF8F5" />
      <rect x="20" y="18" width="88" height="11" rx="2" fill={p} opacity="0.85" />
      <rect x="20" y="33" width="155" height="2" rx="1" fill={s} opacity="0.4" />
      <rect x="20" y="42" width="200" height="1.5" fill={p} opacity="0.7" />
      {[50, 57, 64].map((y, i) => <rect key={y} x="20" y={y} width={[200, 175, 185][i]} height="2" rx="1" fill={p} opacity="0.11" />)}
      {[78, 112, 150, 188, 224].map((y, si) => (
        <g key={y}>
          <rect x="20" y={y} width="48" height="4" rx="1.5" fill={p} opacity="0.48" />
          <rect x="20" y={y + 6} width="200" height="0.75" fill={s} opacity="0.3" />
          {[0, 1, 2].map(li => <rect key={li} x="24" y={y + 10 + li * 7} width={[200, 172, 184][li]} height="2" rx="1" fill={p} opacity={si === 0 ? 0.14 : 0.10} />)}
        </g>
      ))}
    </>
  );
}

function ExecutiveThumb({ p, s }: { p: string; s: string }) {
  return (
    <>
      <rect width="240" height="310" fill="#EEF1F7" />
      <rect x="0" y="0" width="240" height="58" fill={p} />
      <rect x="17" y="11" width="108" height="13" rx="2" fill="#F1F5F9" opacity="0.9" />
      <rect x="17" y="28" width="78" height="2.5" rx="1" fill="#A8BDD8" opacity="0.7" />
      <rect x="17" y="37" width="158" height="2" rx="1" fill="#A8BDD8" opacity="0.35" />
      <rect x="17" y="46" width="128" height="2" rx="1" fill="#A8BDD8" opacity="0.25" />
      {[68, 98, 128, 162, 196, 228, 256].map((y, i) => (
        <g key={y}>
          {i % 3 === 0 && <><rect x="17" y={y} width="48" height="4" rx="1.5" fill={p} opacity="0.6" /><rect x="17" y={y + 6} width="204" height="0.75" fill={p} opacity="0.2" /></>}
          <rect x="17" y={y + (i % 3 === 0 ? 10 : 0)} width={[178, 153, 168, 158, 138, 163, 148][i]} height="2" rx="1" fill={p} opacity="0.13" />
          <rect x="17" y={y + (i % 3 === 0 ? 14 : 4)} width={[198, 168, 183, 173, 156, 178, 163][i]} height="2" rx="1" fill={p} opacity="0.10" />
        </g>
      ))}
    </>
  );
}

function ModernThumb({ p, s }: { p: string; s: string }) {
  return (
    <>
      <rect width="240" height="310" fill="#F0FDFB" />
      <rect x="0" y="0" width="4" height="310" fill={p} opacity="0.3" />
      <rect x="13" y="13" width="98" height="13" rx="2" fill="#0F1A14" opacity="0.8" />
      <rect x="13" y="30" width="68" height="3" rx="1" fill={s} opacity="0.45" />
      <rect x="13" y="38" width="178" height="2" rx="1" fill={p} opacity="0.14" />
      {[56, 90, 130, 170, 206, 244].map((y, i) => (
        <g key={y}>
          <rect x="7" y={y} width="3" height={i < 5 ? 34 : 20} rx="1.5" fill={p} opacity="0.35" />
          <rect x="13" y={y} width="44" height="4" rx="1.5" fill={p} opacity="0.65" />
          <rect x="13" y={y + 8} width={[178, 163, 168, 153, 158, 138][i]} height="2" rx="1" fill={s} opacity="0.17" />
          <rect x="13" y={y + 13} width={[198, 173, 183, 163, 173, 153][i]} height="2" rx="1" fill={s} opacity="0.12" />
          {i === 3 && [0, 1, 2, 3].map(ci => (
            <rect key={ci} x={13 + ci * 36} y={y + 22} width="32" height="7" rx="3.5" fill={p} opacity="0.1" />
          ))}
        </g>
      ))}
    </>
  );
}

function CompactThumb({ p, s }: { p: string; s: string }) {
  return (
    <>
      <rect width="240" height="310" fill="#F8F8F8" />
      <rect x="17" y="15" width="88" height="11" rx="2" fill={p} opacity="0.8" />
      <rect x="17" y="30" width="158" height="1.8" rx="1" fill={s} opacity="0.4" />
      <rect x="17" y="39" width="204" height="0.75" fill={p} opacity="0.6" />
      {[48, 66, 84, 102, 120, 138, 156, 174, 192, 210, 228, 246, 264].map((y, i) => (
        <g key={y}>
          <rect x="17" y={y} width="68" height="2" rx="1" fill={s} opacity="0.42" />
          <rect x="98" y={y} width={[110, 98, 106, 93, 108, 98, 103, 93, 106, 98, 104, 96, 102][i]} height="2" rx="1" fill={p} opacity="0.14" />
          <rect x="98" y={y + 5} width={[118, 106, 113, 100, 116, 106, 110, 98, 114, 106, 111, 101, 108][i]} height="1.5" rx="1" fill={p} opacity="0.09" />
        </g>
      ))}
    </>
  );
}

function SidebarThumb({ p, s }: { p: string; s: string }) {
  const sw = 74;
  return (
    <>
      <rect width="240" height="310" fill="#fff" />
      <rect x="0" y="0" width={sw} height="310" fill="#1E293B" />
      <rect x="9" y="14" width={sw - 18} height={sw - 18} rx={(sw - 18) / 2} fill="#334155" />
      <rect x="9" y={sw - 4} width={sw - 18} height="5" rx="2" fill="#CBD5E1" opacity="0.7" />
      <rect x="13" y={sw + 5} width={sw - 26} height="3" rx="1.5" fill="#94A3B8" opacity="0.5" />
      {[sw + 16, sw + 54, sw + 94, sw + 140].map(y => (
        <g key={y}>
          <rect x="9" y={y - 2} width={sw - 18} height="0.75" fill="#334155" />
          {[0, 1, 2, 3].map(li => <rect key={li} x="9" y={y + li * 8} width={28 + li * 4} height="2.5" rx="1.5" fill="#475569" opacity="0.52" />)}
        </g>
      ))}
      {[0, 1, 2, 3, 4, 5].map(ci => (
        <rect key={ci} x={9 + (ci % 3) * 22} y={sw + 118 + Math.floor(ci / 3) * 11} width="18" height="7" rx="3.5" fill="#334155" />
      ))}
      <rect x={sw + 11} y="15" width="133" height="9" rx="2" fill="#1E293B" opacity="0.72" />
      <rect x={sw + 11} y="27" width="98" height="3" rx="1.5" fill="#475569" opacity="0.38" />
      {[43, 86, 144, 206, 256].map(y => (
        <g key={y}>
          <rect x={sw + 11} y={y} width="58" height="5.5" rx="1.5" fill="#1E293B" opacity="0.62" />
          <rect x={sw + 11} y={y + 7} width={240 - sw - 22} height="0.75" fill="#1E293B" opacity="0.18" />
          {[0, 1, 2, 3].map(li => <rect key={li} x={sw + 11} y={y + 10 + li * 8} width={240 - sw - 34} height="2" rx="1" fill="#334155" opacity="0.16" />)}
        </g>
      ))}
    </>
  );
}

const THUMB_MAP: Record<string, (p: string, s: string) => JSX.Element> = {
  classic:   (p, s) => <ClassicThumb   p={p} s={s} />,
  executive: (p, s) => <ExecutiveThumb p={p} s={s} />,
  modern:    (p, s) => <ModernThumb    p={p} s={s} />,
  compact:   (p, s) => <CompactThumb   p={p} s={s} />,
  sidebar:   (p, s) => <SidebarThumb   p={p} s={s} />,
};

const renderThumb = (id: string, primary: string, secondary: string) => {
  const renderer = THUMB_MAP[id] ?? THUMB_MAP.classic;
  return renderer(primary, secondary);
};

export function TemplatesPreview() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [templates, setTemplates] = useState<LandingTemplate[]>(FALLBACK_TEMPLATES);
  const [isMobile, setIsMobile] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const templateCountLabel = `${templates.length} ${templates.length === 1 ? "layout" : "layouts"}`;

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 900);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchTemplates = async () => {
      try {
        const response = await api.get("/templates");
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];

        const mapped: LandingTemplate[] = rows.map((row: any) => {
          const accent = row.cssVars?.accentColor ?? "#1a1a1a";
          return {
            id: String(row.layoutId ?? "classic"),
            name: String(row.name ?? "Template"),
            tag: String(row.tag ?? "General"),
            category: String(row.category ?? "Professional"),
            accent,
            primary: row.cssVars?.headingColor ?? accent,
            secondary: row.cssVars?.mutedColor ?? row.cssVars?.textColor ?? "#555",
            desc: String(row.description ?? "Clean resume template."),
          };
        });

        if (!mounted || mapped.length === 0) return;
        setTemplates(mapped);
      } catch {
        // Keep fallback templates when API is unavailable.
      }
    };

    void fetchTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
  };

  return (
    <section style={{
      background: "#080808",
      padding: isMobile ? "72px 0" : "100px 0",
      borderTop: "1px solid #111",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: "0 auto 52px", padding: isMobile ? "0 16px" : "0 40px", display: "flex", alignItems: isMobile ? "stretch" : "flex-end", justifyContent: "space-between", gap: 20, flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#333", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14, fontFamily: "'Outfit', sans-serif" }}>
            Templates
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(30px, 3vw, 44px)", fontWeight: 300, letterSpacing: "-1.2px", color: "#F0EFE8", margin: 0, lineHeight: 1.1 }}>
            {templateCountLabel}. Every one<br />
            <em style={{ fontStyle: "italic", color: "#C8F55A" }}>clean and ready.</em>
          </h2>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignSelf: isMobile ? "flex-start" : "auto" }}>
          {["←", "→"].map((arrow, i) => (
            <button key={arrow} onClick={() => scroll(i === 0 ? "left" : "right")}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "1px solid #222",
                background: "#111", color: "#555", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#555"; }}
            >{arrow}</button>
          ))}
          <Link to="/templates" style={{
            padding: "0 20px", height: 40, borderRadius: 8, border: "1px solid #222",
            background: "transparent", color: "#666", fontSize: 12, fontWeight: 700,
            textDecoration: "none", display: "inline-flex", alignItems: "center",
            transition: "all 0.15s", fontFamily: "'Outfit', sans-serif",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#383838"; e.currentTarget.style.color = "#C8C7C0"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.color = "#666"; }}
          >
            View All →
          </Link>
        </div>
      </div>

      {/* Scrolling row */}
      <div
        ref={rowRef}
        style={{
          display: "flex", gap: 16,
          overflowX: "auto", overflowY: "visible",
          padding: isMobile ? "8px 16px 24px" : "8px 40px 32px",
          scrollbarWidth: "none",
          scrollSnapType: "x mandatory",
        }}
      >
        {templates.map((t, i) => {
          const isHov = hovered === t.id;
          return (
            <div
              key={t.id}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flexShrink: 0, width: 280,
                scrollSnapAlign: "start",
                background: "#111",
                border: `1.5px solid ${isHov ? t.accent : "#191919"}`,
                borderRadius: 16, overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                transform: isHov ? "translateY(-6px)" : "translateY(0)",
                boxShadow: isHov ? `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${t.accent}22` : "0 2px 12px rgba(0,0,0,0.3)",
                animationDelay: `${i * 60}ms`,
              }}
            >
              {/* Thumbnail */}
              <div style={{ height: 250, background: "#080808", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 18px" }}>
                  <div style={{
                    width: "100%", maxWidth: 200, borderRadius: 5, overflow: "hidden",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
                    transform: isHov ? "scale(1.04)" : "scale(1)", transition: "transform 0.3s ease",
                  }}>
                    <svg viewBox="0 0 240 310" style={{ width: "100%", height: "100%", display: "block" }} xmlns="http://www.w3.org/2000/svg">
                      {renderThumb(t.id, t.primary, t.secondary)}
                    </svg>
                  </div>
                </div>

                {/* Hover CTA overlay */}
                <div style={{
                  position: "absolute", inset: 0, background: isHov ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}>
                  <div style={{
                    background: t.accent, color: "#fff",
                    borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 800,
                    opacity: isHov ? 1 : 0,
                    transform: isHov ? "translateY(0) scale(1)" : "translateY(8px) scale(0.92)",
                    transition: "all 0.22s",
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                    Use This Template →
                  </div>
                </div>

                {/* Badge */}
                <div style={{
                  position: "absolute", top: 10, left: 10,
                  background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 20, padding: "3px 10px",
                  fontSize: 9.5, fontWeight: 700, color: "#4ADE80",
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", flexShrink: 0 }} />
                  Preview Ready
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "14px 16px 16px", fontFamily: "'Outfit', sans-serif" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EFE8" }}>{t.name}</span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: "#1A1A1A", color: "#555", border: "1px solid #222",
                  }}>{t.tag}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "#444", margin: 0, lineHeight: 1.45 }}>{t.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
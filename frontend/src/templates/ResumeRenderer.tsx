import React from "react";
import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";

interface Props {
  resume: ResumeDocument;
  forExport?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const nl2br = (text: string) => text;
const sectionTitle = (style: ResumeDocument["style"], label: string) => ({
  fontFamily: style.headingFont,
  fontSize: "10.5pt",
  fontWeight: 700 as const,
  color: style.accentColor,
  textTransform: "uppercase" as const,
  letterSpacing: "1.8px",
  marginBottom: "5px",
});

// ─── Classic Template ──────────────────────────────────────────────────────────
function ClassicTemplate({ resume }: Props) {
  const { personalInfo: p, sections: s, style, sectionOrder, sectionVisibility } = resume;
  const padding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];

  const SectionHeading = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        fontFamily: style.headingFont, fontSize: "11pt", fontWeight: 700,
        color: style.accentColor, letterSpacing: "1.5px", textTransform: "uppercase",
      }}>{title}</div>
      {style.showDividers && <hr style={{ border: "none", borderTop: `1px solid ${style.borderColor}`, marginTop: 3 }} />}
    </div>
  );

  const sectionMap: Record<string, React.ReactNode> = {
    experience: s.experience.length > 0 && (
      <div key="experience" style={{ marginBottom: sectionGap }}>
        <SectionHeading title="Experience" />
        {s.experience.map((e) => (
          <div key={e.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: style.fontSize, color: style.headingColor }}>{e.role}</span>
                {e.company && <><span style={{ color: style.mutedColor, margin: "0 6px" }}>—</span>
                <span style={{ fontStyle: "italic", color: style.mutedColor }}>{e.company}{e.location ? `, ${e.location}` : ""}</span></>}
              </div>
              <span style={{ fontSize: "9pt", color: style.mutedColor, whiteSpace: "nowrap" }}>
                {e.start}{(e.start || e.end) ? " – " : ""}{e.current ? "Present" : e.end}
              </span>
            </div>
            {e.bullets.filter(b => b.trim()).length > 0 && (
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {e.bullets.filter(b => b.trim()).map((b, i) => (
                  <li key={i} style={{ marginBottom: 3, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor }}>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    ),
    education: s.education.length > 0 && (
      <div key="education" style={{ marginBottom: sectionGap }}>
        <SectionHeading title="Education" />
        {s.education.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <span style={{ fontWeight: 700, color: style.headingColor }}>{e.institution}</span>
              {e.degree && <span style={{ color: style.textColor, marginLeft: 8 }}>{e.degree}{e.field ? ` ${e.field}` : ""}</span>}
            </div>
            <span style={{ fontSize: "9pt", color: style.mutedColor }}>{e.year}{e.cgpa ? ` · GPA ${e.cgpa}` : ""}</span>
          </div>
        ))}
      </div>
    ),
    skills: s.skills.length > 0 && (
      <div key="skills" style={{ marginBottom: sectionGap }}>
        <SectionHeading title="Skills" />
        {s.skills.map((sk) => (
          <div key={sk.id} style={{ display: "flex", gap: 16, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, minWidth: 100, fontSize: style.fontSize, color: style.headingColor }}>{sk.category}:</span>
            <span style={{ fontSize: style.fontSize, color: style.textColor }}>{sk.items.join(" · ")}</span>
          </div>
        ))}
      </div>
    ),
    projects: s.projects.length > 0 && (
      <div key="projects" style={{ marginBottom: sectionGap }}>
        <SectionHeading title="Projects" />
        {s.projects.map((pr) => (
          <div key={pr.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontWeight: 700, color: style.headingColor, fontSize: style.fontSize }}>{pr.name}</span>
              {pr.tech && <span style={{ fontSize: "9pt", color: style.mutedColor }}>· {pr.tech}</span>}
              {pr.link && <span style={{ fontSize: "9pt", color: style.accentColor }}>{pr.link}</span>}
            </div>
            {pr.description && <div style={{ fontSize: style.fontSize, color: style.textColor, marginTop: 2, lineHeight: style.lineHeight }}>{pr.description}</div>}
          </div>
        ))}
      </div>
    ),
    certifications: s.certifications.length > 0 && (
      <div key="certifications" style={{ marginBottom: sectionGap }}>
        <SectionHeading title="Certifications" />
        {s.certifications.map((c) => (
          <div key={c.id} style={{ fontSize: style.fontSize, color: style.textColor, marginBottom: 3 }}>
            {style.bulletStyle} <strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}
          </div>
        ))}
      </div>
    ),
    languages: s.languages.length > 0 && (
      <div key="languages" style={{ marginBottom: sectionGap }}>
        <SectionHeading title="Languages" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
          {s.languages.map((l) => (
            <span key={l.id} style={{ fontSize: style.fontSize, color: style.textColor }}>
              <strong>{l.language}</strong>{l.proficiency ? ` (${l.proficiency})` : ""}
            </span>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div style={{
      fontFamily: style.bodyFont, color: style.textColor, background: style.backgroundColor,
      padding, fontSize: style.fontSize, lineHeight: style.lineHeight,
      maxWidth: 794, margin: "0 auto", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 18, textAlign: style.headerAlign === "center" ? "center" : "left" }}>
        <h1 style={{ fontFamily: style.headingFont, fontSize: "26pt", fontWeight: 600, margin: "0 0 2px", color: style.headingColor, letterSpacing: "-0.3px" }}>
          {p.name || "Your Name"}
        </h1>
        {p.title && <div style={{ fontSize: "11pt", color: style.accentColor, fontWeight: 500, marginBottom: 6 }}>{p.title}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", fontSize: "9pt", color: style.mutedColor, justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
          {[p.email, p.phone, p.location, p.linkedin, p.portfolio].filter(Boolean).map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </div>
      </div>

      {style.showDividers && <hr style={{ border: "none", borderTop: `1.5px solid ${style.headingColor}`, marginBottom: spacingMap[style.sectionSpacing] }} />}

      {/* Summary */}
      {p.summary && (
        <div style={{ marginBottom: sectionGap, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor }}>
          {p.summary}
        </div>
      )}

      {/* Ordered Sections */}
      {sectionOrder.map((key) => sectionVisibility[key] ? sectionMap[key] : null)}
    </div>
  );
}

// ─── Template Router ───────────────────────────────────────────────────────────
// For a production app you'd import more template variants here.
// All templates receive the same ResumeDocument and apply style variables differently.
export function ResumeRenderer({ resume, forExport = false }: Props) {
  // Currently all templates use the same base renderer with style variables.
  // You can swap this for template-specific layouts:
  // if (resume.templateId === "sidebar") return <SidebarTemplate resume={resume} />;
  return <ClassicTemplate resume={resume} forExport={forExport} />;
}

export default ResumeRenderer;
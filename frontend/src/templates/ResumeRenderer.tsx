import React from "react";
import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import { CompactTemplate } from "@/components/templates/CompactTemplate";
import { ExecutiveTemplate } from "@/components/templates/ExecutiveTemplate";
import { ModernTemplate } from "@/components/templates/ModernTemplate";
import { SidebarTemplate } from "@/components/templates/SidebarTemplate";
import { ScholarlyTemplate } from "@/components/templates/ScholarlyTemplate";
import { ResearchTemplate } from "@/components/templates/ResearchTemplate";
import { renderTextWithLinks, toAbsoluteUrl } from "@/components/templates/templateHelpers";
import { normalizeResumeTemplateId } from "@/utils/resumeTemplate";

interface Props {
  resume: ResumeDocument;
  forExport?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const nl2br = (text: string) => text;
const nonEmptyBullets = (items: string[]) => items.filter((item) => item.trim());
const sectionTitle = (style: ResumeDocument["style"], label: string) => ({
  fontFamily: style.headingFont,
  fontSize: "10.5pt",
  fontWeight: 700 as const,
  color: style.accentColor,
  textTransform: "uppercase" as const,
  letterSpacing: "1.8px",
  marginBottom: "5px",
});

function GenericTemplate({ resume }: { resume: ResumeDocument }) {
  const { personalInfo: p, sections: s, style, sectionOrder, sectionVisibility } = resume;
  const padding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];

  const SectionHeading = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          fontFamily: style.headingFont,
          fontSize: "11pt",
          fontWeight: 700,
          color: style.accentColor,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {style.showDividers && <hr style={{ border: "none", borderTop: `1px solid ${style.borderColor}`, marginTop: 3 }} />}
    </div>
  );

  const renderSection = (key: keyof ResumeDocument["sections"], title: string, content: React.ReactNode) => {
    if (!sectionVisibility[key] || !content) return null;

    return (
      <div key={String(key)} style={{ marginBottom: sectionGap }}>
        <SectionHeading title={title} />
        {content}
      </div>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100%",
        background: style.backgroundColor,
        color: style.textColor,
        fontFamily: style.bodyFont,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        padding,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 18, textAlign: style.headerAlign === "center" ? "center" : "left" }}>
        {p.name && (
          <h1 style={{ fontFamily: style.headingFont, fontSize: "26pt", fontWeight: 600, margin: "0 0 2px", color: style.headingColor, letterSpacing: "-0.3px" }}>
            {p.name}
          </h1>
        )}
        {p.title && <div style={{ fontSize: "11pt", color: style.accentColor, fontWeight: 500, marginBottom: 6 }}>{p.title}</div>}
        {[p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", fontSize: "9pt", color: style.mutedColor, justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {[p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).map((value, index) => (
              <span key={index}>{value}</span>
            ))}
          </div>
        )}
      </div>

      {style.showDividers && (p.name || p.title || p.email || p.phone || p.location || p.linkedin || p.github || p.portfolio || p.summary || sectionOrder.some((key) => sectionVisibility[key])) && (
        <hr style={{ border: "none", borderTop: `1.5px solid ${style.headingColor}`, marginBottom: spacingMap[style.sectionSpacing] }} />
      )}

      {p.summary && (
        <div style={{ marginBottom: sectionGap, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor }}>
          {renderTextWithLinks(p.summary)}
        </div>
      )}

      {sectionOrder.map((key) => {
        if (key === "experience") {
          return renderSection(
            key,
            "Experience",
            s.experience.length > 0 ? (
              s.experience.map((entry) => (
                <div key={entry.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: style.fontSize, color: style.headingColor }}>{entry.role}</span>
                      {entry.company && (
                        <>
                          <span style={{ color: style.mutedColor, margin: "0 6px" }}>—</span>
                          <span style={{ fontStyle: "italic", color: style.mutedColor }}>{entry.company}{entry.location ? `, ${entry.location}` : ""}</span>
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: "9pt", color: style.mutedColor, whiteSpace: "nowrap" }}>
                      {entry.start}{(entry.start || entry.end) ? " – " : ""}{entry.current ? "Present" : entry.end}
                    </span>
                  </div>
                  {entry.contentMode === "paragraph" ? (
                    entry.description.trim() ? (
                      <div style={{ fontSize: style.fontSize, color: style.textColor, marginTop: 2, lineHeight: style.lineHeight }}>
                        {renderTextWithLinks(entry.description)}
                      </div>
                    ) : null
                  ) : nonEmptyBullets(entry.bullets).length > 0 ? (
                    <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
                      {nonEmptyBullets(entry.bullets).map((bullet, bulletIndex) => (
                        <li key={bulletIndex} style={{ marginBottom: 3, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor, display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span aria-hidden style={{ color: style.accentColor, lineHeight: style.lineHeight }}>{style.bulletStyle}</span>
                          <span>{renderTextWithLinks(bullet)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))
            ) : null,
          );
        }

        if (key === "education") {
          return renderSection(
            key,
            "Education",
            s.education.length > 0 ? (
              s.education.map((entry) => (
                <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: style.headingColor }}>{entry.institution}</span>
                    {entry.degree && <span style={{ color: style.textColor, marginLeft: 8 }}>{entry.degree}{entry.field ? ` ${entry.field}` : ""}</span>}
                  </div>
                  <span style={{ fontSize: "9pt", color: style.mutedColor }}>{entry.year}{entry.cgpa ? ` · GPA ${entry.cgpa}` : ""}</span>
                </div>
              ))
            ) : null,
          );
        }

        if (key === "skills") {
          return renderSection(
            key,
            "Skills",
            s.skills.length > 0 ? (
              s.skills.map((skillGroup) => (
                <div key={skillGroup.id} style={{ display: "flex", gap: 16, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, minWidth: 100, fontSize: style.fontSize, color: style.headingColor }}>{skillGroup.category}:</span>
                  <span style={{ fontSize: style.fontSize, color: style.textColor }}>{skillGroup.items.join(" · ")}</span>
                </div>
              ))
            ) : null,
          );
        }

        if (key === "projects") {
          return renderSection(
            key,
            "Projects",
            s.projects.length > 0 ? (
              s.projects.map((project) => (
                <div key={project.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: style.headingColor, fontSize: style.fontSize }}>{project.name}</span>
                    {project.tech && <span style={{ fontSize: "9pt", color: style.mutedColor }}>· {project.tech}</span>}
                    {project.link && <a href={toAbsoluteUrl(project.link)} target="_blank" rel="noreferrer" style={{ fontSize: "9pt", color: style.accentColor }}>{project.link}</a>}
                  </div>
                  {project.contentMode === "paragraph" ? (
                    project.description.trim() ? (
                      <div style={{ fontSize: style.fontSize, color: style.textColor, marginTop: 2, lineHeight: style.lineHeight }}>{renderTextWithLinks(project.description)}</div>
                    ) : null
                  ) : nonEmptyBullets(project.bullets).length > 0 ? (
                    <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
                      {nonEmptyBullets(project.bullets).map((bullet, bulletIndex) => (
                        <li key={bulletIndex} style={{ marginBottom: 3, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor, display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span aria-hidden style={{ color: style.accentColor, lineHeight: style.lineHeight }}>{style.bulletStyle}</span>
                          <span>{renderTextWithLinks(bullet)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))
            ) : null,
          );
        }

        if (key === "certifications") {
          return renderSection(
            key,
            "Certifications",
            s.certifications.length > 0 ? (
              s.certifications.map((certification) => (
                <div key={certification.id} style={{ fontSize: style.fontSize, color: style.textColor, marginBottom: 3 }}>
                  {style.bulletStyle} <strong>{certification.name}</strong>{certification.issuer ? ` — ${certification.issuer}` : ""}{certification.year ? ` (${certification.year})` : ""}
                </div>
              ))
            ) : null,
          );
        }

        if (key === "languages") {
          return renderSection(
            key,
            "Languages",
            s.languages.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px" }}>
                {s.languages.map((language) => (
                  <span key={language.id} style={{ fontSize: style.fontSize, color: style.textColor }}>
                    <strong>{language.language}</strong>{language.proficiency ? ` (${language.proficiency})` : ""}
                  </span>
                ))}
              </div>
            ) : null,
          );
        }

        return null;
      })}
    </div>
  );
}

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
            {e.contentMode === "paragraph" ? (
              e.description.trim() ? (
                <div style={{ fontSize: style.fontSize, color: style.textColor, marginTop: 2, lineHeight: style.lineHeight }}>{e.description}</div>
              ) : null
            ) : nonEmptyBullets(e.bullets).length > 0 ? (
              <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
                {nonEmptyBullets(e.bullets).map((b, i) => (
                  <li key={i} style={{ marginBottom: 3, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span aria-hidden style={{ color: style.accentColor, lineHeight: style.lineHeight }}>{style.bulletStyle}</span>
                    <span>{renderTextWithLinks(b)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
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
            {pr.contentMode === "paragraph" ? (
              pr.description.trim() ? (
                <div style={{ fontSize: style.fontSize, color: style.textColor, marginTop: 2, lineHeight: style.lineHeight }}>{pr.description}</div>
              ) : null
            ) : nonEmptyBullets(pr.bullets).length > 0 ? (
              <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
                {nonEmptyBullets(pr.bullets).map((b, i) => (
                  <li key={i} style={{ marginBottom: 3, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span aria-hidden style={{ color: style.accentColor, lineHeight: style.lineHeight }}>{style.bulletStyle}</span>
                    <span>{renderTextWithLinks(b)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
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
        {p.name && (
          <h1 style={{ fontFamily: style.headingFont, fontSize: "26pt", fontWeight: 600, margin: "0 0 2px", color: style.headingColor, letterSpacing: "-0.3px" }}>
            {p.name}
          </h1>
        )}
        {p.title && <div style={{ fontSize: "11pt", color: style.accentColor, fontWeight: 500, marginBottom: 6 }}>{p.title}</div>}
        {[p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 12px", fontSize: "9pt", color: style.mutedColor, justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {[p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>
        )}
      </div>

      {style.showDividers && (p.name || p.title || p.email || p.phone || p.location || p.linkedin || p.github || p.portfolio || p.summary || sectionOrder.some((key) => sectionVisibility[key] && sectionMap[key])) && (
        <hr style={{ border: "none", borderTop: `1.5px solid ${style.headingColor}`, marginBottom: spacingMap[style.sectionSpacing] }} />
      )}

      {/* Summary */}
      {p.summary && (
        <div style={{ marginBottom: sectionGap, fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.textColor }}>
          {renderTextWithLinks(p.summary)}
        </div>
      )}

      {/* Ordered Sections */}
      {sectionOrder.map((key) => sectionVisibility[key] ? sectionMap[key] : null)}
    </div>
  );
}

// ─── Template Router ───────────────────────────────────────────────────────────
const ClassicTemplateAdapter = ({ data }: { data: ResumeDocument }) => (
  <GenericTemplate resume={data} />
);

export function ResumeRenderer({ resume, forExport = false }: Props) {
  const templatesById: Record<string, React.ComponentType<{ data: ResumeDocument }>> = {
    classic: ClassicTemplateAdapter,
    executive: ExecutiveTemplate,
    modern: ModernTemplate,
    compact: CompactTemplate,
    sidebar: SidebarTemplate,
    scholarly: ScholarlyTemplate,
    research: ResearchTemplate,
  };

  const SelectedTemplate = templatesById[normalizeResumeTemplateId(resume.templateId)] ?? ClassicTemplateAdapter;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100%",
        background: resume.style.backgroundColor,
        boxSizing: "border-box",
        overflow: forExport ? "hidden" : "visible",
      }}
    >
      <SelectedTemplate data={resume} />
    </div>
  );
}

export default ResumeRenderer;

import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  isParagraphMode,
  toAbsoluteUrl,
  toMailto,
  toTel,
} from "@/components/templates/templateHelpers";

export function ResearchTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
    .res-wrap { font-family:'Libre Baskerville',serif; color:#1a1a1a; background:#fff; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .res-wrap, .res-wrap p, .res-wrap span, .res-wrap li, .res-wrap div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .res-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:10px; }
    .res-name { font-size:18pt; font-weight:700; margin:0 0 2px; color:#101010; }
    .res-web { color:#333; }
    .res-contact { text-align:right; min-width:180px; }
    .res-contact-line { color:#2f2f2f; margin-bottom:2px; }
    .res-link { color:inherit; text-decoration:none; }
    .res-link:hover { text-decoration:underline; }
    .res-social { display:flex; gap:10px; margin-top:6px; justify-content:flex-end; }
    .res-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .res-social-link:hover { background:rgba(0,0,0,0.05); }
    .res-section { margin-bottom:14px; }
    .res-title { font-size:12.5pt; font-weight:400; text-transform:uppercase; letter-spacing:0.6px; margin:0 0 4px; color:#181818; }
    .res-rule { border:none; border-top:1px solid #8d8d8d; margin:0 0 8px; }
    .res-entry { margin-bottom:8px; }
    .res-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .res-left { min-width:0; }
    .res-right { text-align:right; white-space:nowrap; color:#3d3d3d; }
    .res-main { font-weight:700; color:#131313; }
    .res-sub { font-family:'Cormorant Garamond',serif; font-size:12pt; font-style:italic; color:#2f2f2f; }
    .res-bullets { margin:3px 0 0 16px; padding:0 0 0 8px; }
    .res-bullets li { margin-bottom:2px; }
    .res-project { margin-bottom:4px; }
    .res-project-name { font-weight:700; }
    .res-cert { margin-bottom:2px; }
    .res-major-bullet { font-size:10pt; margin-right:6px; }
  `;

  const firstSkillsLine = s.skills.flatMap((skillGroup) => skillGroup.items);
  const socialItems = [
    p.linkedin ? { kind: "linkedin" as const, href: toAbsoluteUrl(p.linkedin), label: "LinkedIn" } : null,
    p.github ? { kind: "github" as const, href: toAbsoluteUrl(p.github), label: "GitHub" } : null,
    p.portfolio ? { kind: "portfolio" as const, href: toAbsoluteUrl(p.portfolio), label: "Website" } : null,
  ].filter(Boolean) as Array<{ kind: "linkedin" | "github" | "portfolio"; href: string; label: string }>;

  const SocialIcon = ({ kind }: { kind: "linkedin" | "github" | "portfolio" }) => {
    if (kind === "github") {
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 .5C5.73.5.75 5.64.75 12.02c0 5.11 3.29 9.45 7.86 10.98.58.11.79-.26.79-.57 0-.28-.01-1.04-.02-2.04-3.2.71-3.87-1.57-3.87-1.57-.52-1.35-1.27-1.71-1.27-1.71-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.67 1.26 3.32.96.1-.75.4-1.26.72-1.55-2.56-.3-5.26-1.3-5.26-5.78 0-1.28.45-2.33 1.19-3.15-.12-.3-.52-1.5.11-3.12 0 0 .97-.31 3.18 1.2.92-.26 1.9-.38 2.88-.38.98 0 1.96.13 2.88.38 2.2-1.51 3.18-1.2 3.18-1.2.63 1.62.23 2.82.11 3.12.74.82 1.19 1.87 1.19 3.15 0 4.49-2.7 5.48-5.28 5.77.41.37.78 1.09.78 2.2 0 1.59-.01 2.88-.01 3.27 0 .31.21.69.8.57 4.56-1.53 7.85-5.87 7.85-10.98C23.25 5.64 18.27.5 12 .5z" />
        </svg>
      );
    }
    if (kind === "linkedin") {
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.68H9.33V9h3.42v1.56h.05c.48-.9 1.65-1.86 3.4-1.86 3.64 0 4.31 2.4 4.31 5.52v6.23zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm7.93 9h-3.02a15.7 15.7 0 0 0-1.18-6.02A8.02 8.02 0 0 1 19.93 11zM12 4c1.08 1.46 1.94 3.98 2.28 7H9.72c.34-3.02 1.2-5.54 2.28-7zM4.07 13h3.02c.2 2.1.72 4.2 1.18 6.02A8.02 8.02 0 0 1 4.07 13zm3.02-2H4.07a8.02 8.02 0 0 1 4.2-6.02A15.7 15.7 0 0 0 7.09 11zm2.63 2h4.56c-.34 3.02-1.2 5.54-2.28 7-1.08-1.46-1.94-3.98-2.28-7zm6.39 6.02c.46-1.82.98-3.92 1.18-6.02h3.02a8.02 8.02 0 0 1-4.2 6.02z" />
      </svg>
    );
  };

  return (
    <>
      <style>{css}</style>
      <div
        className="res-wrap"
        style={{
          background: style.backgroundColor,
          color: style.textColor,
          fontFamily: style.bodyFont,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          padding: pagePadding,
          height: "100%",
          minHeight: "100%",
        }}
      >
        <header className="res-top">
          <div>
            <h1 className="res-name" style={{ fontFamily: style.headingFont, color: style.headingColor }}>{p.name}</h1>
            {p.portfolio ? (
              <div className="res-web" style={{ color: style.mutedColor }}>
                <a className="res-link" href={toAbsoluteUrl(p.portfolio)} target="_blank" rel="noreferrer">
                  {p.portfolio}
                </a>
              </div>
            ) : null}
          </div>
          <div className="res-contact" style={{ color: style.mutedColor }}>
            {p.email ? (
              <div className="res-contact-line">
                Email : <a className="res-link" href={toMailto(p.email)} target="_blank" rel="noreferrer">{p.email}</a>
              </div>
            ) : null}
            {p.phone ? (
              <div className="res-contact-line">
                Mobile : <a className="res-link" href={toTel(p.phone)} target="_blank" rel="noreferrer">{p.phone}</a>
              </div>
            ) : null}
            {p.location ? <div className="res-contact-line">Location : {p.location}</div> : null}
            {socialItems.length > 0 ? (
              <div className="res-social">
                {socialItems.map((item, i) => (
                  <a key={i} className="res-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                    <SocialIcon kind={item.kind} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {sectionVisibility.education && s.education.length > 0 && (
          <section className="res-section" style={{ marginBottom: sectionGap }}>
            <div className="res-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Education</div>
            {style.showDividers && <hr className="res-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.education.map((entry, i) => (
              <div key={i} className="res-entry">
                <div className="res-head">
                  <div className="res-left">
                    <div className="res-main" style={{ color: style.headingColor }}><span className="res-major-bullet">●</span>{entry.institution}</div>
                    <div className="res-sub">{entry.degree}{entry.field ? ` in ${entry.field}` : ""}{entry.cgpa ? `; GPA: ${entry.cgpa}` : ""}</div>
                  </div>
                  <div className="res-right" style={{ color: style.mutedColor }}>{entry.year}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.experience && s.experience.length > 0 && (
          <section className="res-section" style={{ marginBottom: sectionGap }}>
            <div className="res-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Experience</div>
            {style.showDividers && <hr className="res-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.experience.map((entry, i) => (
              <div key={i} className="res-entry">
                <div className="res-head">
                  <div className="res-left">
                    <div className="res-main" style={{ color: style.headingColor }}><span className="res-major-bullet">●</span>{entry.company}</div>
                    <div className="res-sub">{entry.role}</div>
                  </div>
                  <div className="res-right" style={{ color: style.mutedColor }}>
                    <div>{entry.location}</div>
                    <div>{formatDateRange(entry.start, entry.end, entry.current)}</div>
                  </div>
                </div>
                {isParagraphMode(entry.contentMode) ? (
                  getExperienceParagraph(entry) ? <div style={{ marginTop: 3 }}>{getExperienceParagraph(entry)}</div> : null
                ) : (
                  getDisplayBullets(entry.bullets).length > 0 && (
                    <ul className="res-bullets">
                      {getDisplayBullets(entry.bullets).map((bullet, idx) => <li key={idx}>{bullet}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.projects && s.projects.length > 0 && (
          <section className="res-section" style={{ marginBottom: sectionGap }}>
            <div className="res-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Projects</div>
            {style.showDividers && <hr className="res-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.projects.map((project, i) => (
              <div key={i} className="res-project">
                <span className="res-project-name" style={{ color: style.headingColor }}>
                  <span className="res-major-bullet">●</span>
                  {project.link ? (
                    <a className="res-link" href={toAbsoluteUrl(project.link)} target="_blank" rel="noreferrer">{project.name}</a>
                  ) : (
                    project.name
                  )}
                </span>
                <span style={{ marginLeft: 6, color: style.mutedColor }}>{formatProjectTech(project)}</span>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div>{getProjectParagraph(project)}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 && (
                    <ul className="res-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(project.bullets).map((bullet, idx) => <li key={idx}>{bullet}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.skills && firstSkillsLine.length > 0 && (
          <section className="res-section" style={{ marginBottom: sectionGap }}>
            <div className="res-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Technical Skills</div>
            {style.showDividers && <hr className="res-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.skills.map((skillGroup, i) => (
              <div key={i}><strong>{skillGroup.category}:</strong> {skillGroup.items.join(", ")}</div>
            ))}
          </section>
        )}

        {sectionVisibility.certifications && s.certifications.length > 0 && (
          <section className="res-section" style={{ marginBottom: sectionGap }}>
            <div className="res-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Certifications</div>
            {style.showDividers && <hr className="res-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.certifications.map((cert, i) => (
              <div key={i} className="res-cert">{style.bulletStyle} {formatCertification(cert)}</div>
            ))}
          </section>
        )}

        {sectionVisibility.languages && s.languages.length > 0 && (
          <section className="res-section" style={{ marginBottom: sectionGap }}>
            <div className="res-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Languages</div>
            {style.showDividers && <hr className="res-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.languages.map((language, i) => (
              <div key={i}>{style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}</div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

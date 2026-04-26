import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  ExternalLinkIcon,
  formatCertification,
  formatDateRange,
  formatProjectTech,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  isParagraphMode,
  renderTextWithLinks,
  toAbsoluteUrl,
  toMailto,
  toTel,
} from "@/components/templates/templateHelpers";

export function ScholarlyTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const contactTextItems = [
    p.phone ? { label: p.phone, href: toTel(p.phone) } : null,
    p.email ? { label: p.email, href: toMailto(p.email) } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const socialItems = [
    p.linkedin ? { kind: "linkedin" as const, href: toAbsoluteUrl(p.linkedin), label: "LinkedIn" } : null,
    p.github ? { kind: "github" as const, href: toAbsoluteUrl(p.github), label: "GitHub" } : null,
    p.portfolio ? { kind: "portfolio" as const, href: toAbsoluteUrl(p.portfolio), label: "Website" } : null,
  ].filter(Boolean) as Array<{ kind: "linkedin" | "github" | "portfolio"; href: string; label: string }>;

  const SocialIcon = ({ kind }: { kind: "linkedin" | "github" | "portfolio" }) => {
    if (kind === "github") {
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 .5C5.73.5.75 5.64.75 12.02c0 5.11 3.29 9.45 7.86 10.98.58.11.79-.26.79-.57 0-.28-.01-1.04-.02-2.04-3.2.71-3.87-1.57-3.87-1.57-.52-1.35-1.27-1.71-1.27-1.71-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.67 1.26 3.32.96.1-.75.4-1.26.72-1.55-2.56-.3-5.26-1.3-5.26-5.78 0-1.28.45-2.33 1.19-3.15-.12-.3-.52-1.5.11-3.12 0 0 .97-.31 3.18 1.2.92-.26 1.9-.38 2.88-.38.98 0 1.96.13 2.88.38 2.2-1.51 3.18-1.2 3.18-1.2.63 1.62.23 2.82.11 3.12.74.82 1.19 1.87 1.19 3.15 0 4.49-2.7 5.48-5.28 5.77.41.37.78 1.09.78 2.2 0 1.59-.01 2.88-.01 3.27 0 .31.21.69.8.57 4.56-1.53 7.85-5.87 7.85-10.98C23.25 5.64 18.27.5 12 .5z"
          />
        </svg>
      );
    }
    if (kind === "linkedin") {
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.68H9.33V9h3.42v1.56h.05c.48-.9 1.65-1.86 3.4-1.86 3.64 0 4.31 2.4 4.31 5.52v6.23zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm7.93 9h-3.02a15.7 15.7 0 0 0-1.18-6.02A8.02 8.02 0 0 1 19.93 11zM12 4c1.08 1.46 1.94 3.98 2.28 7H9.72c.34-3.02 1.2-5.54 2.28-7zM4.07 13h3.02c.2 2.1.72 4.2 1.18 6.02A8.02 8.02 0 0 1 4.07 13zm3.02-2H4.07a8.02 8.02 0 0 1 4.2-6.02A15.7 15.7 0 0 0 7.09 11zm2.63 2h4.56c-.34 3.02-1.2 5.54-2.28 7-1.08-1.46-1.94-3.98-2.28-7zm6.39 6.02c.46-1.82.98-3.92 1.18-6.02h3.02a8.02 8.02 0 0 1-4.2 6.02z"
        />
      </svg>
    );
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@400;600&display=swap');
    .sch-wrap { font-family:'Source Sans 3',sans-serif; color:#1c1c1c; background:#fff; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .sch-wrap, .sch-wrap p, .sch-wrap span, .sch-wrap li, .sch-wrap div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .sch-name { font-family:'EB Garamond',serif; font-size:34pt; line-height:1.04; font-weight:600; text-align:center; margin:0 0 8px; color:#121212; }
    .sch-contact { display:flex; justify-content:center; flex-wrap:wrap; gap:6px 0; color:#474747; font-size:9.2pt; margin-bottom:14px; }
    .sch-contact-item { display:inline-flex; align-items:center; }
    .sch-contact-item + .sch-contact-item::before { content:'|'; color:#9a9a9a; margin:0 8px; }
    .sch-link { color:inherit; text-decoration:none; }
    .sch-link:hover { text-decoration:underline; }
    .sch-social { display:flex; justify-content:center; gap:10px; margin-bottom:14px; color:#474747; }
    .sch-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .sch-social-link:hover { background:rgba(0,0,0,0.05); }
    .sch-section { margin-bottom:12px; }
    .sch-section-title { font-family:'EB Garamond',serif; font-size:13pt; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#1a1a1a; margin:0 0 4px; }
    .sch-rule { border:none; border-top:1px solid #8d8d8d; margin:0 0 8px; }
    .sch-row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:1px; }
    .sch-left { min-width:0; }
    .sch-right { text-align:right; white-space:nowrap; color:#4c4c4c; }
    .sch-strong { font-family:'EB Garamond',serif; font-size:12pt; font-weight:600; color:#181818; }
    .sch-italic { font-family:'EB Garamond',serif; font-size:11.2pt; font-style:italic; color:#3f3f3f; }
    .sch-bullets { margin:3px 0 0 14px; padding:0 0 0 9px; }
    .sch-bullets li { margin-bottom:2px; color:#2c2c2c; }
    .sch-skills-row { margin-bottom:2px; }
    .sch-skill-label { font-weight:600; margin-right:6px; color:#111; }
    .sch-proj { margin-bottom:7px; }
    .sch-proj-name { font-family:'EB Garamond',serif; font-size:11.2pt; font-weight:600; color:#161616; }
    .sch-cert { margin-bottom:2px; color:#2b2b2b; }
  `;

  return (
    <>
      <style>{css}</style>
      <div
        className="sch-wrap"
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
        <h1 className="sch-name" style={{ fontFamily: style.headingFont, color: style.headingColor, textAlign: style.headerAlign }}>
          {p.name}
        </h1>

        {contactTextItems.length > 0 && (
          <div className="sch-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {contactTextItems.map((item, i) => (
              <span key={i} className="sch-contact-item">
                <a className="sch-link" href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              </span>
            ))}
          </div>
        )}

        {socialItems.length > 0 && (
          <div className="sch-social" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {socialItems.map((item, i) => (
              <a key={i} className="sch-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                <SocialIcon kind={item.kind} />
              </a>
            ))}
          </div>
        )}

        {sectionVisibility.education && s.education.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Education</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.education.map((entry, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <div className="sch-row">
                  <div className="sch-left">
                    <div className="sch-strong" style={{ color: style.headingColor }}>{entry.institution}</div>
                    <div className="sch-italic">{entry.degree}{entry.field ? ` in ${entry.field}` : ""}</div>
                  </div>
                  <div className="sch-right" style={{ color: style.mutedColor }}>{entry.year}{entry.cgpa ? ` · CGPA ${entry.cgpa}` : ""}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.experience && s.experience.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Experience</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.experience.map((entry, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div className="sch-row">
                  <div className="sch-left">
                    <div className="sch-strong" style={{ color: style.headingColor }}>{entry.role}</div>
                    <div className="sch-italic">{entry.company}{entry.location ? `, ${entry.location}` : ""}</div>
                  </div>
                  <div className="sch-right" style={{ color: style.mutedColor }}>
                    {formatDateRange(entry.start, entry.end, entry.current)}
                  </div>
                </div>
                {isParagraphMode(entry.contentMode) ? (
                  getExperienceParagraph(entry) ? <div style={{ color: style.textColor, marginTop: 2 }}>{renderTextWithLinks(getExperienceParagraph(entry))}</div> : null
                ) : (
                  getDisplayBullets(entry.bullets).length > 0 && (
                    <ul className="sch-bullets">
                      {getDisplayBullets(entry.bullets).map((bullet, idx) => <li key={idx}>{renderTextWithLinks(bullet)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.projects && s.projects.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Projects</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.projects.map((project, i) => (
              <div className="sch-proj" key={i}>
                {project.link ? (
                  <a
                    className="sch-proj-name sch-link"
                    href={toAbsoluteUrl(project.link)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: style.headingColor }}
                  >
                    {project.name}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <span className="sch-proj-name" style={{ color: style.headingColor }}>{project.name}</span>
                )}
                <span style={{ margin: "0 6px", color: style.mutedColor }}>|</span>
                <span style={{ color: style.mutedColor }}>{formatProjectTech(project)}</span>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(project))}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 && (
                    <ul className="sch-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(project.bullets).map((bullet, idx) => <li key={idx}>{renderTextWithLinks(bullet)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.skills && s.skills.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Technical Skills</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.skills.map((skill, i) => (
              <div key={i} className="sch-skills-row">
                <span className="sch-skill-label">{skill.category}:</span>
                <span>{skill.items.join(", ")}</span>
              </div>
            ))}
          </section>
        )}

        {sectionVisibility.certifications && s.certifications.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Certifications</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.certifications.map((cert, i) => (
              <div key={i} className="sch-cert">{style.bulletStyle} {formatCertification(cert)}</div>
            ))}
          </section>
        )}

        {sectionVisibility.languages && s.languages.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Languages</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.languages.map((language, i) => (
              <div key={i} className="sch-cert">{style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}</div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  ExternalLinkIcon,
  formatCertification,
  formatDateRange,
  formatProjectTech,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  getSocialIconComponent,
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
    p.linkedin ? { href: toAbsoluteUrl(p.linkedin), label: "LinkedIn" } : null,
    p.github ? { href: toAbsoluteUrl(p.github), label: "GitHub" } : null,
    p.portfolio ? { href: toAbsoluteUrl(p.portfolio), label: "Website" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;



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
                {getSocialIconComponent(item.href, { width: 14, height: 14 })}
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

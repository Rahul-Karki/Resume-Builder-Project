import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  isParagraphMode,
} from "@/components/templates/templateHelpers";

export function ScholarlyTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const contactItems = [p.phone, p.email, p.linkedin, p.portfolio].filter(Boolean);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600&display=swap');
    .sch-wrap { font-family:'Source Sans 3',sans-serif; color:#1c1c1c; background:#fff; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .sch-wrap, .sch-wrap p, .sch-wrap span, .sch-wrap li, .sch-wrap div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .sch-name { font-family:'Libre Baskerville',serif; font-size:30pt; line-height:1.08; font-weight:700; text-align:center; margin:0 0 8px; color:#121212; }
    .sch-contact { display:flex; justify-content:center; flex-wrap:wrap; gap:6px 0; color:#474747; font-size:9.2pt; margin-bottom:14px; }
    .sch-contact-item { display:inline-flex; align-items:center; }
    .sch-contact-item + .sch-contact-item::before { content:'|'; color:#9a9a9a; margin:0 8px; }
    .sch-section { margin-bottom:14px; }
    .sch-section-title { font-family:'Libre Baskerville',serif; font-size:13pt; font-weight:400; text-transform:uppercase; letter-spacing:0.9px; color:#1a1a1a; margin:0 0 4px; }
    .sch-rule { border:none; border-top:1px solid #8d8d8d; margin:0 0 8px; }
    .sch-summary { color:#2f2f2f; }
    .sch-row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:2px; }
    .sch-left { min-width:0; }
    .sch-right { text-align:right; white-space:nowrap; color:#4c4c4c; }
    .sch-strong { font-family:'Libre Baskerville',serif; font-weight:700; color:#181818; }
    .sch-italic { font-style:italic; color:#404040; }
    .sch-bullets { margin:3px 0 0 14px; padding:0 0 0 9px; }
    .sch-bullets li { margin-bottom:2px; color:#2c2c2c; }
    .sch-skills-row { margin-bottom:3px; }
    .sch-skill-label { font-weight:600; margin-right:6px; color:#111; }
    .sch-proj { margin-bottom:8px; }
    .sch-proj-name { font-family:'Libre Baskerville',serif; font-size:10.5pt; font-weight:700; color:#161616; }
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

        {contactItems.length > 0 && (
          <div className="sch-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {contactItems.map((item, i) => (
              <span key={i} className="sch-contact-item">{item}</span>
            ))}
          </div>
        )}

        {sectionVisibility.education && s.education.length > 0 && (
          <section className="sch-section" style={{ marginBottom: sectionGap }}>
            <div className="sch-section-title" style={{ fontFamily: style.headingFont, color: style.headingColor }}>Education</div>
            {style.showDividers && <hr className="sch-rule" style={{ borderTopColor: style.borderColor }} />}
            {s.education.map((entry, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
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
              <div key={i} style={{ marginBottom: 9 }}>
                <div className="sch-row">
                  <div className="sch-left">
                    <div className="sch-strong" style={{ color: style.headingColor }}>{entry.role}</div>
                    <div className="sch-italic">{entry.company}</div>
                  </div>
                  <div className="sch-right" style={{ color: style.mutedColor }}>
                    {formatDateRange(entry.start, entry.end, entry.current)}
                    {entry.location ? <div className="sch-italic">{entry.location}</div> : null}
                  </div>
                </div>
                {isParagraphMode(entry.contentMode) ? (
                  getExperienceParagraph(entry) ? <div style={{ color: style.textColor, marginTop: 2 }}>{getExperienceParagraph(entry)}</div> : null
                ) : (
                  getDisplayBullets(entry.bullets).length > 0 && (
                    <ul className="sch-bullets">
                      {getDisplayBullets(entry.bullets).map((bullet, idx) => <li key={idx}>{bullet}</li>)}
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
                <span className="sch-proj-name" style={{ color: style.headingColor }}>{project.name}</span>
                <span style={{ margin: "0 6px", color: style.mutedColor }}>|</span>
                <span style={{ color: style.mutedColor }}>{formatProjectTech(project)}</span>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div style={{ marginTop: 2 }}>{getProjectParagraph(project)}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 && (
                    <ul className="sch-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(project.bullets).map((bullet, idx) => <li key={idx}>{bullet}</li>)}
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

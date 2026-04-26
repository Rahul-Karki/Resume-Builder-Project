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
            {p.portfolio ? <div className="res-web" style={{ color: style.mutedColor }}>{p.portfolio}</div> : null}
          </div>
          <div className="res-contact" style={{ color: style.mutedColor }}>
            {p.email ? <div className="res-contact-line">Email : {p.email}</div> : null}
            {p.phone ? <div className="res-contact-line">Mobile : {p.phone}</div> : null}
            {p.location ? <div className="res-contact-line">Location : {p.location}</div> : null}
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
                <span className="res-project-name" style={{ color: style.headingColor }}><span className="res-major-bullet">●</span>{project.name}</span>
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

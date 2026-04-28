import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  formatCertification,
  formatDateRange,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  isParagraphMode,
  renderTextWithLinks,
  toAbsoluteUrl,
  toMailto,
  toTel,
} from "./templateHelpers";

export function CombinationTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];

  const contacts = [
    p.email ? { label: p.email, href: toMailto(p.email) } : null,
    p.phone ? { label: p.phone, href: toTel(p.phone) } : null,
    p.location ? { label: p.location, href: "" } : null,
    p.linkedin ? { label: "LinkedIn", href: toAbsoluteUrl(p.linkedin) } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const css = `
    .cmb-wrap { width: 100%; min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
    .cmb-header { margin-bottom: 18px; }
    .cmb-name { margin: 0; font-size: 27pt; font-weight: 700; letter-spacing: -0.2px; }
    .cmb-title { font-size: 10.8pt; margin-top: 4px; }
    .cmb-contact { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px 0; font-size: 9pt; }
    .cmb-contact-item { display: inline-flex; align-items: center; }
    .cmb-contact-item + .cmb-contact-item::before { content: "•"; margin: 0 8px; opacity: 0.65; }
    .cmb-link { color: inherit; text-decoration: none; }
    .cmb-link:hover { text-decoration: underline; }
    .cmb-sec { margin-bottom: 16px; }
    .cmb-title-sm { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.7px; font-size: 10pt; font-weight: 700; }
    .cmb-rule { border: none; margin: 0 0 10px; }
    .cmb-top-grid { display: grid; grid-template-columns: 1.25fr 1fr; gap: 12px; }
    .cmb-card { border: 1px solid; border-radius: 8px; padding: 10px; }
    .cmb-skill-row { margin-bottom: 6px; font-size: 9.7pt; }
    .cmb-skill-row strong { margin-right: 6px; }
    .cmb-exp-item { margin-bottom: 12px; }
    .cmb-exp-top { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
    .cmb-role { font-size: 10.3pt; font-weight: 700; }
    .cmb-company { font-size: 9.4pt; font-style: italic; }
    .cmb-date { font-size: 8.8pt; }
    .cmb-bullets { margin: 4px 0 0; padding: 0; list-style: none; }
    .cmb-bullets li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 3px; font-size: 9.8pt; }
    .cmb-edu-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 6px; }
    @media (max-width: 900px) {
      .cmb-top-grid { grid-template-columns: 1fr; }
      .cmb-exp-top { grid-template-columns: 1fr; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div
        className="cmb-wrap"
        style={{
          fontFamily: style.bodyFont,
          color: style.textColor,
          background: style.backgroundColor,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          padding: pagePadding,
        }}
      >
        <header className="cmb-header" style={{ textAlign: style.headerAlign }}>
          <h1 className="cmb-name" style={{ fontFamily: style.headingFont, color: style.headingColor }}>{p.name}</h1>
          {p.title ? <div className="cmb-title" style={{ color: style.accentColor }}>{p.title}</div> : null}
          {contacts.length > 0 ? (
            <div className="cmb-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {contacts.map((item, index) => (
                <span className="cmb-contact-item" key={`${item.label}-${index}`}>
                  {item.href ? <a className="cmb-link" href={item.href} target="_blank" rel="noreferrer">{item.label}</a> : item.label}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {style.showDividers ? (
          <hr style={{ border: "none", borderTop: `1.4px solid ${style.borderColor}`, marginBottom: sectionGap }} />
        ) : null}

        <section className="cmb-sec" style={{ marginBottom: sectionGap }}>
          <div className="cmb-top-grid">
            {p.summary ? (
              <article className="cmb-card" style={{ borderColor: style.borderColor }}>
                <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Professional Profile</h2>
                <div>{renderTextWithLinks(p.summary)}</div>
              </article>
            ) : <div />}

            {sectionVisibility.skills && s.skills.length > 0 ? (
              <article className="cmb-card" style={{ borderColor: style.borderColor }}>
                <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Key Strengths</h2>
                {s.skills.map((group) => (
                  <div className="cmb-skill-row" key={group.id}>
                    <strong style={{ color: style.headingColor }}>{group.category}:</strong>
                    <span>{group.items.join(" · ")}</span>
                  </div>
                ))}
              </article>
            ) : null}
          </div>
        </section>

        {sectionVisibility.experience && s.experience.length > 0 ? (
          <section className="cmb-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Experience</h2>
            {style.showDividers ? <hr className="cmb-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.experience.map((entry) => (
              <article className="cmb-exp-item" key={entry.id}>
                <div className="cmb-exp-top">
                  <div>
                    <div className="cmb-role" style={{ color: style.headingColor }}>{entry.role}</div>
                    {entry.company ? <div className="cmb-company" style={{ color: style.mutedColor }}>{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div> : null}
                  </div>
                  <div className="cmb-date" style={{ color: style.mutedColor }}>{formatDateRange(entry.start, entry.end, entry.current)}</div>
                </div>
                {isParagraphMode(entry.contentMode) ? (
                  getExperienceParagraph(entry) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getExperienceParagraph(entry))}</div> : null
                ) : (
                  getDisplayBullets(entry.bullets).length > 0 ? (
                    <ul className="cmb-bullets">
                      {getDisplayBullets(entry.bullets).map((bullet, idx) => (
                        <li key={idx}>
                          <span style={{ color: style.accentColor }}>{style.bulletStyle}</span>
                          <span>{renderTextWithLinks(bullet)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null
                )}
              </article>
            ))}
          </section>
        ) : null}

        {sectionVisibility.projects && s.projects.length > 0 ? (
          <section className="cmb-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Selected Results</h2>
            {style.showDividers ? <hr className="cmb-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.projects.map((project) => (
              <article key={project.id} style={{ marginBottom: 8 }}>
                <strong style={{ color: style.headingColor }}>{project.name}</strong>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(project))}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 ? (
                    <ul className="cmb-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(project.bullets).map((bullet, idx) => (
                        <li key={idx}>
                          <span style={{ color: style.accentColor }}>{style.bulletStyle}</span>
                          <span>{renderTextWithLinks(bullet)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null
                )}
              </article>
            ))}
          </section>
        ) : null}

        {sectionVisibility.education && s.education.length > 0 ? (
          <section className="cmb-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Education</h2>
            {style.showDividers ? <hr className="cmb-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.education.map((entry) => (
              <div className="cmb-edu-row" key={entry.id}>
                <div>
                  <strong style={{ color: style.headingColor }}>{entry.institution}</strong>
                  {(entry.degree || entry.field) ? <span> · {entry.degree} {entry.field}</span> : null}
                </div>
                <span style={{ color: style.mutedColor, fontSize: "9pt" }}>{entry.year}{entry.cgpa ? ` | CGPA ${entry.cgpa}` : ""}</span>
              </div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.certifications && s.certifications.length > 0 ? (
          <section className="cmb-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Certifications</h2>
            {style.showDividers ? <hr className="cmb-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.certifications.map((cert) => (
              <div key={cert.id} style={{ marginBottom: 3 }}>{style.bulletStyle} {formatCertification(cert)}</div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.languages && s.languages.length > 0 ? (
          <section>
            <h2 className="cmb-title-sm" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Languages</h2>
            {style.showDividers ? <hr className="cmb-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.languages.map((language) => (
              <div key={language.id} style={{ marginBottom: 3 }}>{style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}</div>
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

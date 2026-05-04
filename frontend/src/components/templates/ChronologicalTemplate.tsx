import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  formatCertification,
  ExternalLinkIcon,
  formatDateRange,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  isParagraphMode,
  renderTextWithLinks,
  toAbsoluteUrl,
  toMailto,
  toTel,
  getSocialIconComponent,
} from "./templateHelpers";

export function ChronologicalTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];

  const contacts = [
    p.email ? { label: p.email, href: toMailto(p.email), isLink: true, showIcon: false } : null,
    p.phone ? { label: p.phone, href: toTel(p.phone), isLink: true, showIcon: false } : null,
    p.location ? { label: p.location, href: "", isLink: false, showIcon: false } : null,
    p.linkedin ? { label: "LinkedIn", href: toAbsoluteUrl(p.linkedin), isLink: true, showIcon: true } : null,
    p.github ? { label: "GitHub", href: toAbsoluteUrl(p.github), isLink: true, showIcon: true } : null,
    p.portfolio ? { label: "Website", href: toAbsoluteUrl(p.portfolio), isLink: true, showIcon: true } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; isLink: boolean; showIcon: boolean }>;

  const css = `
    .chr-wrap { width: 100%; min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
    .chr-head { margin-bottom: 18px; }
    .chr-name { margin: 0 0 4px; font-size: 27pt; font-weight: 650; letter-spacing: -0.2px; }
    .chr-role { font-size: 11pt; margin-bottom: 8px; }
    .chr-contact { display: flex; flex-wrap: wrap; gap: 6px 0; font-size: 9.2pt; }
    .chr-contact-item { display: inline-flex; align-items: center; }
    .chr-contact-item + .chr-contact-item::before { content: "|"; margin: 0 10px; opacity: 0.65; }
    .chr-link { color: inherit; text-decoration: none; }
    .chr-link:hover { text-decoration: underline; }
    .chr-title { text-transform: uppercase; letter-spacing: 1.7px; font-size: 10pt; font-weight: 700; margin: 0 0 8px; }
    .chr-rule { border: none; margin: 0 0 10px; }
    .chr-summary { font-size: 10pt; margin-bottom: 12px; }
    .chr-timeline-item { display: grid; grid-template-columns: 132px 1fr; gap: 14px; margin-bottom: 12px; }
    .chr-time { font-size: 9pt; font-weight: 700; }
    .chr-time-location { font-size: 8.5pt; margin-top: 2px; }
    .chr-entry-head { margin-bottom: 2px; }
    .chr-role-line { font-size: 10.5pt; font-weight: 700; }
    .chr-company { font-size: 9.5pt; font-style: italic; }
    .chr-bullets { margin: 4px 0 0; padding: 0; list-style: none; }
    .chr-bullets li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 3px; font-size: 10pt; }
    .chr-edu-row { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 6px; }
    .chr-skills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
    .chr-skill-item { font-size: 9.8pt; }
    .chr-skill-item strong { display: inline-block; margin-right: 6px; }
    @media (max-width: 900px) {
      .chr-timeline-item { grid-template-columns: 1fr; gap: 4px; }
      .chr-skills { grid-template-columns: 1fr; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div
        className="chr-wrap"
        style={{
          fontFamily: style.bodyFont,
          color: style.textColor,
          background: style.backgroundColor,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          padding: pagePadding,
        }}
      >
        <header className="chr-head" style={{ textAlign: style.headerAlign }}>
          <h1 className="chr-name" style={{ fontFamily: style.headingFont, color: style.headingColor }}>{p.name}</h1>
          {p.title ? <div className="chr-role" style={{ color: style.accentColor }}>{p.title}</div> : null}
          {contacts.length > 0 ? (
            <div className="chr-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {contacts.map((item, index) => (
                <span className="chr-contact-item" key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {item.isLink ? (
                    <a href={item.href} className="chr-link" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {item.showIcon && <span style={{ display: 'inline-flex', alignItems: 'center', color: style.accentColor }}>{getSocialIconComponent(item.href, { width: 12, height: 12 })}</span>}
                      {!item.showIcon && item.label}
                    </a>
                  ) : (
                    item.label
                  )}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {style.showDividers ? (
          <hr style={{ border: "none", borderTop: `1.4px solid ${style.borderColor}`, marginBottom: sectionGap }} />
        ) : null}

        {p.summary ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Professional Summary</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            <div className="chr-summary">{renderTextWithLinks(p.summary)}</div>
          </section>
        ) : null}

        {sectionVisibility.experience && s.experience.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Experience</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.experience.map((entry) => (
              <article className="chr-timeline-item" key={entry.id}>
                <div>
                  <div className="chr-time" style={{ color: style.headingColor }}>
                    {formatDateRange(entry.start, entry.end, entry.current)}
                  </div>
                  {entry.location ? <div className="chr-time-location" style={{ color: style.mutedColor }}>{entry.location}</div> : null}
                </div>
                <div>
                  <div className="chr-entry-head">
                    <span className="chr-role-line" style={{ color: style.headingColor }}>{entry.role}</span>
                    {entry.company ? <span className="chr-company" style={{ color: style.mutedColor }}> · {entry.company}</span> : null}
                  </div>
                  {isParagraphMode(entry.contentMode) ? (
                    getExperienceParagraph(entry) ? <div>{renderTextWithLinks(getExperienceParagraph(entry))}</div> : null
                  ) : (
                    getDisplayBullets(entry.bullets).length > 0 ? (
                      <ul className="chr-bullets">
                        {getDisplayBullets(entry.bullets).map((bullet, idx) => (
                          <li key={idx}>
                            <span style={{ color: style.accentColor }}>{style.bulletStyle}</span>
                            <span>{renderTextWithLinks(bullet)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {sectionVisibility.education && s.education.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Education</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.education.map((entry) => (
              <div className="chr-edu-row" key={entry.id}>
                <div>
                  <strong style={{ color: style.headingColor }}>{entry.institution}</strong>
                  {(entry.degree || entry.field) ? <span> · {entry.degree} {entry.field}</span> : null}
                </div>
                <span style={{ color: style.mutedColor, fontSize: "9pt" }}>
                  {entry.year}{entry.cgpa ? ` | CGPA ${entry.cgpa}` : ""}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.skills && s.skills.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Skills</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            <div className="chr-skills">
              {s.skills.map((group) => (
                <div className="chr-skill-item" key={group.id}>
                  <strong style={{ color: style.headingColor }}>{group.category}:</strong>
                  <span>{group.items.join(" · ")}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sectionVisibility.projects && s.projects.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Selected Accomplishments</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.projects.map((project) => (
              <article key={project.id} style={{ marginBottom: 8 }}>
                <strong style={{ color: style.headingColor }}>{project.name}</strong>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(project))}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 ? (
                    <ul className="chr-bullets" style={{ marginTop: 2 }}>
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

        {sectionVisibility.certifications && s.certifications.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Certifications</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.certifications.map((cert) => (
              <div key={cert.id} style={{ marginBottom: 4 }}>
                {style.bulletStyle} {formatCertification(cert)}
              </div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.languages && s.languages.length > 0 ? (
          <section>
            <h2 className="chr-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Languages</h2>
            {style.showDividers ? <hr className="chr-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.languages.map((language) => (
              <div key={language.id} style={{ marginBottom: 3 }}>
                {style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

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
  getSocialIconComponent,
} from "./templateHelpers";

export function CommunityImpactTemplate({ data }: { data: ResumeDocument }) {
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
    .cim-wrap { width: 100%; min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
    .cim-header { margin-bottom: 18px; }
    .cim-name { margin: 0 0 4px; font-size: 26pt; font-weight: 700; letter-spacing: -0.25px; }
    .cim-title { font-size: 10.6pt; margin-bottom: 8px; }
    .cim-contact { display: flex; flex-wrap: wrap; gap: 6px 0; font-size: 9pt; }
    .cim-contact-item { display: inline-flex; align-items: center; }
    .cim-contact-item + .cim-contact-item::before { content: "•"; margin: 0 8px; opacity: 0.65; }
    .cim-link { color: inherit; text-decoration: none; }
    .cim-link:hover { text-decoration: underline; }
    .cim-impact { border: 1px solid; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
    .cim-impact-title { margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1.7px; font-size: 10pt; font-weight: 700; }
    .cim-impact-list { margin: 0; padding-left: 18px; }
    .cim-impact-list li { margin-bottom: 4px; font-size: 9.8pt; }
    .cim-sec { margin-bottom: 14px; }
    .cim-sec-title { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.7px; font-size: 10pt; font-weight: 700; }
    .cim-rule { border: none; margin: 0 0 10px; }
    .cim-entry { margin-bottom: 10px; }
    .cim-entry-top { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
    .cim-role { font-size: 10.2pt; font-weight: 700; }
    .cim-company { font-size: 9.4pt; font-style: italic; }
    .cim-date { font-size: 8.8pt; }
    .cim-bullets { margin: 4px 0 0; padding: 0; list-style: none; }
    .cim-bullets li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 3px; font-size: 9.8pt; }
    .cim-edu { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 6px; }
    .cim-skills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; }
    .cim-skill-row { font-size: 9.7pt; }
    .cim-skill-row strong { margin-right: 6px; }
    @media (max-width: 900px) {
      .cim-entry-top { grid-template-columns: 1fr; }
      .cim-skills { grid-template-columns: 1fr; }
    }
  `;

  const impactHighlights = s.experience
    .flatMap((entry) => getDisplayBullets(entry.bullets).slice(0, 1))
    .slice(0, 3);

  return (
    <>
      <style>{css}</style>
      <div
        className="cim-wrap"
        style={{
          fontFamily: style.bodyFont,
          color: style.textColor,
          background: style.backgroundColor,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          padding: pagePadding,
        }}
      >
        <header className="cim-header" style={{ textAlign: style.headerAlign }}>
          <h1 className="cim-name" style={{ fontFamily: style.headingFont, color: style.headingColor }}>{p.name}</h1>
          {p.title ? <div className="cim-title" style={{ color: style.accentColor }}>{p.title}</div> : null}
          {contacts.length > 0 ? (
            <div className="cim-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {contacts.map((item, index) => (
                <span className="cim-contact-item" key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {item.isLink ? (
                    <a className="cim-link" href={item.href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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

        {(impactHighlights.length > 0 || p.summary) ? (
          <section className="cim-impact" style={{ borderColor: style.borderColor, background: style.backgroundColor }}>
            <h2 className="cim-impact-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Impact Snapshot</h2>
            {p.summary ? <p style={{ margin: "0 0 8px", fontSize: "9.8pt" }}>{renderTextWithLinks(p.summary)}</p> : null}
            {impactHighlights.length > 0 ? (
              <ul className="cim-impact-list">
                {impactHighlights.map((item, idx) => <li key={idx}>{renderTextWithLinks(item)}</li>)}
              </ul>
            ) : null}
          </section>
        ) : null}

        {sectionVisibility.experience && s.experience.length > 0 ? (
          <section className="cim-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cim-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Experience</h2>
            {style.showDividers ? <hr className="cim-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.experience.map((entry) => (
              <article className="cim-entry" key={entry.id}>
                <div className="cim-entry-top">
                  <div>
                    <div className="cim-role" style={{ color: style.headingColor }}>{entry.role}</div>
                    {entry.company ? <div className="cim-company" style={{ color: style.mutedColor }}>{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div> : null}
                  </div>
                  <div className="cim-date" style={{ color: style.mutedColor }}>{formatDateRange(entry.start, entry.end, entry.current)}</div>
                </div>
                {isParagraphMode(entry.contentMode) ? (
                  getExperienceParagraph(entry) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getExperienceParagraph(entry))}</div> : null
                ) : (
                  getDisplayBullets(entry.bullets).length > 0 ? (
                    <ul className="cim-bullets">
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

        {sectionVisibility.skills && s.skills.length > 0 ? (
          <section className="cim-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cim-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Community & Coordination Skills</h2>
            {style.showDividers ? <hr className="cim-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            <div className="cim-skills">
              {s.skills.map((skill) => (
                <div className="cim-skill-row" key={skill.id}>
                  <strong style={{ color: style.headingColor }}>{skill.category}:</strong>
                  <span>{skill.items.join(" · ")}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {sectionVisibility.projects && s.projects.length > 0 ? (
          <section className="cim-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cim-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Programs & Initiatives</h2>
            {style.showDividers ? <hr className="cim-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.projects.map((project) => (
              <article key={project.id} style={{ marginBottom: 8 }}>
                <strong style={{ color: style.headingColor }}>{project.name}</strong>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(project))}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 ? (
                    <ul className="cim-bullets" style={{ marginTop: 2 }}>
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
          <section className="cim-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cim-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Education</h2>
            {style.showDividers ? <hr className="cim-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.education.map((entry) => (
              <div className="cim-edu" key={entry.id}>
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
          <section className="cim-sec" style={{ marginBottom: sectionGap }}>
            <h2 className="cim-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Certifications</h2>
            {style.showDividers ? <hr className="cim-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.certifications.map((cert) => (
              <div key={cert.id} style={{ marginBottom: 3 }}>{style.bulletStyle} {formatCertification(cert)}</div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.languages && s.languages.length > 0 ? (
          <section>
            <h2 className="cim-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Languages</h2>
            {style.showDividers ? <hr className="cim-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.languages.map((language) => (
              <div key={language.id} style={{ marginBottom: 3 }}>{style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}</div>
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

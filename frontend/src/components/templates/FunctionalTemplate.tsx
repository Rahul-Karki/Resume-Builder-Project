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

export function FunctionalTemplate({ data }: { data: ResumeDocument }) {
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
    .fun-wrap { width: 100%; min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
    .fun-head { display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 18px; align-items: end; }
    .fun-name { margin: 0; font-size: 26pt; font-weight: 700; letter-spacing: -0.2px; }
    .fun-title { font-size: 10.5pt; margin-top: 4px; }
    .fun-contact { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px 0; font-size: 9pt; }
    .fun-contact-item { display: inline-flex; align-items: center; }
    .fun-contact-item + .fun-contact-item::before { content: "•"; margin: 0 8px; opacity: 0.65; }
    .fun-link { color: inherit; text-decoration: none; }
    .fun-link:hover { text-decoration: underline; }
    .fun-sec-title { margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1.7px; font-size: 10pt; font-weight: 700; }
    .fun-rule { border: none; margin: 0 0 10px; }
    .fun-summary { font-size: 10pt; }
    .fun-skill-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .fun-skill-card { border-radius: 8px; padding: 9px 10px; border: 1px solid; }
    .fun-skill-label { font-size: 9.4pt; font-weight: 700; margin-bottom: 4px; }
    .fun-skill-items { font-size: 9.4pt; }
    .fun-history-item { margin-bottom: 10px; }
    .fun-history-top { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
    .fun-job { font-size: 10pt; font-weight: 700; }
    .fun-company { font-size: 9.3pt; font-style: italic; }
    .fun-date { font-size: 8.8pt; }
    .fun-bullets { margin: 4px 0 0; padding: 0; list-style: none; }
    .fun-bullets li { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 3px; font-size: 9.7pt; }
    .fun-edu { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 6px; }
    @media (max-width: 900px) {
      .fun-head { grid-template-columns: 1fr; }
      .fun-contact { justify-content: flex-start; }
      .fun-skill-grid { grid-template-columns: 1fr; }
      .fun-history-top { grid-template-columns: 1fr; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div
        className="fun-wrap"
        style={{
          fontFamily: style.bodyFont,
          color: style.textColor,
          background: style.backgroundColor,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          padding: pagePadding,
        }}
      >
        <header className="fun-head" style={{ textAlign: style.headerAlign }}>
          <div>
            <h1 className="fun-name" style={{ fontFamily: style.headingFont, color: style.headingColor }}>{p.name}</h1>
            {p.title ? <div className="fun-title" style={{ color: style.accentColor }}>{p.title}</div> : null}
          </div>
          {contacts.length > 0 ? (
            <div className="fun-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-end" }}>
              {contacts.map((item, index) => (
                <span className="fun-contact-item" key={`${item.label}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {item.isLink ? (
                    <a className="fun-link" href={item.href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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

        {p.summary ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Profile</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            <div className="fun-summary">{renderTextWithLinks(p.summary)}</div>
          </section>
        ) : null}

        {sectionVisibility.skills && s.skills.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Core Skills</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            <div className="fun-skill-grid">
              {s.skills.map((skill) => (
                <article
                  className="fun-skill-card"
                  key={skill.id}
                  style={{ borderColor: style.borderColor, background: `${style.backgroundColor}` }}
                >
                  <div className="fun-skill-label" style={{ color: style.headingColor }}>{skill.category}</div>
                  <div className="fun-skill-items">{skill.items.join(" · ")}</div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {sectionVisibility.experience && s.experience.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Work History</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.experience.map((entry) => (
              <article className="fun-history-item" key={entry.id}>
                <div className="fun-history-top">
                  <div>
                    <div className="fun-job" style={{ color: style.headingColor }}>{entry.role}</div>
                    {entry.company ? <div className="fun-company" style={{ color: style.mutedColor }}>{entry.company}{entry.location ? ` · ${entry.location}` : ""}</div> : null}
                  </div>
                  <div className="fun-date" style={{ color: style.mutedColor }}>{formatDateRange(entry.start, entry.end, entry.current)}</div>
                </div>
                {isParagraphMode(entry.contentMode) ? (
                  getExperienceParagraph(entry) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getExperienceParagraph(entry))}</div> : null
                ) : (
                  getDisplayBullets(entry.bullets).length > 0 ? (
                    <ul className="fun-bullets">
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
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Transferable Highlights</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.projects.map((project) => (
              <article key={project.id} style={{ marginBottom: 8 }}>
                <strong style={{ color: style.headingColor }}>{project.name}</strong>
                {isParagraphMode(project.contentMode) ? (
                  getProjectParagraph(project) ? <div style={{ marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(project))}</div> : null
                ) : (
                  getDisplayBullets(project.bullets).length > 0 ? (
                    <ul className="fun-bullets" style={{ marginTop: 2 }}>
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
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Education</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.education.map((entry) => (
              <div className="fun-edu" key={entry.id}>
                <div>
                  <strong style={{ color: style.headingColor }}>{entry.institution}</strong>
                  {(entry.degree || entry.field) ? <span> · {entry.degree} {entry.field}</span> : null}
                </div>
                <span style={{ fontSize: "9pt", color: style.mutedColor }}>{entry.year}{entry.cgpa ? ` | CGPA ${entry.cgpa}` : ""}</span>
              </div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.certifications && s.certifications.length > 0 ? (
          <section style={{ marginBottom: sectionGap }}>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Certifications</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.certifications.map((cert) => (
              <div key={cert.id} style={{ marginBottom: 3 }}>{style.bulletStyle} {formatCertification(cert)}</div>
            ))}
          </section>
        ) : null}

        {sectionVisibility.languages && s.languages.length > 0 ? (
          <section>
            <h2 className="fun-sec-title" style={{ color: style.accentColor, fontFamily: style.headingFont }}>Languages</h2>
            {style.showDividers ? <hr className="fun-rule" style={{ borderTop: `1px solid ${style.borderColor}` }} /> : null}
            {s.languages.map((language) => (
              <div key={language.id} style={{ marginBottom: 3 }}>{style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}</div>
            ))}
          </section>
        ) : null}
      </div>
    </>
  );
}

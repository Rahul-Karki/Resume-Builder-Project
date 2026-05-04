import type { CSSProperties } from "react";
import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import {
  formatCertification,
  ExternalLinkIcon,
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
  getSocialIconComponent,
  isLinkedInUrl,
  isGitHubUrl,
} from "@/components/templates/templateHelpers";

export function ClassicTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionOrder, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];

  const contactItems = [
    p.email ? { label: p.email, href: toMailto(p.email) } : null,
    p.phone ? { label: p.phone, href: toTel(p.phone) } : null,
    p.location ? { label: p.location, href: "" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const socialItems = [
    p.linkedin ? { href: toAbsoluteUrl(p.linkedin), label: "LinkedIn" } : null,
    p.github ? { href: toAbsoluteUrl(p.github), label: "GitHub" } : null,
    p.portfolio ? { href: toAbsoluteUrl(p.portfolio), label: "Website" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  const css = `
    .classic-wrap { width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .classic-name { font-size:28pt; font-weight:500; letter-spacing:0.5px; margin:0 0 4px; }
    .classic-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px 18px; margin-bottom:18px; }
    .classic-contact { font-size:9pt; display:flex; flex-wrap:wrap; gap:4px 0; align-items:center; }
    .classic-contact-item { display:inline-flex; align-items:center; }
    .classic-contact-item + .classic-contact-item::before { content:'·'; margin:0 10px; opacity:0.7; }
    .classic-link { color:inherit; text-decoration:none; }
    .classic-link:hover { text-decoration:underline; }
    .classic-social { display:flex; gap:8px; align-items:center; }
    .classic-social-link { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:999px; }
    .classic-section-title { font-size:13pt; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; margin:0 0 6px; }
    .classic-summary { font-size:10pt; }
    .classic-job { margin-bottom:12px; }
    .classic-job-header { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
    .classic-role { font-weight:600; font-size:10.5pt; }
    .classic-company { font-size:10pt; font-style:italic; }
    .classic-date { font-size:9pt; white-space:nowrap; }
    .classic-bullets { margin:4px 0 0 0; padding:0; list-style:none; }
    .classic-bullets li { margin-bottom:3px; font-size:10pt; display:flex; align-items:flex-start; gap:8px; }
    .classic-bullet { line-height:inherit; }
    .classic-edu-row { display:flex; justify-content:space-between; gap:12px; }
    .classic-skills-row { display:flex; gap:24px; flex-wrap:wrap; margin-bottom:6px; }
    .classic-skill-cat { font-weight:600; min-width:100px; font-size:10pt; }
    .classic-skill-val { font-size:10pt; }
    .classic-proj { margin-bottom:8px; }
    .classic-proj-name { font-weight:600; font-size:10pt; }
    .classic-cert { font-size:10pt; margin-bottom:3px; }
  `;

  const sectionTitleStyle: CSSProperties = {
    fontFamily: style.headingFont,
    color: style.accentColor,
  };

  const sectionRuleStyle: CSSProperties = {
    border: "none",
    borderTop: style.showDividers ? `1px solid ${style.borderColor}` : "none",
    margin: style.showDividers ? "0 0 10px" : "0 0 6px",
  };

  const sectionMap: Record<string, React.ReactNode> = {
    experience: sectionVisibility.experience && s.experience.length > 0 ? (
      <section key="experience" style={{ marginBottom: sectionGap }}>
        <div className="classic-section-title" style={sectionTitleStyle}>Experience</div>
        <hr style={sectionRuleStyle} />
        {s.experience.map((entry) => (
          <div className="classic-job" key={entry.id}>
            <div className="classic-job-header">
              <div>
                <span className="classic-role" style={{ color: style.headingColor }}>{entry.role}</span>
                {entry.company && (
                  <>
                    <span style={{ margin: "0 6px", color: style.mutedColor }}>-</span>
                    <span className="classic-company" style={{ color: style.mutedColor }}>
                      {entry.company}{entry.location ? `, ${entry.location}` : ""}
                    </span>
                  </>
                )}
              </div>
              <span className="classic-date" style={{ color: style.mutedColor }}>
                {formatDateRange(entry.start, entry.end, entry.current)}
              </span>
            </div>
            {isParagraphMode(entry.contentMode) ? (
              getExperienceParagraph(entry) ? (
                <div style={{ fontSize: "10pt", color: style.textColor, marginTop: 2 }}>
                  {renderTextWithLinks(getExperienceParagraph(entry))}
                </div>
              ) : null
            ) : (
              getDisplayBullets(entry.bullets).length > 0 && (
                <ul className="classic-bullets">
                  {getDisplayBullets(entry.bullets).map((bullet, index) => (
                    <li key={index}>
                      <span className="classic-bullet" style={{ color: style.accentColor }}>{style.bulletStyle}</span>
                      <span>{renderTextWithLinks(bullet)}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}
      </section>
    ) : null,
    education: sectionVisibility.education && s.education.length > 0 ? (
      <section key="education" style={{ marginBottom: sectionGap }}>
        <div className="classic-section-title" style={sectionTitleStyle}>Education</div>
        <hr style={sectionRuleStyle} />
        {s.education.map((entry) => (
          <div className="classic-edu-row" key={entry.id}>
            <div>
              <strong style={{ color: style.headingColor }}>{entry.institution}</strong>
              {(entry.degree || entry.field) && (
                <span style={{ marginLeft: 8, fontSize: "10pt", color: style.textColor }}>
                  {entry.degree} {entry.field}
                </span>
              )}
            </div>
            <span style={{ fontSize: "9pt", color: style.mutedColor }}>
              {entry.year}{entry.cgpa ? ` · CGPA: ${entry.cgpa}` : ""}
            </span>
          </div>
        ))}
      </section>
    ) : null,
    skills: sectionVisibility.skills && s.skills.length > 0 ? (
      <section key="skills" style={{ marginBottom: sectionGap }}>
        <div className="classic-section-title" style={sectionTitleStyle}>Skills</div>
        <hr style={sectionRuleStyle} />
        {s.skills.map((skillGroup) => (
          <div className="classic-skills-row" key={skillGroup.id}>
            <span className="classic-skill-cat" style={{ color: style.headingColor }}>{skillGroup.category}:</span>
            <span className="classic-skill-val" style={{ color: style.textColor }}>{skillGroup.items.join(" · ")}</span>
          </div>
        ))}
      </section>
    ) : null,
    projects: sectionVisibility.projects && s.projects.length > 0 ? (
      <section key="projects" style={{ marginBottom: sectionGap }}>
        <div className="classic-section-title" style={sectionTitleStyle}>Projects</div>
        <hr style={sectionRuleStyle} />
        {s.projects.map((project) => (
          <div className="classic-proj" key={project.id}>
            {project.link ? (
              <a className="classic-proj-name classic-link" href={toAbsoluteUrl(project.link)} target="_blank" rel="noreferrer" style={{ color: style.headingColor }}>
                {project.name}
                <ExternalLinkIcon />
              </a>
            ) : (
              <span className="classic-proj-name" style={{ color: style.headingColor }}>{project.name}</span>
            )}
            {formatProjectTech(project) && (
              <>
                <span style={{ margin: "0 6px", color: style.mutedColor }}>|</span>
                <span style={{ fontSize: "9.5pt", color: style.mutedColor }}>{formatProjectTech(project)}</span>
              </>
            )}
            {isParagraphMode(project.contentMode) ? (
              getProjectParagraph(project) ? (
                <div style={{ fontSize: "10pt", color: style.textColor, marginTop: 2 }}>
                  {renderTextWithLinks(getProjectParagraph(project))}
                </div>
              ) : null
            ) : (
              getDisplayBullets(project.bullets).length > 0 && (
                <ul className="classic-bullets" style={{ marginTop: 2 }}>
                  {getDisplayBullets(project.bullets).map((bullet, index) => (
                    <li key={index}>
                      <span className="classic-bullet" style={{ color: style.accentColor }}>{style.bulletStyle}</span>
                      <span>{renderTextWithLinks(bullet)}</span>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}
      </section>
    ) : null,
    certifications: sectionVisibility.certifications && s.certifications.length > 0 ? (
      <section key="certifications" style={{ marginBottom: sectionGap }}>
        <div className="classic-section-title" style={sectionTitleStyle}>Certifications</div>
        <hr style={sectionRuleStyle} />
        {s.certifications.map((certification) => (
          <div className="classic-cert" key={certification.id} style={{ color: style.textColor }}>
            {style.bulletStyle} {formatCertification(certification)}
          </div>
        ))}
      </section>
    ) : null,
    languages: sectionVisibility.languages && s.languages.length > 0 ? (
      <section key="languages" style={{ marginBottom: sectionGap }}>
        <div className="classic-section-title" style={sectionTitleStyle}>Languages</div>
        <hr style={sectionRuleStyle} />
        {s.languages.map((language) => (
          <div className="classic-cert" key={language.id} style={{ color: style.textColor }}>
            {style.bulletStyle} {language.language}{language.proficiency ? ` (${language.proficiency})` : ""}
          </div>
        ))}
      </section>
    ) : null,
  };

  return (
    <>
      <style>{css}</style>
      <div
        className="classic-wrap"
        style={{
          fontFamily: style.bodyFont,
          color: style.textColor,
          background: style.backgroundColor,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          padding: pagePadding,
        }}
      >
        <div style={{ marginBottom: 18, textAlign: style.headerAlign }}>
          <h1 className="classic-name" style={{ fontFamily: style.headingFont, color: style.headingColor }}>
            {p.name}
          </h1>
          {p.title && <div style={{ fontSize: "11pt", color: style.accentColor, marginBottom: 6 }}>{p.title}</div>}
          {(contactItems.length > 0 || socialItems.length > 0) && (
            <div
              className="classic-meta"
              style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start", color: style.mutedColor }}
            >
              {contactItems.length > 0 && (
                <div className="classic-contact">
                  {contactItems.map((item, index) => (
                    <span key={index} className="classic-contact-item">
                      {item.href ? (
                        <a className="classic-link" href={item.href} target="_blank" rel="noreferrer">
                          {item.label}
                        </a>
                      ) : (
                        item.label
                      )}
                    </span>
                  ))}
                </div>
              )}
              {socialItems.length > 0 && (
                <div className="classic-social">
                  {socialItems.map((item, index) => (
                    <a
                      key={index}
                      className="classic-social-link"
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={item.label}
                      title={item.label}
                      style={{ color: style.accentColor, border: `1px solid ${style.borderColor}`, background: style.backgroundColor }}
                    >
                      {getSocialIconComponent(item.href, { width: 14, height: 14 })}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {style.showDividers && (
          <hr style={{ border: "none", borderTop: `1.5px solid ${style.headingColor}`, margin: `0 0 ${sectionGap}` }} />
        )}

        {p.summary && (
          <section style={{ marginBottom: sectionGap }}>
            <p className="classic-summary" style={{ color: style.textColor }}>
              {renderTextWithLinks(p.summary)}
            </p>
          </section>
        )}

        {sectionOrder.map((sectionKey) => sectionMap[sectionKey] ?? null)}
      </div>
    </>
  );
}

import { ResumeDocument, marginMap, spacingMap } from "../../types/resume-types";
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
  getSocialIconComponent,
} from "./templateHelpers";

export function CompactTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const contactItems = [
    p.email ? { label: p.email, href: toMailto(p.email) } : null,
    p.phone ? { label: p.phone, href: toTel(p.phone) } : null,
    p.location ? { label: p.location, href: "" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  const socialItems = [
    p.linkedin ? { href: toAbsoluteUrl(p.linkedin), label: "LinkedIn", kind: "linkedin" as const } : null,
    p.github ? { href: toAbsoluteUrl(p.github), label: "GitHub", kind: "github" as const } : null,
    p.portfolio ? { href: toAbsoluteUrl(p.portfolio), label: "Website", kind: "portfolio" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; kind: "linkedin" | "github" | "portfolio" }>;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&display=swap');
    .comp-wrap { font-family:'IBM Plex Sans',sans-serif; color:#1a1a1a; background:#fff; padding:32px 44px; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; font-size:${style.fontSize}; line-height:${style.lineHeight}; display:flex; flex-direction:column; }
    .comp-wrap p, .comp-wrap span, .comp-wrap li, .comp-wrap div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .comp-header { border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:10px; }
    .comp-name { font-family:'IBM Plex Serif',serif; font-size:24pt; font-weight:600; margin:0 0 4px; }
    .comp-contact { display:flex; flex-wrap:wrap; gap:3px 12px; font-size:8.5pt; color:#444; }
    .comp-link { color:inherit; text-decoration:none; }
    .comp-link:hover { text-decoration:underline; }
    .comp-social { display:flex; gap:10px; margin-top:6px; color:#444; }
    .comp-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .comp-social-link:hover { background:rgba(0,0,0,0.05); }
    .comp-row { display:grid; grid-template-columns:100px 1fr; gap:0 16px; margin-bottom:10px; align-items:start; }
    .comp-label { font-size:8pt; font-weight:600; text-transform:uppercase; letter-spacing:1.2px; color:#555; padding-top:1px; }
    .comp-content {}
    .comp-section-rule { border-top:0.5px solid #ccc; margin:10px 0; }
    .comp-job { margin-bottom:8px; }
    .comp-job-line { display:flex; justify-content:space-between; margin-bottom:2px; }
    .comp-role { font-weight:600; font-size:9.5pt; }
    .comp-company { font-size:9pt; color:#444; }
    .comp-date { font-size:8.5pt; color:#666; white-space:nowrap; }
    .comp-bullets { margin:2px 0 0 0; padding:0; list-style:none; }
    .comp-bullets li { margin-bottom:2px; font-size:9pt; font-weight:300; display:flex; align-items:flex-start; gap:7px; }
    .comp-bullets li::before { content:'${style.bulletStyle}'; color:${style.accentColor}; font-weight:700; line-height:inherit; }
    .comp-summary { font-size:9.5pt; font-weight:300; line-height:1.5; color:#222; }
    .comp-skill-row { margin-bottom:3px; font-size:9pt; }
    .comp-skill-cat { font-weight:600; margin-right:6px; }
    .comp-edu-entry { display:flex; justify-content:space-between; margin-bottom:4px; font-size:9.5pt; }
    .comp-proj { margin-bottom:5px; font-size:9pt; }
    .comp-cert { font-size:9pt; margin-bottom:2px; }
  `;
  return (
    <>
      <style>{css}</style>
      <div className="comp-wrap" style={{ background: style.backgroundColor, color: style.textColor, fontFamily: style.bodyFont, fontSize: style.fontSize, lineHeight: style.lineHeight, padding: pagePadding, height: "100%", minHeight: "100%" }}>
        <div className="comp-header">
          <div className="comp-name" style={{ fontFamily: style.headingFont, color: style.headingColor, textAlign: style.headerAlign }}>{p.name}</div>
          {p.title && <div style={{ fontSize: "9pt", color: style.mutedColor, marginBottom: 6, textAlign: style.headerAlign }}>{p.title}</div>}
          {contactItems.length > 0 && (
            <div className="comp-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {contactItems.map((item, i) => (
                <span key={i}>
                  {i > 0 ? " · " : ""}
                  {item.href ? (
                    <a className="comp-link" href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                  ) : (
                    item.label
                  )}
                </span>
              ))}
            </div>
          )}

          {socialItems.length > 0 && (
            <div className="comp-social" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {socialItems.map((item, i) => (
                <a key={i} className="comp-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                  {getSocialIconComponent(item.href, { width: 14, height: 14, kind: item.kind })}
                </a>
              ))}
            </div>
          )}
        </div>
 
        {p.summary && (
          <div className="comp-row" style={{ marginBottom: sectionGap }}>
            <div className="comp-label">Summary</div>
            <div className="comp-summary">{renderTextWithLinks(p.summary)}</div>
          </div>
        )}
 
        {sectionVisibility.experience && s.experience.length > 0 && style.showDividers && <hr className="comp-section-rule" style={{ borderTopColor: style.borderColor }} />}
 
        {sectionVisibility.experience && s.experience.length > 0 && (
        <div className="comp-row" style={{ alignItems: "start", marginBottom: sectionGap }}>
          <div className="comp-label" style={{ paddingTop: 3 }}>Experience</div>
          <div>
            {s.experience.map((e, i) => (
              <div className="comp-job" key={i}>
                <div className="comp-job-line">
                  <div>
                    <span className="comp-role">{e.role}</span>
                    <span style={{ margin: "0 5px", color: "#999" }}>·</span>
                    <span className="comp-company">{e.company}, {e.location}</span>
                  </div>
                  <span className="comp-date">{formatDateRange(e.start, e.end, e.current)}</span>
                </div>
                {isParagraphMode(e.contentMode) ? (
                  getExperienceParagraph(e) ? <div style={{ color: "#444", fontWeight: 300, marginTop: 2 }}>{renderTextWithLinks(getExperienceParagraph(e))}</div> : null
                ) : (
                  getDisplayBullets(e.bullets).length > 0 && (
                    <ul className="comp-bullets">
                      {getDisplayBullets(e.bullets).map((b, j) => <li key={j}>{renderTextWithLinks(b)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        )}
 
        {sectionVisibility.education && s.education.length > 0 && style.showDividers && <hr className="comp-section-rule" style={{ borderTopColor: style.borderColor }} />}
 
        {sectionVisibility.education && s.education.length > 0 && (
        <div className="comp-row" style={{ marginBottom: sectionGap }}>
          <div className="comp-label">Education</div>
          <div>
            {s.education.map((e, i) => (
              <div className="comp-edu-entry" key={i}>
                <div>
                  <strong>{e.institution}</strong>
                  <span style={{ color: "#555", marginLeft: 8 }}>{e.degree} {e.field}</span>
                </div>
                <span style={{ fontSize: "8.5pt", color: "#666" }}>{e.year}{e.cgpa ? ` · CGPA ${e.cgpa}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
        )}
 
        {sectionVisibility.skills && s.skills.length > 0 && style.showDividers && <hr className="comp-section-rule" style={{ borderTopColor: style.borderColor }} />}
 
        {sectionVisibility.skills && s.skills.length > 0 && (
        <div className="comp-row" style={{ marginBottom: sectionGap }}>
          <div className="comp-label">Skills</div>
          <div>
            {s.skills.map((sk, i) => (
              <div className="comp-skill-row" key={i}>
                <span className="comp-skill-cat">{sk.category}:</span>
                <span style={{ color: "#333" }}>{sk.items.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
        )}
 
        {sectionVisibility.projects && s.projects.length > 0 && style.showDividers && <hr className="comp-section-rule" style={{ borderTopColor: style.borderColor }} />}
 
        {sectionVisibility.projects && s.projects.length > 0 && (
        <div className="comp-row" style={{ marginBottom: sectionGap }}>
          <div className="comp-label">Projects</div>
          <div>
            {s.projects.map((pr, i) => (
              <div className="comp-proj" key={i}>
                {pr.link ? (
                  <a className="comp-link" href={toAbsoluteUrl(pr.link)} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    {pr.name}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <strong>{pr.name}</strong>
                )}
                <span style={{ color: "#777", marginLeft: 6 }}>{formatProjectTech(pr)}</span>
                {isParagraphMode(pr.contentMode) ? (
                  getProjectParagraph(pr) ? <div style={{ color: "#444", fontWeight: 300 }}>{renderTextWithLinks(getProjectParagraph(pr))}</div> : null
                ) : (
                  getDisplayBullets(pr.bullets).length > 0 && (
                    <ul className="comp-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(pr.bullets).map((b, j) => <li key={j}>{renderTextWithLinks(b)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        )}
 
        {sectionVisibility.certifications && s.certifications.length > 0 && style.showDividers && <hr className="comp-section-rule" style={{ borderTopColor: style.borderColor }} />}
 
        {sectionVisibility.certifications && s.certifications.length > 0 && (
        <div className="comp-row" style={{ marginBottom: sectionGap }}>
          <div className="comp-label">Certs</div>
          <div>
            {s.certifications.map((c, i) => <div className="comp-cert" key={i}>{style.bulletStyle} {formatCertification(c)}</div>)}
          </div>
        </div>
        )}

        {sectionVisibility.languages && s.languages.length > 0 && style.showDividers && <hr className="comp-section-rule" style={{ borderTopColor: style.borderColor }} />}

        {sectionVisibility.languages && s.languages.length > 0 && (
        <div className="comp-row" style={{ marginBottom: sectionGap }}>
          <div className="comp-label">Languages</div>
          <div>
            {s.languages.map((l, i) => (
              <div className="comp-cert" key={i}>{style.bulletStyle} {l.language}{l.proficiency ? ` (${l.proficiency})` : ""}</div>
            ))}
          </div>
        </div>
        )}
      </div>
    </>
  );
}

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
    p.linkedin ? { kind: "linkedin" as const, href: toAbsoluteUrl(p.linkedin), label: "LinkedIn" } : null,
    p.github ? { kind: "github" as const, href: toAbsoluteUrl(p.github), label: "GitHub" } : null,
    p.portfolio ? { kind: "portfolio" as const, href: toAbsoluteUrl(p.portfolio), label: "Website" } : null,
  ].filter(Boolean) as Array<{ kind: "linkedin" | "github" | "portfolio"; href: string; label: string }>;

  const SocialIcon = ({ kind }: { kind: "linkedin" | "github" | "portfolio" }) => {
    if (kind === "github") {
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M12 .5C5.73.5.75 5.64.75 12.02c0 5.11 3.29 9.45 7.86 10.98.58.11.79-.26.79-.57 0-.28-.01-1.04-.02-2.04-3.2.71-3.87-1.57-3.87-1.57-.52-1.35-1.27-1.71-1.27-1.71-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.67 1.26 3.32.96.1-.75.4-1.26.72-1.55-2.56-.3-5.26-1.3-5.26-5.78 0-1.28.45-2.33 1.19-3.15-.12-.3-.52-1.5.11-3.12 0 0 .97-.31 3.18 1.2.92-.26 1.9-.38 2.88-.38.98 0 1.96.13 2.88.38 2.2-1.51 3.18-1.2 3.18-1.2.63 1.62.23 2.82.11 3.12.74.82 1.19 1.87 1.19 3.15 0 4.49-2.7 5.48-5.28 5.77.41.37.78 1.09.78 2.2 0 1.59-.01 2.88-.01 3.27 0 .31.21.69.8.57 4.56-1.53 7.85-5.87 7.85-10.98C23.25 5.64 18.27.5 12 .5z" />
        </svg>
      );
    }
    if (kind === "linkedin") {
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.68H9.33V9h3.42v1.56h.05c.48-.9 1.65-1.86 3.4-1.86 3.64 0 4.31 2.4 4.31 5.52v6.23zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm7.93 9h-3.02a15.7 15.7 0 0 0-1.18-6.02A8.02 8.02 0 0 1 19.93 11zM12 4c1.08 1.46 1.94 3.98 2.28 7H9.72c.34-3.02 1.2-5.54 2.28-7zM4.07 13h3.02c.2 2.1.72 4.2 1.18 6.02A8.02 8.02 0 0 1 4.07 13zm3.02-2H4.07a8.02 8.02 0 0 1 4.2-6.02A15.7 15.7 0 0 0 7.09 11zm2.63 2h4.56c-.34 3.02-1.2 5.54-2.28 7-1.08-1.46-1.94-3.98-2.28-7zm6.39 6.02c.46-1.82.98-3.92 1.18-6.02h3.02a8.02 8.02 0 0 1-4.2 6.02z" />
      </svg>
    );
  };
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
                  <SocialIcon kind={item.kind} />
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

import  { ResumeDocument, marginMap, spacingMap } from "../../types/resume-types"; 
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
  getDisplayBullets,
  getExperienceParagraph,
  getProjectParagraph,
  isParagraphMode,
  toAbsoluteUrl,
  toMailto,
  toTel,
} from "./templateHelpers";

export function ExecutiveTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const contactItems = [
    p.email ? { icon: "✉", label: p.email, href: toMailto(p.email) } : null,
    p.phone ? { icon: "☎", label: p.phone, href: toTel(p.phone) } : null,
    p.location ? { icon: "⌖", label: p.location, href: "" } : null,
  ].filter(Boolean) as Array<{ icon: string; label: string; href: string }>;

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
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Lato:wght@300;400;700&display=swap');
    .exec-wrap { font-family:'Lato',sans-serif; color:#1c1c1c; background:#fff; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .exec-header { background:#1B2B4B; color:#fff; padding:36px 52px 28px; }
    .exec-name { font-family:'Playfair Display',serif; font-size:30pt; font-weight:700; margin:0 0 8px; letter-spacing:0.3px; }
    .exec-title-bar { font-size:9.5pt; font-weight:300; letter-spacing:2px; text-transform:uppercase; color:#A8BDD8; margin-bottom:14px; }
    .exec-contact-bar { display:flex; flex-wrap:wrap; gap:6px 24px; font-size:9pt; color:#c8d8ec; }
    .exec-link { color:inherit; text-decoration:none; }
    .exec-link:hover { text-decoration:underline; }
    .exec-social { display:flex; gap:10px; margin-top:10px; color:#c8d8ec; }
    .exec-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .exec-social-link:hover { background:rgba(255,255,255,0.10); }
    .exec-body { padding:28px 52px 40px; flex:1; }
    .exec-body, .exec-body p, .exec-body span, .exec-body li, .exec-body div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .exec-section { margin-bottom:18px; }
    .exec-section-title { font-family:'Playfair Display',serif; font-size:11pt; font-weight:500; color:#1B2B4B; text-transform:uppercase; letter-spacing:2px; border-bottom:2px solid #1B2B4B; padding-bottom:4px; margin-bottom:10px; }
    .exec-summary { font-size:10pt; line-height:1.6; color:#333; font-weight:300; }
    .exec-job { margin-bottom:14px; }
    .exec-job-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:2px; }
    .exec-role { font-weight:700; font-size:10.5pt; color:#1B2B4B; }
    .exec-company { font-weight:400; font-size:10pt; color:#444; }
    .exec-date { font-size:9pt; color:#777; font-style:italic; white-space:nowrap; }
    .exec-bullets { margin:5px 0 0 0; padding:0; list-style:none; }
    .exec-bullets li { font-size:10pt; margin-bottom:4px; font-weight:300; line-height:1.5; display:flex; align-items:flex-start; gap:8px; }
    .exec-bullets li::before { content:'${style.bulletStyle}'; color:${style.accentColor}; font-weight:700; line-height:inherit; }
    .exec-edu-entry { display:flex; justify-content:space-between; margin-bottom:6px; }
    .exec-skill-row { display:flex; gap:8px; margin-bottom:5px; align-items:flex-start; }
    .exec-skill-label { font-weight:700; font-size:9.5pt; color:#1B2B4B; min-width:110px; }
    .exec-skill-items { font-size:9.5pt; color:#444; font-weight:300; }
    .exec-proj { margin-bottom:8px; }
    .exec-cert { font-size:9.5pt; margin-bottom:3px; color:#333; }
  `;
  return (
    <>
      <style>{css}</style>
      <div className="exec-wrap" style={{ background: style.backgroundColor, color: style.textColor, fontFamily: style.bodyFont, fontSize: style.fontSize, lineHeight: style.lineHeight, height: "100%", minHeight: "100%" }}>
        <div className="exec-header" style={{ background: style.accentColor, padding: `36px ${pagePadding.split(" ")[1]} 28px` }}>
          <div className="exec-name" style={{ fontFamily: style.headingFont, textAlign: style.headerAlign }}>{p.name}</div>
          {p.title && <div className="exec-title-bar" style={{ color: style.mutedColor, textAlign: style.headerAlign }}>{p.title}</div>}
          {contactItems.length > 0 && (
            <div className="exec-contact-bar" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {contactItems.map((item, i) => (
                <span key={i}>
                  {item.icon}{" "}
                  {item.href ? (
                    <a className="exec-link" href={item.href} target="_blank" rel="noreferrer">
                      {item.label}
                    </a>
                  ) : (
                    item.label
                  )}
                </span>
              ))}

              {socialItems.length > 0 && (
                <span className="exec-social" aria-label="Social links">
                  {socialItems.map((item, i) => (
                    <a key={i} className="exec-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                      <SocialIcon kind={item.kind} />
                    </a>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="exec-body" style={{ padding: `28px ${pagePadding.split(" ")[1]} 40px` }}>
          {sectionVisibility.experience && s.experience.length > 0 && (
          <div className="exec-section" style={{ marginBottom: sectionGap }}>
            <div className="exec-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor, borderBottomColor: style.accentColor, borderBottomWidth: style.showDividers ? 2 : 0 }}>Professional Experience</div>
            {s.experience.map((e, i) => (
              <div className="exec-job" key={i}>
                <div className="exec-job-top">
                  <div>
                    <span className="exec-role" style={{ color: style.headingColor }}>{e.role}</span>
                    <span style={{ margin: "0 8px", color: "#aaa" }}>|</span>
                    <span className="exec-company" style={{ color: style.mutedColor }}>{e.company} · {e.location}</span>
                  </div>
                  <span className="exec-date" style={{ color: style.mutedColor }}>{formatDateRange(e.start, e.end, e.current)}</span>
                </div>
                {isParagraphMode(e.contentMode) ? (
                  getExperienceParagraph(e) ? <div style={{ fontSize: "10pt", color: "#444", marginTop: 4 }}>{getExperienceParagraph(e)}</div> : null
                ) : (
                  getDisplayBullets(e.bullets).length > 0 && (
                    <ul className="exec-bullets">
                      {getDisplayBullets(e.bullets).map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
          )}
          {sectionVisibility.education && s.education.length > 0 && (
          <div className="exec-section" style={{ marginBottom: sectionGap }}>
            <div className="exec-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor, borderBottomColor: style.accentColor, borderBottomWidth: style.showDividers ? 2 : 0 }}>Education</div>
            {s.education.map((e, i) => (
              <div className="exec-edu-entry" key={i}>
                <div>
                  <strong>{e.institution}</strong>
                  <span style={{ color: "#555", fontSize: "10pt", marginLeft: 8 }}>{e.degree} in {e.field}</span>
                </div>
                <span style={{ fontSize: "9pt", color: "#777" }}>{e.year}{e.cgpa ? ` · CGPA ${e.cgpa}` : ""}</span>
              </div>
            ))}
          </div>
          )}
          {sectionVisibility.skills && s.skills.length > 0 && (
          <div className="exec-section" style={{ marginBottom: sectionGap }}>
            <div className="exec-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor, borderBottomColor: style.accentColor, borderBottomWidth: style.showDividers ? 2 : 0 }}>Core Competencies</div>
            {s.skills.map((sk, i) => (
              <div className="exec-skill-row" key={i}>
                <span className="exec-skill-label" style={{ color: style.headingColor }}>{sk.category}</span>
                <span className="exec-skill-items">{sk.items.join("  ·  ")}</span>
              </div>
            ))}
          </div>
          )}
          {sectionVisibility.projects && s.projects.length > 0 && (
          <div className="exec-section" style={{ marginBottom: sectionGap }}>
            <div className="exec-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor, borderBottomColor: style.accentColor, borderBottomWidth: style.showDividers ? 2 : 0 }}>Projects</div>
            {s.projects.map((pr, i) => (
              <div className="exec-proj" key={i}>
                {pr.link ? (
                  <a className="exec-link" href={toAbsoluteUrl(pr.link)} target="_blank" rel="noreferrer" style={{ fontSize: "10pt", fontWeight: 700 }}>
                    {pr.name}
                  </a>
                ) : (
                  <strong style={{ fontSize: "10pt" }}>{pr.name}</strong>
                )}
                <span style={{ fontSize: "9pt", color: "#666", marginLeft: 8 }}>{formatProjectTech(pr)}</span>
                {isParagraphMode(pr.contentMode) ? (
                  getProjectParagraph(pr) ? <div style={{ fontSize: "9.5pt", color: "#444", marginTop: 2 }}>{getProjectParagraph(pr)}</div> : null
                ) : (
                  getDisplayBullets(pr.bullets).length > 0 && (
                    <ul className="exec-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(pr.bullets).map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
          )}
          {sectionVisibility.certifications && s.certifications.length > 0 && (
          <div className="exec-section" style={{ marginBottom: sectionGap }}>
            <div className="exec-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor, borderBottomColor: style.accentColor, borderBottomWidth: style.showDividers ? 2 : 0 }}>Certifications</div>
            {s.certifications.map((c, i) => <div className="exec-cert" key={i}>{style.bulletStyle} {formatCertification(c)}</div>)}
          </div>
          )}
          {sectionVisibility.languages && s.languages.length > 0 && (
          <div className="exec-section" style={{ marginBottom: sectionGap }}>
            <div className="exec-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor, borderBottomColor: style.accentColor, borderBottomWidth: style.showDividers ? 2 : 0 }}>Languages</div>
            {s.languages.map((l, i) => (
              <div className="exec-cert" key={i}>{style.bulletStyle} {l.language}{l.proficiency ? ` (${l.proficiency})` : ""}</div>
            ))}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
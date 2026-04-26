import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
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
} from "@/components/templates/templateHelpers";

export function ModernTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
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
  const accent = style.accentColor;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
    .mod-wrap { font-family:'DM Sans',sans-serif; color:#111; background:#fff; padding:44px 52px; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .mod-wrap, .mod-wrap p, .mod-wrap span, .mod-wrap li, .mod-wrap div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .mod-name { font-family:'DM Serif Display',serif; font-size:32pt; color:#0F1A14; margin:0 0 2px; }
    .mod-tagline { font-size:10pt; font-weight:300; color:#555; letter-spacing:0.5px; margin-bottom:10px; }
    .mod-contact { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:9pt; color:#444; margin-bottom:20px; }
    .mod-link { color:inherit; text-decoration:none; }
    .mod-link:hover { text-decoration:underline; }
    .mod-social { display:flex; gap:10px; margin:6px 0 20px; color:#444; }
    .mod-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .mod-social-link:hover { background:rgba(0,0,0,0.05); }
    .mod-section { margin-bottom:16px; border-left:3px solid ${accent}; padding-left:14px; }
    .mod-section-title { font-size:10pt; font-weight:600; color:${accent}; text-transform:uppercase; letter-spacing:1.8px; margin-bottom:8px; }
    .mod-summary { font-size:10pt; line-height:1.6; color:#333; font-weight:300; }
    .mod-job { margin-bottom:12px; }
    .mod-job-head { display:flex; justify-content:space-between; }
    .mod-role { font-weight:600; font-size:10.5pt; }
    .mod-company { font-size:10pt; color:${accent}; font-weight:500; }
    .mod-meta { font-size:9pt; color:#777; }
    .mod-bullets { margin:4px 0 0 0; padding:0; list-style:none; }
    .mod-bullets li { font-size:9.5pt; margin-bottom:3px; font-weight:300; line-height:1.5; display:flex; align-items:flex-start; gap:8px; }
    .mod-bullets li::before { content:'${style.bulletStyle}'; color:${accent}; font-weight:600; line-height:inherit; }
    .mod-edu { display:flex; justify-content:space-between; margin-bottom:4px; }
    .mod-skills-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
    .mod-skill-chip { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:3px; padding:3px 8px; font-size:9pt; color:#166534; font-weight:500; text-align:center; }
    .mod-proj { margin-bottom:8px; }
    .mod-proj-name { font-weight:600; color:${accent}; font-size:10pt; }
    .mod-cert { font-size:9.5pt; padding:2px 0; }
    .mod-section-nosplit { margin-bottom:16px; padding-left:17px; border-left:3px solid ${accent}; }
  `;
  return (
    <>
      <style>{css}</style>
      <div className="mod-wrap" style={{ background: style.backgroundColor, color: style.textColor, fontFamily: style.bodyFont, fontSize: style.fontSize, lineHeight: style.lineHeight, padding: pagePadding, height: "100%", minHeight: "100%" }}>
        <h1 className="mod-name" style={{ color: style.headingColor, fontFamily: style.headingFont, textAlign: style.headerAlign }}>{p.name}</h1>
        {p.title && <div className="mod-tagline" style={{ color: style.mutedColor, textAlign: style.headerAlign }}>{p.title}</div>}
        {contactItems.length > 0 && (
          <div className="mod-contact" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {contactItems.map((item, i) => (
              <span key={i}>
                {i > 0 ? " · " : ""}
                {item.href ? (
                  <a className="mod-link" href={item.href} target="_blank" rel="noreferrer">{item.label}</a>
                ) : (
                  item.label
                )}
              </span>
            ))}
          </div>
        )}

        {socialItems.length > 0 && (
          <div className="mod-social" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
            {socialItems.map((item, i) => (
              <a key={i} className="mod-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                <SocialIcon kind={item.kind} />
              </a>
            ))}
          </div>
        )}
 
        {p.summary && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Summary</div>
            <p className="mod-summary">{renderTextWithLinks(p.summary)}</p>
          </div>
        )}
 
        {sectionVisibility.experience && s.experience.length > 0 && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Experience</div>
            {s.experience.map((e, i) => (
              <div className="mod-job" key={i}>
                <div className="mod-job-head">
                  <div>
                    <div className="mod-role" style={{ color: style.headingColor }}>{e.role}</div>
                    <div className="mod-company" style={{ color: style.accentColor }}>{e.company} · {e.location}</div>
                  </div>
                  <div className="mod-meta" style={{ color: style.mutedColor }}>{formatDateRange(e.start, e.end, e.current)}</div>
                </div>
                {isParagraphMode(e.contentMode) ? (
                  getExperienceParagraph(e) ? <div style={{ fontSize: "9.5pt", color: "#444", marginTop: 4 }}>{renderTextWithLinks(getExperienceParagraph(e))}</div> : null
                ) : (
                  getDisplayBullets(e.bullets).length > 0 && (
                    <ul className="mod-bullets">
                      {getDisplayBullets(e.bullets).map((b, j) => <li key={j}>{renderTextWithLinks(b)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.education && s.education.length > 0 && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Education</div>
            {s.education.map((e, i) => (
              <div className="mod-edu" key={i}>
                <div>
                  <strong>{e.institution}</strong>
                  <span style={{ color: "#555", fontSize: "9.5pt", marginLeft: 8 }}>{e.degree} {e.field}</span>
                </div>
                <span style={{ fontSize: "9pt", color: "#777" }}>{e.year}</span>
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.skills && s.skills.length > 0 && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Skills</div>
            {s.skills.map((sk, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: "9.5pt", fontWeight: 600, marginBottom: 4, color: style.headingColor }}>{sk.category}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {sk.items.map((item, j) => (
                    <span className="mod-skill-chip" key={j} style={{ color: style.accentColor, borderColor: style.borderColor }}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.projects && s.projects.length > 0 && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Projects</div>
            {s.projects.map((pr, i) => (
              <div className="mod-proj" key={i}>
                {pr.link ? (
                  <a className="mod-proj-name mod-link" style={{ color: style.headingColor }} href={toAbsoluteUrl(pr.link)} target="_blank" rel="noreferrer">
                    {pr.name}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <span className="mod-proj-name" style={{ color: style.headingColor }}>{pr.name}</span>
                )}
                <span style={{ color: "#888", fontSize: "9pt", marginLeft: 8 }}>{formatProjectTech(pr)}</span>
                {isParagraphMode(pr.contentMode) ? (
                  getProjectParagraph(pr) ? <div style={{ fontSize: "9.5pt", color: "#444", fontWeight: 300, marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(pr))}</div> : null
                ) : (
                  getDisplayBullets(pr.bullets).length > 0 && (
                    <ul className="mod-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(pr.bullets).map((b, j) => <li key={j}>{renderTextWithLinks(b)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.certifications && s.certifications.length > 0 && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Certifications</div>
            {s.certifications.map((c, i) => <div className="mod-cert" key={i}>{style.bulletStyle} {formatCertification(c)}</div>)}
          </div>
        )}

        {sectionVisibility.languages && s.languages.length > 0 && (
          <div className="mod-section" style={{ marginBottom: sectionGap }}>
            <div className="mod-section-title" style={{ color: style.accentColor }}>Languages</div>
            {s.languages.map((l, i) => (
              <div className="mod-cert" key={i}>{style.bulletStyle} {l.language}{l.proficiency ? ` (${l.proficiency})` : ""}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

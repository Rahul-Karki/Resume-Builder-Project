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
  getSocialIconComponent,
} from "@/components/templates/templateHelpers";

export function ModernTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
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
                {getSocialIconComponent(item.href, { width: 14, height: 14 })}
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

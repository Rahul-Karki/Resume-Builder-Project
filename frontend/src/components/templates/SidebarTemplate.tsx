import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import { ExternalLinkIcon, formatDateRange, formatProjectTech, getDisplayBullets, getExperienceParagraph, getProjectParagraph, getSocialIconComponent, isParagraphMode, renderTextWithLinks, toAbsoluteUrl, toMailto, toTel } from "@/components/templates/templateHelpers";

export function SidebarTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;700&display=swap');
    .side-wrap { display:grid; grid-template-columns:210px 1fr; width:100%; height:100%; min-height:100%; max-width:none; margin:0; font-family:'Nunito Sans',sans-serif; color:#1a1a1a; background:#fff; box-sizing:border-box; }
    .side-left { background:#1E293B; color:#CBD5E1; padding:32px 22px; }
    .side-name { font-family:'Nunito',sans-serif; font-size:18pt; font-weight:700; color:#F1F5F9; margin:0 0 2px; line-height:1.2; }
    .side-subtitle { font-size:8.5pt; color:#94A3B8; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px; }
    .side-contact-item { display:flex; align-items:flex-start; gap:6px; font-size:8.5pt; color:#94A3B8; margin-bottom:6px; }
    .side-contact-icon { color:#64748B; width:12px; flex-shrink:0; }
    .side-link { color:inherit; text-decoration:none; }
    .side-link:hover { text-decoration:underline; }
    .side-social { display:flex; gap:10px; margin-top:10px; color:#94A3B8; }
    .side-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .side-social-link:hover { background:rgba(255,255,255,0.10); }
    .side-left-section { margin-bottom:20px; }
    .side-left-title { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#64748B; margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:4px; }
    .side-skill-block { margin-bottom:8px; }
    .side-skill-name { font-size:8.5pt; font-weight:600; color:#CBD5E1; margin-bottom:3px; }
    .side-skill-dots { display:flex; gap:3px; }
    .side-dot { width:8px; height:8px; border-radius:50%; }
    .side-tag { display:inline-block; background:#334155; color:#94A3B8; font-size:7.5pt; padding:2px 7px; border-radius:3px; margin:2px 2px 0 0; }
    .side-right { padding:32px 32px 32px 28px; height:100%; }
    .side-right, .side-right p, .side-right span, .side-right li, .side-right div { font-size:${style.fontSize}; line-height:${style.lineHeight}; }
    .side-section { margin-bottom:18px; }
    .side-section-title { font-family:'Nunito',sans-serif; font-size:10.5pt; font-weight:700; color:#1E293B; text-transform:uppercase; letter-spacing:1.5px; padding-bottom:3px; margin-bottom:10px; position:relative; }
    .side-section-title::after { content:""; display:block; width:64px; height:2px; background:#1E293B; margin-top:4px; }
    .side-summary { font-size:9.5pt; font-weight:300; line-height:1.6; color:#334155; }
    .side-job { margin-bottom:12px; }
    .side-job-top { display:flex; justify-content:space-between; }
    .side-role { font-size:10pt; font-weight:700; color:#1E293B; }
    .side-company { font-size:9pt; color:#475569; font-weight:400; }
    .side-date { font-size:8.5pt; color:#94A3B8; background:#F1F5F9; padding:1px 7px; border-radius:3px; white-space:nowrap; font-family:'Nunito',sans-serif; }
    .side-bullets { margin:4px 0 0 0; padding:0; list-style:none; }
    .side-bullets li { font-size:9pt; font-weight:300; margin-bottom:3px; line-height:1.5; display:flex; align-items:flex-start; gap:8px; }
    .side-bullets li::before { content:'${style.bulletStyle}'; color:${style.accentColor}; font-weight:700; line-height:inherit; }
    .side-edu { margin-bottom:8px; }
    .side-proj { margin-bottom:8px; font-size:9pt; }
    .side-proj-name { font-weight:700; color:#1E293B; }
    .side-cert { font-size:9pt; margin-bottom:3px; font-weight:300; color:#334155; }
  `;
 
  const allSkillItems = s.skills.flatMap(sk => sk.items);
  const nameParts = p.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const remainingName = nameParts.slice(1).join(" ");
  const contactItems = [
    p.email ? { icon: "✉", label: p.email, href: toMailto(p.email) } : null,
    p.phone ? { icon: "☎", label: p.phone, href: toTel(p.phone) } : null,
    p.location ? { icon: "⌖", label: p.location, href: "" } : null,
  ].filter(Boolean) as Array<{ icon: string; label: string; href: string }>;

  const socialItems = [
    p.linkedin ? { href: toAbsoluteUrl(p.linkedin), label: "LinkedIn", kind: "linkedin" as const } : null,
    p.github ? { href: toAbsoluteUrl(p.github), label: "GitHub", kind: "github" as const } : null,
    p.portfolio ? { href: toAbsoluteUrl(p.portfolio), label: "Website", kind: "portfolio" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; kind: "linkedin" | "github" | "portfolio" }>;


  return (
    <>
      <style>{css}</style>
      <div className="side-wrap" style={{ background: style.backgroundColor, height: "100%", minHeight: "100%" }}>
        {/* LEFT SIDEBAR */}
        <div className="side-left" style={{ background: style.accentColor }}>
          {p.name && <div className="side-name" style={{ fontFamily: style.headingFont }}>{firstName}<br />{remainingName}</div>}
          {p.title && <div className="side-subtitle" style={{ color: style.mutedColor }}>{p.title}</div>}
 
          {contactItems.length > 0 && (
            <div className="side-left-section">
              <div className="side-left-title">Contact</div>
              {contactItems.map((item, i) => (
                <div className="side-contact-item" key={i}>
                  <span>{item.icon}</span>
                  <span>
                    {item.href ? (
                      <a className="side-link" href={item.href} target="_blank" rel="noreferrer">
                        {item.label}
                      </a>
                    ) : (
                      item.label
                    )}
                  </span>
                </div>
              ))}

              {socialItems.length > 0 && (
                <div className="side-social" aria-label="Social links">
                  {socialItems.map((item, i) => (
                    <a key={i} className="side-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                      {getSocialIconComponent(item.href, { width: 14, height: 14, kind: item.kind })}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
 
          {sectionVisibility.education && s.education.length > 0 && (
          <div className="side-left-section">
            <div className="side-left-title">Education</div>
            {s.education.map((e, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: "9pt", fontWeight: 600, color: "#CBD5E1" }}>{e.institution}</div>
                <div style={{ fontSize: "8pt", color: "#94A3B8" }}>{e.degree} {e.field}</div>
                <div style={{ fontSize: "8pt", color: "#64748B" }}>{e.year}</div>
              </div>
            ))}
          </div>
          )}
 
          {sectionVisibility.skills && s.skills.length > 0 && (
          <div className="side-left-section">
            <div className="side-left-title">Tech Stack</div>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {allSkillItems.map((sk, i) => (
                <span className="side-tag" key={i}>{sk}</span>
              ))}
            </div>
          </div>
          )}
 
          {sectionVisibility.certifications && s.certifications.length > 0 && (
          <div className="side-left-section">
            <div className="side-left-title">Certifications</div>
            {s.certifications.map((c, i) => (
              <div key={i} style={{ fontSize: "8pt", color: "#94A3B8", marginBottom: 5, lineHeight: 1.4 }}>{c.name}</div>
            ))}
          </div>
          )}

          {sectionVisibility.languages && s.languages.length > 0 && (
          <div className="side-left-section">
            <div className="side-left-title">Languages</div>
            {s.languages.map((l, i) => (
              <div key={i} style={{ fontSize: "8pt", color: "#94A3B8", marginBottom: 5, lineHeight: 1.4 }}>
                {l.language}{l.proficiency ? ` (${l.proficiency})` : ""}
              </div>
            ))}
          </div>
          )}
        </div>
 
        {/* RIGHT MAIN */}
        <div className="side-right" style={{ padding: pagePadding, color: style.textColor, fontFamily: style.bodyFont, fontSize: style.fontSize, lineHeight: style.lineHeight }}>
          {p.summary && (
          <div className="side-section" style={{ marginBottom: sectionGap }}>
            <div className="side-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor }}>Profile</div>
            <p className="side-summary">{renderTextWithLinks(p.summary)}</p>
          </div>
          )}
          {sectionVisibility.experience && s.experience.length > 0 && (
          <div className="side-section" style={{ marginBottom: sectionGap }}>
            <div className="side-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor }}>Experience</div>
            {s.experience.map((e, i) => (
              <div className="side-job" key={i}>
                <div className="side-job-top">
                  <div>
                    <div className="side-role" style={{ color: style.headingColor }}>{e.role}</div>
                    <div className="side-company" style={{ color: style.mutedColor }}>{e.company} · {e.location}</div>
                  </div>
                  <span className="side-date" style={{ color: style.mutedColor }}>{formatDateRange(e.start, e.end, e.current)}</span>
                </div>
                {isParagraphMode(e.contentMode) ? (
                  getExperienceParagraph(e) ? <div style={{ color: "#475569", fontWeight: 300, marginTop: 4 }}>{renderTextWithLinks(getExperienceParagraph(e))}</div> : null
                ) : (
                  getDisplayBullets(e.bullets).length > 0 && (
                    <ul className="side-bullets">
                      {getDisplayBullets(e.bullets).map((b, j) => <li key={j}>{renderTextWithLinks(b)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
          )}
          {sectionVisibility.projects && s.projects.length > 0 && (
          <div className="side-section" style={{ marginBottom: sectionGap }}>
            <div className="side-section-title" style={{ fontFamily: style.headingFont, color: style.accentColor }}>Projects</div>
            {s.projects.map((pr, i) => (
              <div className="side-proj" key={i}>
                {pr.link ? (
                  <a className="side-proj-name side-link" style={{ color: style.headingColor }} href={toAbsoluteUrl(pr.link)} target="_blank" rel="noreferrer">
                    {pr.name}
                    <ExternalLinkIcon />
                  </a>
                ) : (
                  <span className="side-proj-name" style={{ color: style.headingColor }}>{pr.name}</span>
                )}
                <span style={{ color: "#94A3B8", fontSize: "8.5pt", marginLeft: 6 }}>{formatProjectTech(pr)}</span>
                {isParagraphMode(pr.contentMode) ? (
                  getProjectParagraph(pr) ? <div style={{ color: "#475569", fontWeight: 300, marginTop: 2 }}>{renderTextWithLinks(getProjectParagraph(pr))}</div> : null
                ) : (
                  getDisplayBullets(pr.bullets).length > 0 && (
                    <ul className="side-bullets" style={{ marginTop: 2 }}>
                      {getDisplayBullets(pr.bullets).map((b, j) => <li key={j}>{renderTextWithLinks(b)}</li>)}
                    </ul>
                  )
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
 

 


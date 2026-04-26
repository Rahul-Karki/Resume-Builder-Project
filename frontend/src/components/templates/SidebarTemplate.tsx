import { ResumeDocument, marginMap, spacingMap } from "@/types/resume-types";
import { ExternalLinkIcon, formatDateRange, formatProjectTech, getDisplayBullets, getExperienceParagraph, getProjectParagraph, isParagraphMode, renderTextWithLinks, toAbsoluteUrl, toMailto, toTel } from "@/components/templates/templateHelpers";

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
                      <SocialIcon kind={item.kind} />
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
 

 


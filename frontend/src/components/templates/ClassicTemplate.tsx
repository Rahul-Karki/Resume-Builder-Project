import { ResumeDocument } from "@/types/resume-types";
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
} from "@/components/templates/templateHelpers";

export function ClassicTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, style } = data;
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
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Source+Sans+3:wght@400;600&display=swap');
    .classic-wrap { font-family:'Source Sans 3',sans-serif; color:#1a1a1a; font-size:10.5pt; line-height:1.5; background:#fff; padding:48px 52px; width:100%; height:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .classic-name { font-family:'EB Garamond',serif; font-size:28pt; font-weight:500; letter-spacing:0.5px; margin:0 0 4px; color:#111; }
    .classic-contact { font-size:9pt; color:#444; display:flex; flex-wrap:wrap; gap:4px 16px; margin-bottom:18px; }
    .classic-contact span::before { content:''; }
    .classic-link { color:inherit; text-decoration:none; }
    .classic-link:hover { text-decoration:underline; }
    .classic-social { display:flex; gap:10px; margin-bottom:18px; color:#444; }
    .classic-social-link { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:999px; }
    .classic-social-link:hover { background:rgba(0,0,0,0.05); }
    .classic-divider { border:none; border-top:1.5px solid #1a1a1a; margin:0 0 10px; }
    .classic-thin { border:none; border-top:0.5px solid #ccc; margin:0 0 10px; }
    .classic-section-title { font-family:'EB Garamond',serif; font-size:13pt; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; margin:0 0 6px; color:#111; }
    .classic-summary { margin-bottom:14px; font-size:10pt; color:#333; }
    .classic-job { margin-bottom:12px; }
    .classic-job-header { display:flex; justify-content:space-between; align-items:baseline; }
    .classic-role { font-weight:600; font-size:10.5pt; }
    .classic-company { font-size:10pt; color:#333; font-style:italic; }
    .classic-date { font-size:9pt; color:#555; white-space:nowrap; }
    .classic-bullets { margin:4px 0 0 0; padding:0; list-style:none; }
    .classic-bullets li { margin-bottom:3px; font-size:10pt; display:flex; align-items:flex-start; gap:8px; }
    .classic-bullets li::before { content:'${style.bulletStyle}'; color:#111; line-height:inherit; }
    .classic-edu-row { display:flex; justify-content:space-between; }
    .classic-skills-row { display:flex; gap:24px; flex-wrap:wrap; margin-bottom:6px; }
    .classic-skill-cat { font-weight:600; min-width:100px; font-size:10pt; }
    .classic-skill-val { font-size:10pt; color:#333; }
    .classic-proj { margin-bottom:8px; }
    .classic-proj-name { font-weight:600; font-size:10pt; }
    .classic-cert { font-size:10pt; margin-bottom:3px; }
    section { margin-bottom:14px; }
  `;
  return (
    <>
      <style>{css}</style>
      <div className="classic-wrap">
        <h1 className="classic-name">{p.name}</h1>
        <div className="classic-contact">
          <span>{p.email ? <a className="classic-link" href={toMailto(p.email)} target="_blank" rel="noreferrer">{p.email}</a> : null}</span><span>·</span>
          <span>{p.phone ? <a className="classic-link" href={toTel(p.phone)} target="_blank" rel="noreferrer">{p.phone}</a> : null}</span><span>·</span>
          <span>{p.location}</span><span>·</span>
          <span>{p.linkedin ? <a className="classic-link" href={toAbsoluteUrl(p.linkedin)} target="_blank" rel="noreferrer">{p.linkedin}</a> : null}</span><span>·</span>
          <span>{p.github ? <a className="classic-link" href={toAbsoluteUrl(p.github)} target="_blank" rel="noreferrer">{p.github}</a> : null}</span><span>·</span>
          <span>{p.portfolio ? <a className="classic-link" href={toAbsoluteUrl(p.portfolio)} target="_blank" rel="noreferrer">{p.portfolio}</a> : null}</span>
        </div>
        {socialItems.length > 0 && (
          <div className="classic-social">
            {socialItems.map((item, i) => (
              <a key={i} className="classic-social-link" href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                <SocialIcon kind={item.kind} />
              </a>
            ))}
          </div>
        )}
        <hr className="classic-divider" />
        <section>
          <p className="classic-summary">{p.summary}</p>
        </section>
        <section>
          <div className="classic-section-title">Experience</div>
          <hr className="classic-thin" />
          {s.experience.map((e, i) => (
            <div className="classic-job" key={i}>
              <div className="classic-job-header">
                <div>
                  <span className="classic-role">{e.role}</span>
                  <span style={{ margin: "0 6px", color: "#666" }}>—</span>
                  <span className="classic-company">{e.company}, {e.location}</span>
                </div>
                <span className="classic-date">{formatDateRange(e.start, e.end, e.current)}</span>
              </div>
              {isParagraphMode(e.contentMode) ? (
                getExperienceParagraph(e) ? <div style={{ fontSize: "10pt", color: "#333", marginTop: 2 }}>{getExperienceParagraph(e)}</div> : null
              ) : (
                getDisplayBullets(e.bullets).length > 0 && (
                  <ul className="classic-bullets">
                    {getDisplayBullets(e.bullets).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )
              )}
            </div>
          ))}
        </section>
        <section>
          <div className="classic-section-title">Education</div>
          <hr className="classic-thin" />
          {s.education.map((e, i) => (
            <div className="classic-edu-row" key={i}>
              <div>
                <strong>{e.institution}</strong>
                <span style={{ marginLeft: 8, fontSize: "10pt", color: "#333" }}>{e.degree} {e.field}</span>
              </div>
              <span style={{ fontSize: "9pt", color: "#555" }}>{e.year}{e.cgpa ? ` · CGPA: ${e.cgpa}` : ""}</span>
            </div>
          ))}
        </section>
        <section>
          <div className="classic-section-title">Skills</div>
          <hr className="classic-thin" />
          {s.skills.map((sk, i) => (
            <div className="classic-skills-row" key={i}>
              <span className="classic-skill-cat">{sk.category}:</span>
              <span className="classic-skill-val">{sk.items.join(" · ")}</span>
            </div>
          ))}
        </section>
        <section>
          <div className="classic-section-title">Projects</div>
          <hr className="classic-thin" />
          {s.projects.map((pr, i) => (
            <div className="classic-proj" key={i}>
              {pr.link ? (
                <a className="classic-proj-name classic-link" href={toAbsoluteUrl(pr.link)} target="_blank" rel="noreferrer">{pr.name}</a>
              ) : (
                <span className="classic-proj-name">{pr.name}</span>
              )}
              <span style={{ margin: "0 6px", color: "#888" }}>|</span>
              <span style={{ fontSize: "9.5pt", color: "#555" }}>{formatProjectTech(pr)}</span>
              {isParagraphMode(pr.contentMode) ? (
                getProjectParagraph(pr) ? <div style={{ fontSize: "10pt", color: "#333", marginTop: 2 }}>{getProjectParagraph(pr)}</div> : null
              ) : (
                getDisplayBullets(pr.bullets).length > 0 && (
                  <ul className="classic-bullets" style={{ marginTop: 2 }}>
                    {getDisplayBullets(pr.bullets).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )
              )}
            </div>
          ))}
        </section>
        <section>
          <div className="classic-section-title">Certifications</div>
          <hr className="classic-thin" />
          {s.certifications.map((c, i) => <div className="classic-cert" key={i}>· {formatCertification(c)}</div>)}
        </section>
      </div>
    </>
  );
}
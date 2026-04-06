import { ResumeDocument } from "@/types/resume-types";
import { formatDateRange, formatProjectTech } from "@/components/templates/templateHelpers";

export function SidebarTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility } = data;
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;700&display=swap');
    .side-wrap { display:grid; grid-template-columns:210px 1fr; min-height:1040px; max-width:794px; margin:0 auto; font-family:'Nunito Sans',sans-serif; color:#1a1a1a; background:#fff; box-sizing:border-box; }
    .side-left { background:#1E293B; color:#CBD5E1; padding:32px 22px; }
    .side-name { font-family:'Nunito',sans-serif; font-size:18pt; font-weight:700; color:#F1F5F9; margin:0 0 2px; line-height:1.2; }
    .side-subtitle { font-size:8.5pt; color:#94A3B8; letter-spacing:1px; text-transform:uppercase; margin-bottom:20px; }
    .side-contact-item { display:flex; align-items:flex-start; gap:6px; font-size:8.5pt; color:#94A3B8; margin-bottom:6px; }
    .side-contact-icon { color:#64748B; width:12px; flex-shrink:0; }
    .side-left-section { margin-bottom:20px; }
    .side-left-title { font-size:7.5pt; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#64748B; margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:4px; }
    .side-skill-block { margin-bottom:8px; }
    .side-skill-name { font-size:8.5pt; font-weight:600; color:#CBD5E1; margin-bottom:3px; }
    .side-skill-dots { display:flex; gap:3px; }
    .side-dot { width:8px; height:8px; border-radius:50%; }
    .side-tag { display:inline-block; background:#334155; color:#94A3B8; font-size:7.5pt; padding:2px 7px; border-radius:3px; margin:2px 2px 0 0; }
    .side-right { padding:32px 32px 32px 28px; }
    .side-section { margin-bottom:18px; }
    .side-section-title { font-family:'Nunito',sans-serif; font-size:10.5pt; font-weight:700; color:#1E293B; text-transform:uppercase; letter-spacing:1.5px; border-bottom:2px solid #1E293B; padding-bottom:3px; margin-bottom:10px; }
    .side-summary { font-size:9.5pt; font-weight:300; line-height:1.6; color:#334155; }
    .side-job { margin-bottom:12px; }
    .side-job-top { display:flex; justify-content:space-between; }
    .side-role { font-size:10pt; font-weight:700; color:#1E293B; }
    .side-company { font-size:9pt; color:#475569; font-weight:400; }
    .side-date { font-size:8.5pt; color:#94A3B8; background:#F1F5F9; padding:1px 7px; border-radius:3px; white-space:nowrap; font-family:'Nunito',sans-serif; }
    .side-bullets { margin:4px 0 0 14px; padding:0; }
    .side-bullets li { font-size:9pt; font-weight:300; margin-bottom:3px; line-height:1.5; }
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
    p.email ? { icon: "✉", value: p.email } : null,
    p.phone ? { icon: "☎", value: p.phone } : null,
    p.location ? { icon: "⌖", value: p.location } : null,
    p.linkedin ? { icon: "⌘", value: p.linkedin } : null,
    p.portfolio ? { icon: "◈", value: p.portfolio } : null,
  ].filter(Boolean) as Array<{ icon: string; value: string }>;
  return (
    <>
      <style>{css}</style>
      <div className="side-wrap">
        {/* LEFT SIDEBAR */}
        <div className="side-left">
          {p.name && <div className="side-name">{firstName}<br />{remainingName}</div>}
          {p.title && <div className="side-subtitle">{p.title}</div>}
 
          {contactItems.length > 0 && (
            <div className="side-left-section">
              <div className="side-left-title">Contact</div>
              {contactItems.map((item, i) => (
                <div className="side-contact-item" key={i}><span>{item.icon}</span><span>{item.value}</span></div>
              ))}
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
        <div className="side-right">
          {p.summary && (
          <div className="side-section">
            <div className="side-section-title">Profile</div>
            <p className="side-summary">{p.summary}</p>
          </div>
          )}
          {sectionVisibility.experience && s.experience.length > 0 && (
          <div className="side-section">
            <div className="side-section-title">Experience</div>
            {s.experience.map((e, i) => (
              <div className="side-job" key={i}>
                <div className="side-job-top">
                  <div>
                    <div className="side-role">{e.role}</div>
                    <div className="side-company">{e.company} · {e.location}</div>
                  </div>
                  <span className="side-date">{formatDateRange(e.start, e.end, e.current)}</span>
                </div>
                <ul className="side-bullets">
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
          )}
          {sectionVisibility.projects && s.projects.length > 0 && (
          <div className="side-section">
            <div className="side-section-title">Projects</div>
            {s.projects.map((pr, i) => (
              <div className="side-proj" key={i}>
                <span className="side-proj-name">{pr.name}</span>
                <span style={{ color: "#94A3B8", fontSize: "8.5pt", marginLeft: 6 }}>{formatProjectTech(pr)}</span>
                <div style={{ color: "#475569", fontWeight: 300, marginTop: 2 }}>{pr.description}</div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </>
  );
}
 

 


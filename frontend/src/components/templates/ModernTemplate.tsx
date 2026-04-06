import { ResumeDocument } from "@/types/resume-types";
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
} from "@/components/templates/templateHelpers";

export function ModernTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility } = data;
  const contactItems = [p.email, p.phone, p.location, p.linkedin, p.portfolio].filter(Boolean);
  const accent = "#0F766E";
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
    .mod-wrap { font-family:'DM Sans',sans-serif; color:#111; background:#fff; padding:44px 52px; max-width:794px; margin:0 auto; box-sizing:border-box; }
    .mod-name { font-family:'DM Serif Display',serif; font-size:32pt; color:#0F1A14; margin:0 0 2px; }
    .mod-tagline { font-size:10pt; font-weight:300; color:#555; letter-spacing:0.5px; margin-bottom:10px; }
    .mod-contact { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:9pt; color:#444; margin-bottom:20px; }
    .mod-section { margin-bottom:16px; border-left:3px solid ${accent}; padding-left:14px; }
    .mod-section-title { font-size:10pt; font-weight:600; color:${accent}; text-transform:uppercase; letter-spacing:1.8px; margin-bottom:8px; }
    .mod-summary { font-size:10pt; line-height:1.6; color:#333; font-weight:300; }
    .mod-job { margin-bottom:12px; }
    .mod-job-head { display:flex; justify-content:space-between; }
    .mod-role { font-weight:600; font-size:10.5pt; }
    .mod-company { font-size:10pt; color:${accent}; font-weight:500; }
    .mod-meta { font-size:9pt; color:#777; }
    .mod-bullets { margin:4px 0 0 0; padding-left:16px; }
    .mod-bullets li { font-size:9.5pt; margin-bottom:3px; font-weight:300; line-height:1.5; }
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
      <div className="mod-wrap">
        <h1 className="mod-name">{p.name}</h1>
        {p.title && <div className="mod-tagline">{p.title}</div>}
        {contactItems.length > 0 && (
          <div className="mod-contact">
            {contactItems.map((item, i) => (
              <span key={i}>{i > 0 ? ` · ${item}` : item}</span>
            ))}
          </div>
        )}
 
        {p.summary && (
          <div className="mod-section">
            <div className="mod-section-title">Summary</div>
            <p className="mod-summary">{p.summary}</p>
          </div>
        )}
 
        {sectionVisibility.experience && s.experience.length > 0 && (
          <div className="mod-section">
            <div className="mod-section-title">Experience</div>
            {s.experience.map((e, i) => (
              <div className="mod-job" key={i}>
                <div className="mod-job-head">
                  <div>
                    <div className="mod-role">{e.role}</div>
                    <div className="mod-company">{e.company} · {e.location}</div>
                  </div>
                  <div className="mod-meta">{formatDateRange(e.start, e.end, e.current)}</div>
                </div>
                <ul className="mod-bullets">
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.education && s.education.length > 0 && (
          <div className="mod-section">
            <div className="mod-section-title">Education</div>
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
          <div className="mod-section">
            <div className="mod-section-title">Skills</div>
            {s.skills.map((sk, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: "9.5pt", fontWeight: 600, marginBottom: 4, color: "#333" }}>{sk.category}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {sk.items.map((item, j) => (
                    <span className="mod-skill-chip" key={j}>{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.projects && s.projects.length > 0 && (
          <div className="mod-section">
            <div className="mod-section-title">Projects</div>
            {s.projects.map((pr, i) => (
              <div className="mod-proj" key={i}>
                <span className="mod-proj-name">{pr.name}</span>
                <span style={{ color: "#888", fontSize: "9pt", marginLeft: 8 }}>{formatProjectTech(pr)}</span>
                <div style={{ fontSize: "9.5pt", color: "#444", fontWeight: 300, marginTop: 2 }}>{pr.description}</div>
              </div>
            ))}
          </div>
        )}
 
        {sectionVisibility.certifications && s.certifications.length > 0 && (
          <div className="mod-section">
            <div className="mod-section-title">Certifications</div>
            {s.certifications.map((c, i) => <div className="mod-cert" key={i}>→ {formatCertification(c)}</div>)}
          </div>
        )}

        {sectionVisibility.languages && s.languages.length > 0 && (
          <div className="mod-section">
            <div className="mod-section-title">Languages</div>
            {s.languages.map((l, i) => (
              <div className="mod-cert" key={i}>{l.language}{l.proficiency ? ` (${l.proficiency})` : ""}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
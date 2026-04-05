import { ResumeDocument } from "@/types/resume-types";
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
} from "@/components/templates/templateHelpers";

export function ClassicTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s } = data;
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Source+Sans+3:wght@400;600&display=swap');
    .classic-wrap { font-family:'Source Sans 3',sans-serif; color:#1a1a1a; font-size:10.5pt; line-height:1.5; background:#fff; padding:48px 52px; max-width:794px; margin:0 auto; box-sizing:border-box; }
    .classic-name { font-family:'EB Garamond',serif; font-size:28pt; font-weight:500; letter-spacing:0.5px; margin:0 0 4px; color:#111; }
    .classic-contact { font-size:9pt; color:#444; display:flex; flex-wrap:wrap; gap:4px 16px; margin-bottom:18px; }
    .classic-contact span::before { content:''; }
    .classic-divider { border:none; border-top:1.5px solid #1a1a1a; margin:0 0 10px; }
    .classic-thin { border:none; border-top:0.5px solid #ccc; margin:0 0 10px; }
    .classic-section-title { font-family:'EB Garamond',serif; font-size:13pt; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; margin:0 0 6px; color:#111; }
    .classic-summary { margin-bottom:14px; font-size:10pt; color:#333; }
    .classic-job { margin-bottom:12px; }
    .classic-job-header { display:flex; justify-content:space-between; align-items:baseline; }
    .classic-role { font-weight:600; font-size:10.5pt; }
    .classic-company { font-size:10pt; color:#333; font-style:italic; }
    .classic-date { font-size:9pt; color:#555; white-space:nowrap; }
    .classic-bullets { margin:4px 0 0 16px; padding:0; }
    .classic-bullets li { margin-bottom:3px; font-size:10pt; }
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
          <span>{p.email}</span><span>·</span>
          <span>{p.phone}</span><span>·</span>
          <span>{p.location}</span><span>·</span>
          <span>{p.linkedin}</span><span>·</span>
          <span>{p.portfolio}</span>
        </div>
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
              <ul className="classic-bullets">
                {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
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
              <span className="classic-proj-name">{pr.name}</span>
              <span style={{ margin: "0 6px", color: "#888" }}>|</span>
              <span style={{ fontSize: "9.5pt", color: "#555" }}>{formatProjectTech(pr)}</span>
              <div style={{ fontSize: "10pt", color: "#333", marginTop: 2 }}>{pr.description}</div>
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
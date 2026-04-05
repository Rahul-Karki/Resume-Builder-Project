import { ResumeDocument } from "../../types/resume-types";
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
} from "./templateHelpers";

export function CompactTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s } = data;
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&display=swap');
    .comp-wrap { font-family:'IBM Plex Sans',sans-serif; color:#1a1a1a; background:#fff; padding:32px 44px; max-width:794px; margin:0 auto; box-sizing:border-box; font-size:9.5pt; line-height:1.45; }
    .comp-header { border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:10px; }
    .comp-name { font-family:'IBM Plex Serif',serif; font-size:24pt; font-weight:600; margin:0 0 4px; }
    .comp-contact { display:flex; flex-wrap:wrap; gap:3px 12px; font-size:8.5pt; color:#444; }
    .comp-row { display:grid; grid-template-columns:100px 1fr; gap:0 16px; margin-bottom:10px; align-items:start; }
    .comp-label { font-size:8pt; font-weight:600; text-transform:uppercase; letter-spacing:1.2px; color:#555; padding-top:1px; }
    .comp-content {}
    .comp-section-rule { border-top:0.5px solid #ccc; margin:10px 0; }
    .comp-job { margin-bottom:8px; }
    .comp-job-line { display:flex; justify-content:space-between; margin-bottom:2px; }
    .comp-role { font-weight:600; font-size:9.5pt; }
    .comp-company { font-size:9pt; color:#444; }
    .comp-date { font-size:8.5pt; color:#666; white-space:nowrap; }
    .comp-bullets { margin:2px 0 0 12px; padding:0; }
    .comp-bullets li { margin-bottom:2px; font-size:9pt; font-weight:300; }
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
      <div className="comp-wrap">
        <div className="comp-header">
          <div className="comp-name">{p.name}</div>
          <div className="comp-contact">
            <span>{p.email}</span><span>·</span><span>{p.phone}</span><span>·</span>
            <span>{p.location}</span><span>·</span><span>{p.linkedin}</span><span>·</span><span>{p.portfolio}</span>
          </div>
        </div>
 
        <div className="comp-row">
          <div className="comp-label">Summary</div>
          <div className="comp-summary">{p.summary}</div>
        </div>
 
        <hr className="comp-section-rule" />
 
        <div className="comp-row" style={{ alignItems: "start" }}>
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
                <ul className="comp-bullets">
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
 
        <hr className="comp-section-rule" />
 
        <div className="comp-row">
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
 
        <hr className="comp-section-rule" />
 
        <div className="comp-row">
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
 
        <hr className="comp-section-rule" />
 
        <div className="comp-row">
          <div className="comp-label">Projects</div>
          <div>
            {s.projects.map((pr, i) => (
              <div className="comp-proj" key={i}>
                <strong>{pr.name}</strong>
                <span style={{ color: "#777", marginLeft: 6 }}>{formatProjectTech(pr)}</span>
                <div style={{ color: "#444", fontWeight: 300 }}>{pr.description}</div>
              </div>
            ))}
          </div>
        </div>
 
        <hr className="comp-section-rule" />
 
        <div className="comp-row">
          <div className="comp-label">Certs</div>
          <div>
            {s.certifications.map((c, i) => <div className="comp-cert" key={i}>{formatCertification(c)}</div>)}
          </div>
        </div>
      </div>
    </>
  );
}
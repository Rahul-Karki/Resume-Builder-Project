import  { ResumeDocument, marginMap, spacingMap } from "../../types/resume-types"; 
import {
  formatCertification,
  formatDateRange,
  formatProjectTech,
} from "./templateHelpers";

export function ExecutiveTemplate({ data }: { data: ResumeDocument }) {
  const { personalInfo: p, sections: s, sectionVisibility, style } = data;
  const pagePadding = marginMap[style.pageMargin];
  const sectionGap = spacingMap[style.sectionSpacing];
  const contactItems = [
    p.email ? `✉ ${p.email}` : "",
    p.phone ? `☎ ${p.phone}` : "",
    p.location ? `⌖ ${p.location}` : "",
    p.linkedin ? `⌘ ${p.linkedin}` : "",
    p.portfolio ? `◈ ${p.portfolio}` : "",
  ].filter(Boolean);
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Lato:wght@300;400;700&display=swap');
    .exec-wrap { font-family:'Lato',sans-serif; color:#1c1c1c; background:#fff; width:100%; min-height:100%; max-width:none; margin:0; box-sizing:border-box; display:flex; flex-direction:column; }
    .exec-header { background:#1B2B4B; color:#fff; padding:36px 52px 28px; }
    .exec-name { font-family:'Playfair Display',serif; font-size:30pt; font-weight:700; margin:0 0 8px; letter-spacing:0.3px; }
    .exec-title-bar { font-size:9.5pt; font-weight:300; letter-spacing:2px; text-transform:uppercase; color:#A8BDD8; margin-bottom:14px; }
    .exec-contact-bar { display:flex; flex-wrap:wrap; gap:6px 24px; font-size:9pt; color:#c8d8ec; }
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
    .exec-bullets { margin:5px 0 0 18px; padding:0; }
    .exec-bullets li { font-size:10pt; margin-bottom:4px; font-weight:300; line-height:1.5; }
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
      <div className="exec-wrap" style={{ background: style.backgroundColor, color: style.textColor, fontFamily: style.bodyFont, fontSize: style.fontSize, lineHeight: style.lineHeight }}>
        <div className="exec-header" style={{ background: style.accentColor, padding: `36px ${pagePadding.split(" ")[1]} 28px` }}>
          <div className="exec-name" style={{ fontFamily: style.headingFont, textAlign: style.headerAlign }}>{p.name}</div>
          {p.title && <div className="exec-title-bar" style={{ color: style.mutedColor, textAlign: style.headerAlign }}>{p.title}</div>}
          {contactItems.length > 0 && (
            <div className="exec-contact-bar" style={{ justifyContent: style.headerAlign === "center" ? "center" : "flex-start" }}>
              {contactItems.map((item, i) => <span key={i}>{item}</span>)}
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
                <ul className="exec-bullets">
                  {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
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
                <strong style={{ fontSize: "10pt" }}>{pr.name}</strong>
                <span style={{ fontSize: "9pt", color: "#666", marginLeft: 8 }}>{formatProjectTech(pr)}</span>
                <div style={{ fontSize: "9.5pt", color: "#444", marginTop: 2 }}>{pr.description}</div>
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
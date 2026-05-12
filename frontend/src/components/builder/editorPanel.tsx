import React, { useState } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { ActiveSection, WorkEntry, EduEntry, SkillGroup, Project, CertEntry, LanguageEntry } from "@/types/resume-types";

/* ─── CSS Animations ─────────────────────────────────────────────────────────── */
const css = `
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(200,245,90,0); } 50% { box-shadow: 0 0 0 4px rgba(200,245,90,0.08); } }
  .editor-fade-in { animation: fadeSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .editor-card { animation: fadeSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
  .editor-input:focus { border-color: rgba(200,245,90,0.5) !important; background: #1A1A1A !important; box-shadow: 0 0 0 3px rgba(200,245,90,0.1) !important; }
  .editor-textarea:focus { border-color: rgba(200,245,90,0.5) !important; background: #1A1A1A !important; box-shadow: 0 0 0 3px rgba(200,245,90,0.1) !important; }
`;

// ─── Shared Input Styles ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: 10,
  color: "#C8C7C0",
  fontSize: 14,
  fontFamily: "'Outfit', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
};

const inpFocus: React.CSSProperties = {
  borderColor: "rgba(200,245,90,0.5)",
  background: "#1A1A1A",
  boxShadow: "0 0 0 3px rgba(200,245,90,0.1)",
};

const ta: React.CSSProperties = {
  ...inp,
  resize: "vertical",
  lineHeight: 1.6,
  minHeight: 80,
  padding: "14px",
};

const label: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.9px",
  display: "block",
  marginBottom: 10,
};

const fieldGroup = (children: React.ReactNode, key?: string) => (
  <div key={key} style={{ marginBottom: 20 }}>{children}</div>
);

// Input with focus state handler
function Input({
  value,
  onChange,
  onFocus,
  placeholder,
  type = "text",
  style = {}
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => setIsFocused(false)}
      placeholder={placeholder}
      className="editor-input"
      style={{
        ...inp,
        ...(isFocused ? inpFocus : {}),
        ...style,
      }}
    />
  );
}

// TextArea with focus state handler
function FocusedTextArea({
  value,
  onChange,
  onFocus,
  placeholder,
  rows = 4,
  hint
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        rows={rows}
        className="editor-textarea"
        style={{
          ...ta,
          ...(isFocused ? inpFocus : {}),
        }}
      />
      {hint && (
        <div style={{ fontSize: 11, color: "#555", marginTop: 8, fontStyle: "italic", lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </>
  );
}

const modeToggleWrap: React.CSSProperties = {
  display: "inline-flex",
  gap: 4,
  padding: 4,
  borderRadius: 10,
  border: "1px solid #252525",
  background: "#111",
};

function ContentModeToggle({
  value,
  onChange,
}: {
  value: "bullets" | "paragraph";
  onChange: (value: "bullets" | "paragraph") => void;
}) {
  return (
    <div style={modeToggleWrap}>
      {(["bullets", "paragraph"] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            style={{
              border: "1px solid",
              borderColor: active ? "#C8F55A" : "transparent",
              borderRadius: 8,
              background: active ? "rgba(200,245,90,0.12)" : "transparent",
              color: active ? "#C8F55A" : "#888",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "capitalize",
              padding: "5px 12px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}

// ─── Nav Sidebar ───────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: ActiveSection; label: string; icon: string }[] = [
  { id: "personal", label: "Personal", icon: "◉" },
  { id: "experience", label: "Experience", icon: "◈" },
  { id: "education", label: "Education", icon: "◧" },
  { id: "skills", label: "Skills", icon: "◎" },
  { id: "projects", label: "Projects", icon: "◫" },
  { id: "certifications", label: "Certs", icon: "◬" },
  { id: "languages", label: "Languages", icon: "◭" },
];

// ─── Expandable Card ───────────────────────────────────────────────────────────
function EntryCard({ title, subtitle, onRemove, children, defaultOpen = true }: {
  title: string; subtitle?: string; onRemove: () => void;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="editor-card" style={{ background: "#141414", border: "1px solid #252525", borderRadius: 14, overflow: "hidden", marginBottom: 10, transition: "all 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", cursor: "pointer", transition: "background 0.15s ease" }} onClick={() => setOpen(o => !o)} onMouseEnter={e => e.currentTarget.style.background = "#1A1A1A"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#C8C7C0" }}>{title || <span style={{ color: "#444" }}>Untitled</span>}</div>
          {subtitle && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, padding: "4px 8px", marginRight: 8, borderRadius: 6, transition: "all 0.15s ease" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#ff6b6b"; e.currentTarget.style.background = "rgba(255,107,107,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "transparent"; }}
          title="Remove">✕</button>
        <span style={{ fontSize: 12, color: "#555", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>▾</span>
      </div>
      {open && <div style={{ padding: "0 16px 18px" }}>{children}</div>}
    </div>
  );
}

// ─── Add Button ────────────────────────────────────────────────────────────────
function AddBtn({ label: l, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "12px", borderRadius: 12, border: "1px dashed #2A2A2A",
      background: "transparent", color: "#555", fontSize: 14, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8F55A"; e.currentTarget.style.color = "#C8F55A"; e.currentTarget.style.background = "rgba(200,245,90,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "transparent"; }}
    >
      + {l}
    </button>
  );
}

// ─── Inline AI Enhance Button ──────────────────────────────────────────────────

const ACTION_VERBS = [
  "Led", "Built", "Designed", "Implemented", "Optimized", "Improved", "Launched",
  "Created", "Managed", "Delivered", "Automated", "Developed", "Scaled", "Reduced",
  "Increased", "Collaborated", "Architected", "Streamlined", "Spearheaded", "Engineered",
];

function getEnhancementTip(text: string, context: "summary" | "bullet"): string | null {
  if (!text.trim()) return null;

  if (context === "summary") {
    if (text.length < 80) return "Tip: Expand your summary to 2-4 impactful sentences (120-400 chars). Include your title, years of experience, and top achievements.";
    if (/\b(I am|I'm|I have|my)\b/i.test(text)) return "Tip: Remove first-person pronouns. Instead of 'I am a developer', write 'Full-stack developer with 5+ years…'";
    if (!/\d/.test(text)) return "Tip: Add quantifiable metrics to your summary, e.g. '7+ years experience', 'serving 10M+ users'.";
    return null;
  }

  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const isActionVerb = ACTION_VERBS.some((v) => v.toLowerCase() === firstWord);
  const hasMetric = /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b/i.test(text);

  if (!isActionVerb && !hasMetric) return "Tip: Start with an action verb (Led, Built, Optimized…) and add a measurable result (e.g., 'reduced latency by 40%').";
  if (!isActionVerb) return `Tip: Start with a strong action verb instead of '${text.trim().split(/\s+/)[0]}'. Try: ${ACTION_VERBS[Math.floor(Math.random() * 6)]}, ${ACTION_VERBS[Math.floor(Math.random() * 6) + 6]}…`;
  if (!hasMetric) return "Tip: Quantify the impact — add numbers, percentages, or dollar amounts (e.g., '20% improvement', '$50K savings').";
  return null;
}

function InlineEnhanceTip({ text, context }: { text: string; context: "summary" | "bullet" }) {
  const [visible, setVisible] = useState(false);
  const tip = getEnhancementTip(text, context);

  if (!tip) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        title="AI writing tip"
        style={{
          background: visible ? "rgba(200,245,90,0.12)" : "none",
          border: `1px solid ${visible ? "rgba(200,245,90,0.3)" : "#2A2A2A"}`,
          borderRadius: 6, color: visible ? "#C8F55A" : "#555",
          fontSize: 11, fontWeight: 700, padding: "3px 8px",
          cursor: "pointer", fontFamily: "inherit", marginLeft: 6,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#C8F55A"; e.currentTarget.style.borderColor = "rgba(200,245,90,0.3)"; }}
        onMouseLeave={(e) => { if (!visible) { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#2A2A2A"; } }}
      >
        ✦ Enhance
      </button>
      {visible && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20,
          background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 10,
          padding: "10px 12px", fontSize: 12, color: "#C8F55A", lineHeight: 1.6,
          maxWidth: 300, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}>
          {tip}
        </div>
      )}
    </div>
  );
}

// ─── Field components ──────────────────────────────────────────────────────────
function Inp({ label: l, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return fieldGroup(<>
    <span style={label}>{l}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="editor-input" style={inp}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(200,245,90,0.5)"; e.currentTarget.style.background = "#1A1A1A"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.background = "#141414"; }}
    />
  </>);
}

function TextArea({ label: l, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return fieldGroup(<>
    <span style={label}>{l}</span>
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      rows={rows} className="editor-textarea" style={ta}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(200,245,90,0.5)"; e.currentTarget.style.background = "#1A1A1A"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.background = "#141414"; }}
    />
  </>);
}

// ─── PERSONAL SECTION ─────────────────────────────────────────────────────────
function PersonalSection() {
  const { resume, updatePersonalInfo, setFocusedField } = useResumeBuilderStore();
  const p = resume.personalInfo;
  const showTechLinks = resume.templateCategory === "tech";

  // Helper for consistent input rendering
  const renderInput = (field: keyof typeof p, labelText: string, placeholder: string, type = "text") => (
    <div style={{ marginBottom: 20 }}>
      <span style={label}>{labelText}</span>
      <Input
        type={type}
        value={p[field] as string}
        onChange={v => updatePersonalInfo(field, v)}
        onFocus={() => setFocusedField({ section: "personal", kind: "personal", field, label: labelText })}
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div style={{ padding: "6px 6px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
        {renderInput("name", "Full Name", "Maya Thompson")}
        {renderInput("title", "Job Title", "Operations and Client Services Manager")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
        {renderInput("email", "Email", "alex@email.com", "email")}
        {renderInput("phone", "Phone", "+1 (555) 000-0000")}
      </div>

      {renderInput("location", "Location", "San Francisco, CA")}
      {renderInput("linkedin", "LinkedIn", "linkedin.com/in/you")}

      {showTechLinks && (
        <>
          {renderInput("github", "GitHub", "github.com/your-handle")}
          {renderInput("portfolio", "Portfolio Website", "yourportfolio.com")}
        </>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <span style={label}>Professional Summary</span>
          <InlineEnhanceTip text={p.summary} context="summary" />
        </div>
        <FocusedTextArea
          value={p.summary}
          onChange={v => updatePersonalInfo("summary", v)}
          onFocus={() => setFocusedField({ section: "personal", kind: "personal", field: "summary", label: "Professional Summary" })}
          placeholder="Operations leader with 7+ years improving service quality, team coordination, and client satisfaction across fast-paced environments."
          rows={5}
          hint={`${p.summary.length} characters · Aim for 2–4 impactful sentences`}
        />
      </div>
    </div>
  );
}

// ─── EXPERIENCE SECTION ────────────────────────────────────────────────────────
function ExperienceSection() {
  const { resume, addExperience, updateExperience, removeExperience, addBullet, updateBullet, removeBullet, setFocusedField } = useResumeBuilderStore();
  const experience = resume.sections.experience;

  return (
    <div>
      {experience.map((e: WorkEntry, idx: number) => (
        <EntryCard key={e.id} title={e.role || "New Role"} subtitle={e.company} onRemove={() => removeExperience(e.id)} defaultOpen={idx === experience.length - 1}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, marginTop: 6 }}>
            <div><span style={label}>Job Title</span><input value={e.role} onChange={v => updateExperience(e.id, "role", v.target.value)} onFocus={() => setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "role", label: "Job Title" })} placeholder="Operations Supervisor" className="editor-input" style={inp} /></div>
            <div><span style={label}>Company</span><input value={e.company} onChange={v => updateExperience(e.id, "company", v.target.value)} onFocus={() => setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "company", label: "Company" })} placeholder="BrightPath Services" className="editor-input" style={inp} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={label}>Location</span>
            <input value={e.location} onChange={v => updateExperience(e.id, "location", v.target.value)} onFocus={() => setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "location", label: "Location" })} placeholder="San Francisco, CA" className="editor-input" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><span style={label}>Start Date</span><input value={e.start} onChange={v => updateExperience(e.id, "start", v.target.value)} onFocus={() => setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "start", label: "Start Date" })} placeholder="Mar 2021" className="editor-input" style={inp} /></div>
            <div><span style={label}>End Date</span><input value={e.end} onChange={v => updateExperience(e.id, "end", v.target.value)} onFocus={() => setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "end", label: "End Date" })} placeholder="Present" disabled={e.current} style={{ ...inp, opacity: e.current ? 0.4 : 1 }} className="editor-input" /></div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={e.current} onChange={v => updateExperience(e.id, "current", v.target.checked)} onFocus={() => setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "current", label: "Current Role" })} />
                <span style={{ fontSize: 12, color: "#888" }}>Current</span>
              </label>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={label}>Description Format</span>
            <ContentModeToggle
              value={e.contentMode}
              onChange={(mode) => updateExperience(e.id, "contentMode", mode)}
            />
          </div>

          {e.contentMode === "paragraph" ? (
            <div>
              <span style={label}>Experience Summary</span>
              <textarea
                value={e.description}
                onChange={v => updateExperience(e.id, "description", v.target.value)}
                onFocus={(ev) => { ev.currentTarget.style.borderColor = "rgba(200,245,90,0.5)"; ev.currentTarget.style.background = "#1A1A1A"; setFocusedField({ section: "experience", kind: "experience", entityId: e.id, field: "description", label: "Experience Summary" }); }}
                rows={4}
                placeholder="Summarize your impact, scope of work, and service outcomes in a concise paragraph..."
                className="editor-textarea"
                style={ta}
                onBlur={ev => { ev.currentTarget.style.borderColor = "#2A2A2A"; ev.currentTarget.style.background = "#141414"; }}
              />
            </div>
          ) : (
            <div>
              <span style={label}>Bullet Points (Achievements)</span>
              {e.bullets.map((b, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#555", paddingTop: 10, flexShrink: 0, fontSize: 14 }}>›</span>
                    <textarea
                      value={b}
                      onChange={v => updateBullet(e.id, i, v.target.value)}
                      placeholder="Describe a quantifiable achievement…"
                      rows={2}
                      className="editor-textarea"
                      style={{ ...ta, flex: 1, minHeight: 48 }}
                    />
                    <button onClick={() => removeBullet(e.id, i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, paddingTop: 10, flexShrink: 0, borderRadius: 6, padding: "8px", transition: "all 0.15s ease" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ff6b6b"; e.currentTarget.style.background = "rgba(255,107,107,0.1)"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "transparent"; }}
                    >✕</button>
                  </div>
                  {b.trim().length > 0 && <div style={{ marginLeft: 24, marginTop: 4 }}><InlineEnhanceTip text={b} context="bullet" /></div>}
                </div>
              ))}
              <button onClick={() => addBullet(e.id)} style={{
                background: "none", border: "1px dashed #2A2A2A", borderRadius: 8, color: "#555",
                fontSize: 12, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8F55A"; e.currentTarget.style.color = "#C8F55A"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#555"; }}
              >+ Add bullet</button>
            </div>
          )}
        </EntryCard>
      ))}
      <AddBtn label="Add Experience" onClick={addExperience} />
    </div>
  );
}

// ─── EDUCATION SECTION ─────────────────────────────────────────────────────────
function EducationSection() {
  const { resume, addEducation, updateEducation, removeEducation, setFocusedField } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.education.map((e: EduEntry, idx: number) => (
        <EntryCard key={e.id} title={e.institution || "New School"} subtitle={e.degree && e.field ? `${e.degree} ${e.field}` : ""} onRemove={() => removeEducation(e.id)} defaultOpen={idx === resume.sections.education.length - 1}>
          <div style={{ marginBottom: 12, marginTop: 6 }}>
            <span style={label}>Institution</span>
            <input value={e.institution} onChange={v => updateEducation(e.id, "institution", v.target.value)} onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: e.id, field: "institution", label: "Institution" })} placeholder="State University of New York" className="editor-input" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><span style={label}>Degree</span><input value={e.degree} onChange={v => updateEducation(e.id, "degree", v.target.value)} onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: e.id, field: "degree", label: "Degree" })} placeholder="B.A." className="editor-input" style={inp} /></div>
            <div><span style={label}>Field of Study</span><input value={e.field} onChange={v => updateEducation(e.id, "field", v.target.value)} onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: e.id, field: "field", label: "Field of Study" })} placeholder="Business Administration" className="editor-input" style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><span style={label}>Graduation Year</span><input value={e.year} onChange={v => updateEducation(e.id, "year", v.target.value)} onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: e.id, field: "year", label: "Graduation Year" })} placeholder="2020" className="editor-input" style={inp} /></div>
            <div><span style={label}>GPA (optional)</span><input value={e.cgpa} onChange={v => updateEducation(e.id, "cgpa", v.target.value)} onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: e.id, field: "cgpa", label: "GPA" })} placeholder="3.8" className="editor-input" style={inp} /></div>
          </div>
        </EntryCard>
      ))}
      <AddBtn label="Add Education" onClick={addEducation} />
    </div>
  );
}

// ─── SKILLS SECTION ────────────────────────────────────────────────────────────
function SkillsSection() {
  const { resume, addSkillGroup, updateSkillGroup, removeSkillGroup, setFocusedField } = useResumeBuilderStore();
  const [skillDrafts, setSkillDrafts] = useState<Record<string, string>>({});

  const commitSkills = (id: string) => {
    const raw = skillDrafts[id];
    if (raw === undefined) return;

    const parsed = raw
      .split(",")
      .map(i => i.trim())
      .filter(Boolean);

    updateSkillGroup(id, "items", parsed);
    setSkillDrafts(prev => ({ ...prev, [id]: parsed.join(", ") }));
  };

  const handleSkillChange = (id: string, raw: string) => {
    setSkillDrafts(prev => ({ ...prev, [id]: raw }));

    const parsed = raw
      .split(",")
      .map(i => i.trim())
      .filter(Boolean);

    updateSkillGroup(id, "items", parsed);
  };

  return (
    <div>
      <div style={{ padding: "10px 14px", background: "#161616", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "#555", lineHeight: 1.6, border: "1px solid #1E1E1E" }}>
        Organize skills into categories. Add items separated by commas — e.g. <em style={{ color: "#888" }}>Customer Service, Scheduling, Excel</em>
      </div>
      {resume.sections.skills.map((sk: SkillGroup) => (
        <EntryCard key={sk.id} title={sk.category || "Skill Category"} subtitle={`${sk.items.length} items`} onRemove={() => removeSkillGroup(sk.id)}>
          <div style={{ marginBottom: 12, marginTop: 6 }}>
            <span style={label}>Category Name</span>
            <input value={sk.category} onChange={v => updateSkillGroup(sk.id, "category", v.target.value)} onFocus={() => setFocusedField({ section: "skills", kind: "skills", entityId: sk.id, field: "category", label: "Category Name" })} placeholder="Operations / Service / Software" className="editor-input" style={inp} />
          </div>
          <div>
            <span style={label}>Skills (comma-separated)</span>
            <input
              value={skillDrafts[sk.id] ?? sk.items.join(", ")}
              onChange={v => handleSkillChange(sk.id, v.target.value)}
              onFocus={() => setFocusedField({ section: "skills", kind: "skills", entityId: sk.id, field: "items", label: "Skills" })}
              onBlur={() => commitSkills(sk.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSkills(sk.id);
                }
              }}
              placeholder="CRM, Scheduling, Conflict Resolution, Excel"
              className="editor-input"
              style={inp}
            />
            {/* Tag preview */}
            {sk.items.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {sk.items.map((item, i) => (
                  <span key={i} style={{ background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#888", fontWeight: 500 }}>{item}</span>
                ))}
              </div>
            )}
          </div>
        </EntryCard>
      ))}
      <AddBtn label="Add Skill Category" onClick={addSkillGroup} />
    </div>
  );
}

// ─── PROJECTS SECTION ──────────────────────────────────────────────────────────
function ProjectsSection() {
  const { resume, addProject, updateProject, addProjectBullet, updateProjectBullet, removeProjectBullet, removeProject, setFocusedField } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.projects.map((pr: Project, idx: number) => (
        <EntryCard key={pr.id} title={pr.name || "New Project"} subtitle={pr.tech} onRemove={() => removeProject(pr.id)} defaultOpen={idx === resume.sections.projects.length - 1}>
          <div style={{ marginBottom: 12, marginTop: 6 }}>
            <span style={label}>Project Name</span>
            <input value={pr.name} onChange={v => updateProject(pr.id, "name", v.target.value)} onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: pr.id, field: "name", label: "Project Name" })} placeholder="Service Recovery Playbook" className="editor-input" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div><span style={label}>Focus Area</span><input value={pr.tech} onChange={v => updateProject(pr.id, "tech", v.target.value)} onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: pr.id, field: "tech", label: "Focus Area" })} placeholder="Process Design, Training, Reporting" className="editor-input" style={inp} /></div>
            <div><span style={label}>Reference Link (optional)</span><input value={pr.link} onChange={v => updateProject(pr.id, "link", v.target.value)} onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: pr.id, field: "link", label: "Reference Link" })} placeholder="organization.org/program" className="editor-input" style={inp} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={label}>Description Format</span>
            <ContentModeToggle
              value={pr.contentMode}
              onChange={(mode) => updateProject(pr.id, "contentMode", mode)}
            />
          </div>

          {pr.contentMode === "paragraph" ? (
            <div>
              <span style={label}>Description</span>
              <textarea value={pr.description} onChange={v => updateProject(pr.id, "description", v.target.value)} onFocus={(ev) => { ev.currentTarget.style.borderColor = "rgba(200,245,90,0.5)"; ev.currentTarget.style.background = "#1A1A1A"; setFocusedField({ section: "projects", kind: "projects", entityId: pr.id, field: "description", label: "Description" }); }}
                rows={3} placeholder="Briefly describe the initiative, who it supported, and the outcome it improved." className="editor-textarea" style={ta} />
            </div>
          ) : (
            <div>
              <span style={label}>Bullet Points</span>
              {pr.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#555", paddingTop: 10, flexShrink: 0, fontSize: 14 }}>›</span>
                  <textarea
                    value={b}
                    onChange={v => updateProjectBullet(pr.id, i, v.target.value)}
                    onFocus={(ev) => { ev.currentTarget.style.borderColor = "rgba(200,245,90,0.5)"; ev.currentTarget.style.background = "#1A1A1A"; setFocusedField({ section: "projects", kind: "projects", entityId: pr.id, field: "bullet", index: i, label: `Project Bullet ${i + 1}` }); }}
                    placeholder="Highlight one project outcome or feature..."
                    rows={2}
                    className="editor-textarea"
                    style={{ ...ta, flex: 1, minHeight: 48 }}
                    onBlur={ev => { ev.currentTarget.style.borderColor = "#2A2A2A"; ev.currentTarget.style.background = "#141414"; }}
                  />
                  <button
                    onClick={() => removeProjectBullet(pr.id, i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, paddingTop: 10, flexShrink: 0, borderRadius: 6, padding: "8px", transition: "all 0.15s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ff6b6b"; e.currentTarget.style.background = "rgba(255,107,107,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#444"; e.currentTarget.style.background = "transparent"; }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addProjectBullet(pr.id)} style={{
                background: "none", border: "1px dashed #2A2A2A", borderRadius: 8, color: "#555",
                fontSize: 12, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8F55A"; e.currentTarget.style.color = "#C8F55A"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#555"; }}
              >+ Add bullet</button>
            </div>
          )}
        </EntryCard>
      ))}
      <AddBtn label="Add Project" onClick={addProject} />
    </div>
  );
}

// ─── CERTIFICATIONS SECTION ────────────────────────────────────────────────────
function CertificationsSection() {
  const { resume, addCertification, updateCertification, removeCertification, setFocusedField } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.certifications.map((c: CertEntry) => (
        <EntryCard key={c.id} title={c.name || "New Certification"} subtitle={c.issuer} onRemove={() => removeCertification(c.id)}>
          <div style={{ marginBottom: 12, marginTop: 6 }}>
            <span style={label}>Certification Name</span>
            <input value={c.name} onChange={v => updateCertification(c.id, "name", v.target.value)} onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: c.id, field: "name", label: "Certification Name" })} placeholder="Certified Administrative Professional" className="editor-input" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><span style={label}>Issuing Body</span><input value={c.issuer} onChange={v => updateCertification(c.id, "issuer", v.target.value)} onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: c.id, field: "issuer", label: "Issuing Body" })} placeholder="IAAP" className="editor-input" style={inp} /></div>
            <div><span style={label}>Year</span><input value={c.year} onChange={v => updateCertification(c.id, "year", v.target.value)} onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: c.id, field: "year", label: "Year" })} placeholder="2023" className="editor-input" style={inp} /></div>
          </div>
        </EntryCard>
      ))}
      <AddBtn label="Add Certification" onClick={addCertification} />
    </div>
  );
}

// ─── LANGUAGES SECTION ─────────────────────────────────────────────────────────
function LanguagesSection() {
  const { resume, addLanguage, updateLanguage, removeLanguage, setFocusedField } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.languages.map((l: LanguageEntry) => (
        <EntryCard key={l.id} title={l.language || "New Language"} subtitle={l.proficiency} onRemove={() => removeLanguage(l.id)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
            <div><span style={label}>Language</span><input value={l.language} onChange={v => updateLanguage(l.id, "language", v.target.value)} onFocus={() => setFocusedField({ section: "languages", kind: "language", entityId: l.id, field: "language", label: "Language" })} placeholder="Mandarin" className="editor-input" style={inp} /></div>
            <div>
              <span style={label}>Proficiency</span>
              <select value={l.proficiency} onChange={v => updateLanguage(l.id, "proficiency", v.target.value)} onFocus={() => setFocusedField({ section: "languages", kind: "language", entityId: l.id, field: "proficiency", label: "Proficiency" })}
                style={{ ...inp, cursor: "pointer" }}>
                {["Native", "Fluent", "Advanced", "Intermediate", "Basic"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </EntryCard>
      ))}
      <AddBtn label="Add Language" onClick={addLanguage} />
    </div>
  );
}

// ─── SECTIONS MANAGER ──────────────────────────────────────────────────────────
function SectionsManager() {
  const { resume, toggleSectionVisibility, reorderSections } = useResumeBuilderStore();
  const [dragging, setDragging] = useState<number | null>(null);

  const SECTION_LABELS: Record<string, string> = {
    experience: "Experience", education: "Education", skills: "Skills",
    projects: "Projects", certifications: "Certifications", languages: "Languages",
  };

  return (
    <div>
      <div style={{ padding: "12px 14px", background: "#141414", border: "1px solid #252525", borderRadius: 12, marginBottom: 20, fontSize: 12, color: "#555", lineHeight: 1.6 }}>
        Toggle sections on/off and drag to reorder how they appear on your resume.
      </div>
      {resume.sectionOrder.map((sectionKey, idx) => (
        <div
          key={sectionKey}
          draggable
          onDragStart={() => setDragging(idx)}
          onDragOver={e => e.preventDefault()}
          onDrop={() => { if (dragging !== null && dragging !== idx) { reorderSections(dragging, idx); setDragging(null); } }}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            background: "#141414", border: "1px solid #252525", borderRadius: 10,
            marginBottom: 8, cursor: "grab", opacity: dragging === idx ? 0.5 : 1,
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ color: "#333", fontSize: 16, cursor: "grab" }}>⠿</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#C8C7C0" }}>{SECTION_LABELS[sectionKey]}</span>
          {/* Visibility toggle */}
          <div
            onClick={() => toggleSectionVisibility(sectionKey as any)}
            style={{
              width: 42, height: 22, borderRadius: 11, cursor: "pointer",
              background: resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility] ? "#C8F55A" : "#2A2A2A",
              position: "relative", transition: "background 0.25s ease",
            }}
          >
            <div style={{
              position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%",
              background: resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility] ? "#0E0E0E" : "#444",
              left: resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility] ? 22 : 2,
              transition: "left 0.25s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN EditorPanel ──────────────────────────────────────────────────────────
export function EditorPanel() {
  const { ui, setActiveSection } = useResumeBuilderStore();
  const activeSection = ui.activeSection;

  const sectionContent: Record<ActiveSection, React.ReactNode> = {
    personal: <PersonalSection />,
    experience: <ExperienceSection />,
    education: <EducationSection />,
    skills: <SkillsSection />,
    projects: <ProjectsSection />,
    certifications: <CertificationsSection />,
    languages: <LanguagesSection />,
  };

  // Special "sections" tab content is handled from parent, but we expose it as a nav item
  const sectionTitles: Record<ActiveSection, string> = {
    personal: "Personal Info", experience: "Work Experience", education: "Education",
    skills: "Skills", projects: "Projects", certifications: "Certifications", languages: "Languages",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Outfit', sans-serif" }}>
      <style>{css}</style>
      {/* Section Nav */}
      <div style={{ padding: "12px 12px 0", borderBottom: "1px solid #1E1E1E" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 12 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                padding: "7px 14px", borderRadius: 24, border: "1px solid",
                borderColor: activeSection === item.id ? "#C8F55A" : "#252525",
                background: activeSection === item.id ? "rgba(200,245,90,0.1)" : "transparent",
                color: activeSection === item.id ? "#C8F55A" : "#666",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={e => { if (activeSection !== item.id) { e.currentTarget.style.borderColor = "#3A3A3A"; e.currentTarget.style.color = "#888"; } }}
              onMouseLeave={e => { if (activeSection !== item.id) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#666"; } }}
            >
              <span style={{ fontSize: 10 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #1A1A1A" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#F0EFE8", letterSpacing: "-0.2px" }}>{sectionTitles[activeSection]}</div>
      </div>

      {/* Section Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px" }}>
        {sectionContent[activeSection]}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { ActiveSection, WorkEntry, EduEntry, SkillGroup, Project, CertEntry, LanguageEntry } from "@/types/resume-types";

// ─── Shared Input Styles ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "#141414", border: "1px solid #252525",
  borderRadius: 7, color: "#C8C7C0", fontSize: 13, fontFamily: "'Outfit', sans-serif",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
};
const ta: React.CSSProperties = { ...inp, resize: "vertical", lineHeight: 1.5, minHeight: 72 };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 5 };
const fieldGroup = (children: React.ReactNode, key?: string) => (
  <div key={key} style={{ marginBottom: 10 }}>{children}</div>
);

const modeToggleWrap: React.CSSProperties = {
  display: "inline-flex",
  gap: 4,
  padding: 3,
  borderRadius: 7,
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
              borderRadius: 6,
              background: active ? "rgba(200,245,90,0.12)" : "transparent",
              color: active ? "#C8F55A" : "#888",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "capitalize",
              padding: "4px 10px",
              cursor: "pointer",
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
  { id: "personal",        label: "Personal",      icon: "◉" },
  { id: "experience",      label: "Experience",    icon: "◈" },
  { id: "education",       label: "Education",     icon: "◧" },
  { id: "skills",          label: "Skills",        icon: "◎" },
  { id: "projects",        label: "Projects",      icon: "◫" },
  { id: "certifications",  label: "Certs",         icon: "◬" },
  { id: "languages",       label: "Languages",     icon: "◭" },
];

// ─── Expandable Card ───────────────────────────────────────────────────────────
function EntryCard({ title, subtitle, onRemove, children, defaultOpen = true }: {
  title: string; subtitle?: string; onRemove: () => void;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#C8C7C0" }}>{title || <span style={{ color: "#444" }}>Untitled</span>}</div>
          {subtitle && <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{subtitle}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, padding: "2px 6px", marginRight: 6 }}
          title="Remove">✕</button>
        <span style={{ fontSize: 12, color: "#555", transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
      </div>
      {open && <div style={{ padding: "0 12px 14px" }}>{children}</div>}
    </div>
  );
}

// ─── Add Button ────────────────────────────────────────────────────────────────
function AddBtn({ label: l, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "9px", borderRadius: 8, border: "1px dashed #2A2A2A",
      background: "transparent", color: "#555", fontSize: 13, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8F55A"; e.currentTarget.style.color = "#C8F55A"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#555"; }}
    >
      + {l}
    </button>
  );
}

// ─── Field components ──────────────────────────────────────────────────────────
function Inp({ label: l, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return fieldGroup(<>
    <span style={label}>{l}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp}
      onFocus={e => e.currentTarget.style.borderColor = "#3A3A3A"}
      onBlur={e => e.currentTarget.style.borderColor = "#252525"}
    />
  </>);
}

function TextArea({ label: l, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return fieldGroup(<>
    <span style={label}>{l}</span>
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      rows={rows} style={ta}
      onFocus={e => e.currentTarget.style.borderColor = "#3A3A3A"}
      onBlur={e => e.currentTarget.style.borderColor = "#252525"}
    />
  </>);
}

// ─── PERSONAL SECTION ─────────────────────────────────────────────────────────
function PersonalSection() {
  const { resume, updatePersonalInfo } = useResumeBuilderStore();
  const p = resume.personalInfo;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <span style={label}>Full Name</span>
          <input value={p.name} onChange={e => updatePersonalInfo("name", e.target.value)} placeholder="Alexandra Chen" style={inp} />
        </div>
        <div>
          <span style={label}>Job Title</span>
          <input value={p.title} onChange={e => updatePersonalInfo("title", e.target.value)} placeholder="Senior Software Engineer" style={inp} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <span style={label}>Email</span>
          <input type="email" value={p.email} onChange={e => updatePersonalInfo("email", e.target.value)} placeholder="alex@email.com" style={inp} />
        </div>
        <div>
          <span style={label}>Phone</span>
          <input value={p.phone} onChange={e => updatePersonalInfo("phone", e.target.value)} placeholder="+1 (555) 000-0000" style={inp} />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span style={label}>Location</span>
        <input value={p.location} onChange={e => updatePersonalInfo("location", e.target.value)} placeholder="San Francisco, CA" style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <span style={label}>LinkedIn</span>
          <input value={p.linkedin} onChange={e => updatePersonalInfo("linkedin", e.target.value)} placeholder="linkedin.com/in/you" style={inp} />
        </div>
        <div>
          <span style={label}>Portfolio / Website</span>
          <input value={p.portfolio} onChange={e => updatePersonalInfo("portfolio", e.target.value)} placeholder="yoursite.dev" style={inp} />
        </div>
      </div>
      <div>
        <span style={label}>Professional Summary</span>
        <textarea value={p.summary} onChange={e => updatePersonalInfo("summary", e.target.value)}
          rows={5} placeholder="Senior engineer with 7+ years building scalable systems…" style={ta}
          onFocus={e => e.currentTarget.style.borderColor = "#3A3A3A"}
          onBlur={e => e.currentTarget.style.borderColor = "#252525"}
        />
        <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>{p.summary.length} characters · Aim for 2–4 impactful sentences</div>
      </div>
    </div>
  );
}

// ─── EXPERIENCE SECTION ────────────────────────────────────────────────────────
function ExperienceSection() {
  const { resume, addExperience, updateExperience, removeExperience, addBullet, updateBullet, removeBullet } = useResumeBuilderStore();
  const experience = resume.sections.experience;

  return (
    <div>
      {experience.map((e: WorkEntry, idx: number) => (
        <EntryCard key={e.id} title={e.role || "New Role"} subtitle={e.company} onRemove={() => removeExperience(e.id)} defaultOpen={idx === experience.length - 1}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10, marginTop: 4 }}>
            <div><span style={label}>Job Title</span><input value={e.role} onChange={v => updateExperience(e.id, "role", v.target.value)} placeholder="Senior Engineer" style={inp} /></div>
            <div><span style={label}>Company</span><input value={e.company} onChange={v => updateExperience(e.id, "company", v.target.value)} placeholder="Stripe" style={inp} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={label}>Location</span>
            <input value={e.location} onChange={v => updateExperience(e.id, "location", v.target.value)} placeholder="San Francisco, CA" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div><span style={label}>Start Date</span><input value={e.start} onChange={v => updateExperience(e.id, "start", v.target.value)} placeholder="Mar 2021" style={inp} /></div>
            <div><span style={label}>End Date</span><input value={e.end} onChange={v => updateExperience(e.id, "end", v.target.value)} placeholder="Present" disabled={e.current} style={{ ...inp, opacity: e.current ? 0.4 : 1 }} /></div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={e.current} onChange={v => updateExperience(e.id, "current", v.target.checked)} />
                <span style={{ fontSize: 11, color: "#888" }}>Current</span>
              </label>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
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
                rows={4}
                placeholder="Summarize your impact in a concise paragraph..."
                style={ta}
              />
            </div>
          ) : (
            <div>
              <span style={label}>Bullet Points (Achievements)</span>
              {e.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: "#555", paddingTop: 8, flexShrink: 0, fontSize: 14 }}>›</span>
                  <textarea
                    value={b}
                    onChange={v => updateBullet(e.id, i, v.target.value)}
                    placeholder="Describe a quantifiable achievement…"
                    rows={2}
                    style={{ ...ta, flex: 1, minHeight: 44 }}
                  />
                  <button onClick={() => removeBullet(e.id, i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, paddingTop: 8, flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <button onClick={() => addBullet(e.id)} style={{
                background: "none", border: "1px dashed #2A2A2A", borderRadius: 6, color: "#555",
                fontSize: 12, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
              }}>+ Add bullet</button>
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
  const { resume, addEducation, updateEducation, removeEducation } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.education.map((e: EduEntry, idx: number) => (
        <EntryCard key={e.id} title={e.institution || "New School"} subtitle={e.degree && e.field ? `${e.degree} ${e.field}` : ""} onRemove={() => removeEducation(e.id)} defaultOpen={idx === resume.sections.education.length - 1}>
          <div style={{ marginBottom: 10, marginTop: 4 }}>
            <span style={label}>Institution</span>
            <input value={e.institution} onChange={v => updateEducation(e.id, "institution", v.target.value)} placeholder="UC Berkeley" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><span style={label}>Degree</span><input value={e.degree} onChange={v => updateEducation(e.id, "degree", v.target.value)} placeholder="B.S." style={inp} /></div>
            <div><span style={label}>Field of Study</span><input value={e.field} onChange={v => updateEducation(e.id, "field", v.target.value)} placeholder="Computer Science" style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><span style={label}>Graduation Year</span><input value={e.year} onChange={v => updateEducation(e.id, "year", v.target.value)} placeholder="2020" style={inp} /></div>
            <div><span style={label}>GPA (optional)</span><input value={e.cgpa} onChange={v => updateEducation(e.id, "cgpa", v.target.value)} placeholder="3.8" style={inp} /></div>
          </div>
        </EntryCard>
      ))}
      <AddBtn label="Add Education" onClick={addEducation} />
    </div>
  );
}

// ─── SKILLS SECTION ────────────────────────────────────────────────────────────
function SkillsSection() {
  const { resume, addSkillGroup, updateSkillGroup, removeSkillGroup } = useResumeBuilderStore();
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
      <div style={{ padding: "8px 10px", background: "#161616", borderRadius: 8, marginBottom: 12, fontSize: 11, color: "#555", lineHeight: 1.5 }}>
        Organize skills into categories. Add items separated by commas — e.g. <em style={{ color: "#888" }}>Go, TypeScript, Rust</em>
      </div>
      {resume.sections.skills.map((sk: SkillGroup) => (
        <EntryCard key={sk.id} title={sk.category || "Skill Category"} subtitle={`${sk.items.length} items`} onRemove={() => removeSkillGroup(sk.id)}>
          <div style={{ marginBottom: 10, marginTop: 4 }}>
            <span style={label}>Category Name</span>
            <input value={sk.category} onChange={v => updateSkillGroup(sk.id, "category", v.target.value)} placeholder="Languages / Frameworks / Tools" style={inp} />
          </div>
          <div>
            <span style={label}>Skills (comma-separated)</span>
            <input
              value={skillDrafts[sk.id] ?? sk.items.join(", ")}
              onChange={v => handleSkillChange(sk.id, v.target.value)}
              onBlur={() => commitSkills(sk.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSkills(sk.id);
                }
              }}
              placeholder="Go, TypeScript, Python, Rust"
              style={inp}
            />
            {/* Tag preview */}
            {sk.items.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {sk.items.map((item, i) => (
                  <span key={i} style={{ background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#888" }}>{item}</span>
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
  const { resume, addProject, updateProject, addProjectBullet, updateProjectBullet, removeProjectBullet, removeProject } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.projects.map((pr: Project, idx: number) => (
        <EntryCard key={pr.id} title={pr.name || "New Project"} subtitle={pr.tech} onRemove={() => removeProject(pr.id)} defaultOpen={idx === resume.sections.projects.length - 1}>
          <div style={{ marginBottom: 10, marginTop: 4 }}>
            <span style={label}>Project Name</span>
            <input value={pr.name} onChange={v => updateProject(pr.id, "name", v.target.value)} placeholder="OpenDistribute" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><span style={label}>Tech Stack</span><input value={pr.tech} onChange={v => updateProject(pr.id, "tech", v.target.value)} placeholder="Go, Redis, gRPC" style={inp} /></div>
            <div><span style={label}>Link (optional)</span><input value={pr.link} onChange={v => updateProject(pr.id, "link", v.target.value)} placeholder="github.com/you/project" style={inp} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={label}>Description Format</span>
            <ContentModeToggle
              value={pr.contentMode}
              onChange={(mode) => updateProject(pr.id, "contentMode", mode)}
            />
          </div>

          {pr.contentMode === "paragraph" ? (
            <div>
              <span style={label}>Description</span>
              <textarea value={pr.description} onChange={v => updateProject(pr.id, "description", v.target.value)}
                rows={3} placeholder="Open-source distributed task queue with 2.4K GitHub stars…" style={ta} />
            </div>
          ) : (
            <div>
              <span style={label}>Bullet Points</span>
              {pr.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
                  <span style={{ color: "#555", paddingTop: 8, flexShrink: 0, fontSize: 14 }}>›</span>
                  <textarea
                    value={b}
                    onChange={v => updateProjectBullet(pr.id, i, v.target.value)}
                    placeholder="Highlight one project outcome or feature..."
                    rows={2}
                    style={{ ...ta, flex: 1, minHeight: 44 }}
                  />
                  <button
                    onClick={() => removeProjectBullet(pr.id, i)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, paddingTop: 8, flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={() => addProjectBullet(pr.id)} style={{
                background: "none", border: "1px dashed #2A2A2A", borderRadius: 6, color: "#555",
                fontSize: 12, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
              }}>+ Add bullet</button>
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
  const { resume, addCertification, updateCertification, removeCertification } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.certifications.map((c: CertEntry) => (
        <EntryCard key={c.id} title={c.name || "New Certification"} subtitle={c.issuer} onRemove={() => removeCertification(c.id)}>
          <div style={{ marginBottom: 10, marginTop: 4 }}>
            <span style={label}>Certification Name</span>
            <input value={c.name} onChange={v => updateCertification(c.id, "name", v.target.value)} placeholder="AWS Solutions Architect – Professional" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><span style={label}>Issuing Body</span><input value={c.issuer} onChange={v => updateCertification(c.id, "issuer", v.target.value)} placeholder="Amazon Web Services" style={inp} /></div>
            <div><span style={label}>Year</span><input value={c.year} onChange={v => updateCertification(c.id, "year", v.target.value)} placeholder="2023" style={inp} /></div>
          </div>
        </EntryCard>
      ))}
      <AddBtn label="Add Certification" onClick={addCertification} />
    </div>
  );
}

// ─── LANGUAGES SECTION ─────────────────────────────────────────────────────────
function LanguagesSection() {
  const { resume, addLanguage, updateLanguage, removeLanguage } = useResumeBuilderStore();
  return (
    <div>
      {resume.sections.languages.map((l: LanguageEntry) => (
        <EntryCard key={l.id} title={l.language || "New Language"} subtitle={l.proficiency} onRemove={() => removeLanguage(l.id)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
            <div><span style={label}>Language</span><input value={l.language} onChange={v => updateLanguage(l.id, "language", v.target.value)} placeholder="Mandarin" style={inp} /></div>
            <div>
              <span style={label}>Proficiency</span>
              <select value={l.proficiency} onChange={v => updateLanguage(l.id, "proficiency", v.target.value)}
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
      <div style={{ padding: "10px 12px", background: "#141414", border: "1px solid #252525", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "#555", lineHeight: 1.5 }}>
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
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            background: "#141414", border: "1px solid #252525", borderRadius: 8,
            marginBottom: 6, cursor: "grab", opacity: dragging === idx ? 0.5 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <span style={{ color: "#333", fontSize: 16, cursor: "grab" }}>⠿</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#C8C7C0" }}>{SECTION_LABELS[sectionKey]}</span>
          {/* Visibility toggle */}
          <div
            onClick={() => toggleSectionVisibility(sectionKey as any)}
            style={{
              width: 38, height: 20, borderRadius: 10, cursor: "pointer",
              background: resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility] ? "#C8F55A" : "#2A2A2A",
              position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%",
              background: resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility] ? "#0E0E0E" : "#444",
              left: resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility] ? 20 : 2,
              transition: "left 0.2s",
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
    personal:       <PersonalSection />,
    experience:     <ExperienceSection />,
    education:      <EducationSection />,
    skills:         <SkillsSection />,
    projects:       <ProjectsSection />,
    certifications: <CertificationsSection />,
    languages:      <LanguagesSection />,
  };

  // Special "sections" tab content is handled from parent, but we expose it as a nav item
  const sectionTitles: Record<ActiveSection, string> = {
    personal: "Personal Info", experience: "Work Experience", education: "Education",
    skills: "Skills", projects: "Projects", certifications: "Certifications", languages: "Languages",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Outfit', sans-serif" }}>
      {/* Section Nav */}
      <div style={{ padding: "10px 10px 0", borderBottom: "1px solid #1E1E1E" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 10 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                padding: "5px 10px", borderRadius: 20, border: "1px solid",
                borderColor: activeSection === item.id ? "#C8F55A" : "#252525",
                background: activeSection === item.id ? "rgba(200,245,90,0.1)" : "transparent",
                color: activeSection === item.id ? "#C8F55A" : "#666",
                fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 10 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #1A1A1A" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EFE8" }}>{sectionTitles[activeSection]}</div>
      </div>

      {/* Section Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px" }}>
        {sectionContent[activeSection]}
      </div>
    </div>
  );
}
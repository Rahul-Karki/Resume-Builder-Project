import React, { useState, ReactNode } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { WorkEntry, LanguageEntry } from "@/types/resume-types";
import styles from "./editorPanel.module.css";

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
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => onFocus?.()}
      placeholder={placeholder}
      className={`editor-input ${styles.editorInp}`}
      style={style}
    />
  );
}

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
  return (
    <>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => onFocus?.()}
        placeholder={placeholder}
        rows={rows}
        className={`editor-textarea ${styles.editorTa}`}
      />
      {hint && <div className={styles.hint}>{hint}</div>}
    </>
  );
}

function ContentModeToggle({
  value,
  onChange,
}: {
  value: "bullets" | "paragraph";
  onChange: (value: "bullets" | "paragraph") => void;
}) {
  return (
    <div className={styles.modeToggleWrap}>
      {(["bullets", "paragraph"] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={`${styles.modeBtn} ${active ? styles.modeBtnActive : styles.modeBtnInactive}`}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}

function EntryCard({ title, subtitle, onRemove, children, defaultOpen = true }: {
  title: string; subtitle?: string; onRemove: () => void;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.editorCard} role="region" aria-label={title || "Entry"}>
      <div className={styles.entryCardHeader} onClick={() => setOpen(o => !o)} role="button" tabIndex={0} aria-expanded={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}>
        <div style={{ flex: 1 }}>
          <div className={styles.entryCardTitle}>{title || <span className={styles.entryCardUntitled}>Untitled</span>}</div>
          {subtitle && <div className={styles.entryCardSubtitle}>{subtitle}</div>}
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }}
          className={styles.entryCardRemove}
          aria-label={`Remove ${title || "entry"}`}>✕</button>
        <span className={`${styles.entryCardChevron} ${open ? styles.entryCardChevronOpen : ""}`} aria-hidden="true">▾</span>
      </div>
      {open && <div className={styles.entryCardBody}>{children}</div>}
    </div>
  );
}

function AddBtn({ label: l, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={styles.addBtn} aria-label={`Add ${l}`}>
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

function getEnhancementTip(text: string): string | null {
  if (!text.trim()) return null;

  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const isActionVerb = ACTION_VERBS.some((v) => v.toLowerCase() === firstWord);
  const hasMetric = /\b\d+(?:\.\d+)?%?\b|\$\d+|\d+x\b/i.test(text);

  if (!isActionVerb && !hasMetric) return "Tip: Start with an action verb (Led, Built, Optimized…) and add a measurable result (e.g., 'reduced latency by 40%').";
  if (!isActionVerb) return `Tip: Start with a strong action verb instead of '${text.trim().split(/\s+/)[0]}'. Try: ${ACTION_VERBS[Math.floor(Math.random() * 6)]}, ${ACTION_VERBS[Math.floor(Math.random() * 6) + 6]}…`;
  if (!hasMetric) return "Tip: Quantify the impact — add numbers, percentages, or dollar amounts (e.g., '20% improvement', '$50K savings').";
  return null;
}

function InlineEnhanceTip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const tip = getEnhancementTip(text);

  if (!tip) return null;

  return (
    <div className={styles.enhanceTipContainer}>
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        title="AI writing tip"
        className={`${styles.enhanceBtn} ${visible ? styles.enhanceBtnVisible : styles.enhanceBtnHidden}`}
      >
        ✦ Enhance
      </button>
      {visible && (
        <div className={styles.enhanceTooltip}>
          {tip}
        </div>
      )}
    </div>
  );
}

function Inp({ label: l, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className={styles.fieldGroup}>
      <span className={styles.editorLabel}>{l}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`editor-input ${styles.editorInp}`} />
    </div>
  );
}

function TextArea({ label: l, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className={styles.fieldGroup}>
      <span className={styles.editorLabel}>{l}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={rows} className={`editor-textarea ${styles.editorTa}`}
      />
    </div>
  );
}

function PersonalSection() {
  const { resume, updatePersonalInfo, setFocusedField } = useResumeBuilderStore();
  const p = resume.personalInfo;
  const showTechLinks = resume.templateCategory === "tech";

  const renderInput = (field: keyof typeof p, labelText: string, placeholder: string, type = "text") => (
    <div className={styles.fieldGroup}>
      <span className={styles.editorLabel}>{labelText}</span>
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
    <div className={styles.personalSection}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 4 }}>
        {renderInput("name", "Full Name", "Maya Thompson")}
        {renderInput("title", "Job Title", "Operations and Client Services Manager")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 4 }}>
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
        <div className={styles.flexRow}>
          <span className={styles.editorLabel}>Professional Summary</span>
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



// ─── EXPERIENCE SECTION (Redesigned) ───────────────────────────────────────────
function ExperienceSection() {
  const { resume, addExperience, updateExperience, removeExperience, addBullet, updateBullet, removeBullet, setFocusedField, reorderExperience } = useResumeBuilderStore();
  const experience = resume.sections.experience;
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [optimizationModal, setOptimizationModal] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;
    const draggedIndex = experience.findIndex(exp => exp.id === draggedId);
    const targetIndex = experience.findIndex(exp => exp.id === id);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
    reorderExperience(draggedIndex, targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };


  return (
    <div className={styles.sectionPadding}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.sectionTitle}>Work Experience</h2>
        <p className={styles.sectionSubtitle}>
          Detail your professional journey. Focus on achievements rather than just duties.
        </p>
      </div>

      {/* Experience Cards */}
      {experience.map((e: WorkEntry, idx: number) => (
          <ExperienceCard
          key={e.id}
          entry={e}
          isLast={idx === experience.length - 1}
          onRemove={() => removeExperience(e.id)}
          onUpdate={(field, value) => updateExperience(e.id, field as keyof WorkEntry, value)}
          onAddBullet={() => addBullet(e.id)}
          onUpdateBullet={(i, v) => updateBullet(e.id, i, v)}
          onRemoveBullet={(i) => removeBullet(e.id, i)}
          onDragStart={(ev) => handleDragStart(ev, e.id)}
          onDragOver={(ev) => handleDragOver(ev, e.id)}
          onDragEnd={handleDragEnd}
          setFocusedField={setFocusedField}
        />
      ))}

      <button
        onClick={addExperience}
        className={styles.fullWidthBtn}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Work Experience
      </button>

      {optimizationModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Optimization Suggestion</h3>
              <button onClick={() => setOptimizationModal(null)} className={styles.modalClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <pre className={styles.modalPre}>
                {optimizationModal}
              </pre>
            </div>
            <button
              onClick={() => setOptimizationModal(null)}
              className={styles.modalGotIt}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {apiError && (
        <div className={styles.errorToast}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13 }}>{apiError}</span>
          <button onClick={() => setApiError(null)} style={{ cursor: "pointer", color: "rgba(255,255,255,0.7)", marginLeft: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Experience Card Component ─────────────────────────────────────────────────
function ExperienceCard({
  entry,
  isLast,
  onRemove,
  onUpdate,
  onAddBullet,
  onUpdateBullet,
  onRemoveBullet,
  onDragStart,
  onDragOver,
  onDragEnd,
  setFocusedField,
}: {
  entry: WorkEntry;
  isLast: boolean;
  onRemove: () => void;
  onUpdate: (field: string, value: string | boolean) => void;
  onAddBullet: () => void;
  onUpdateBullet: (index: number, value: string) => void;
  onRemoveBullet: (index: number) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  setFocusedField: (field: any) => void;
}): ReactNode {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={styles.experienceCard}
    >
      <EntryCard
        title={entry.role || "Untitled Job"}
        subtitle={entry.company}
        onRemove={onRemove}
      >
        <div className={styles.fieldGroup}>
          <span className={styles.editorLabel}>Job Title</span>
          <Input
            value={entry.role}
            onChange={(v) => onUpdate("role", v)}
            placeholder="e.g., Senior Software Engineer"
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.editorLabel}>Company</span>
          <Input
            value={entry.company}
            onChange={(v) => onUpdate("company", v)}
            placeholder="e.g., Google"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
          <div>
            <span className={styles.editorLabel}>Start Date</span>
            <Input
              value={entry.start}
              onChange={(v) => onUpdate("start", v)}
              placeholder="Jan 2020"
            />
          </div>
          <div>
            <span className={styles.editorLabel}>End Date</span>
            <Input
              value={entry.end}
              onChange={(v) => onUpdate("end", v)}
              placeholder="Dec 2023"
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.editorLabel}>Location</span>
          <Input
            value={entry.location || ""}
            onChange={(v) => onUpdate("location", v)}
            placeholder="e.g., San Francisco, CA"
          />
        </div>

        <div className={styles.fieldGroup}>
          <div className={styles.flexRow}>
            <span className={styles.editorLabel}>Content Mode</span>
          </div>
          <ContentModeToggle
            value={entry.contentMode}
            onChange={(mode) => onUpdate("contentMode", mode)}
          />
        </div>

        {entry.contentMode === "paragraph" && (
          <div className={styles.fieldGroup}>
            <div className={styles.flexRow}>
              <span className={styles.editorLabel}>Description</span>
            </div>
            <FocusedTextArea
              value={entry.description}
              onChange={(v) => onUpdate("description", v)}
              placeholder="Describe your role and achievements..."
              rows={5}
            />
          </div>
        )}

        {entry.contentMode === "bullets" && (
          <div className={styles.fieldGroup}>
            <div className={styles.flexRow}>
              <span className={styles.editorLabel}>Bullet Points</span>
            </div>
            {entry.bullets.map((bullet, idx) => (
              <div key={idx} className={styles.bulletRow}>
                <FocusedTextArea
                  value={bullet}
                  onChange={(v) => onUpdateBullet(idx, v)}
                  placeholder="e.g., Led a team of 5 developers..."
                  rows={2}
                />
                <button
                  onClick={() => onRemoveBullet(idx)}
                  className={styles.bulletRemove}
                >
                  ✕
                </button>
              </div>
            ))}
            <AddBtn label="Bullet Point" onClick={onAddBullet} />
          </div>
        )}
      </EntryCard>
    </div>
  );
}

function EducationSection() {
  const { resume, addEducation, updateEducation, removeEducation, setFocusedField } = useResumeBuilderStore();
  const education = resume.sections.education;

  return (
    <div className={styles.sectionPadding}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.sectionTitle}>Education</h2>
      </div>

      {education.map((entry) => (
        <EntryCard
          key={entry.id}
          title={entry.degree || "Untitled Degree"}
          subtitle={entry.institution}
          onRemove={() => removeEducation(entry.id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
            <div>
              <span className={styles.editorLabel}>Institution</span>
              <Input
                value={entry.institution}
                onChange={(v) => updateEducation(entry.id, "institution", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "institution", label: "Institution" })}
                placeholder="University of Example"
              />
            </div>
            <div>
              <span className={styles.editorLabel}>Degree</span>
              <Input
                value={entry.degree}
                onChange={(v) => updateEducation(entry.id, "degree", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "degree", label: "Degree" })}
                placeholder="B.Sc. Computer Science"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className={styles.editorLabel}>Field</span>
              <Input
                value={entry.field}
                onChange={(v) => updateEducation(entry.id, "field", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "field", label: "Field" })}
                placeholder="Software Engineering"
              />
            </div>
            <div>
              <span className={styles.editorLabel}>Year</span>
              <Input
                value={entry.year}
                onChange={(v) => updateEducation(entry.id, "year", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "year", label: "Year" })}
                placeholder="2024"
              />
            </div>
            <div>
              <span className={styles.editorLabel}>CGPA / GPA</span>
              <Input
                value={entry.cgpa}
                onChange={(v) => updateEducation(entry.id, "cgpa", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "cgpa", label: "CGPA / GPA" })}
                placeholder="3.8 / 4.0"
              />
            </div>
          </div>
        </EntryCard>
      ))}

      <AddBtn label="Education" onClick={addEducation} />
    </div>
  );
}

function SkillsSection() {
  const { resume, addSkillGroup, updateSkillGroup, removeSkillGroup, setFocusedField } = useResumeBuilderStore();
  const skills = resume.sections.skills;

  return (
    <div className={styles.sectionPadding}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.sectionTitle}>Skills</h2>
      </div>

      {skills.map((entry) => (
        <EntryCard
          key={entry.id}
          title={entry.category || "Skill Group"}
          subtitle={`${entry.items.length} skill${entry.items.length === 1 ? "" : "s"}`}
          onRemove={() => removeSkillGroup(entry.id)}
        >
          <div className={styles.fieldGroup}>
            <span className={styles.editorLabel}>Category</span>
            <Input
              value={entry.category}
              onChange={(v) => updateSkillGroup(entry.id, "category", v)}
              onFocus={() => setFocusedField({ section: "skills", kind: "skills", entityId: entry.id, field: "category", label: "Category" })}
              placeholder="Technical Skills"
            />
          </div>

          <div>
            <span className={styles.editorLabel}>Items (comma separated)</span>
            <FocusedTextArea
              value={entry.items.join(", ")}
              onChange={(v) => updateSkillGroup(entry.id, "items", v.split(",").map((item) => item.trim()).filter(Boolean))}
              onFocus={() => setFocusedField({ section: "skills", kind: "skills", entityId: entry.id, field: "items", label: "Skill Items" })}
              placeholder="React, TypeScript, Node.js, PostgreSQL"
              rows={3}
            />
          </div>
        </EntryCard>
      ))}

      <AddBtn label="Skill Group" onClick={addSkillGroup} />
    </div>
  );
}

function ProjectsSection() {
  const { resume, addProject, updateProject, addProjectBullet, updateProjectBullet, removeProjectBullet, removeProject, setFocusedField } = useResumeBuilderStore();
  const projects = resume.sections.projects;

  return (
    <div className={styles.sectionPadding}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.sectionTitle}>Projects</h2>
        <p className={styles.sectionSubtitle}>
          Highlight the strongest project outcomes and measurable impact.
        </p>
      </div>

      {projects.map((entry) => (
        <EntryCard
          key={entry.id}
          title={entry.name || "Untitled Project"}
          subtitle={entry.tech}
          onRemove={() => removeProject(entry.id)}
        >
          <div className={styles.fieldGroup}>
            <span className={styles.editorLabel}>Project Name</span>
            <Input
              value={entry.name}
              onChange={(v) => updateProject(entry.id, "name", v)}
              onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "name", label: "Project Name" })}
              placeholder="Real-time Analytics Dashboard"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
            <div>
              <span className={styles.editorLabel}>Tech Stack</span>
              <Input
                value={entry.tech}
                onChange={(v) => updateProject(entry.id, "tech", v)}
                onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "tech", label: "Tech Stack" })}
                placeholder="React, Node.js, Redis"
              />
            </div>
            <div>
              <span className={styles.editorLabel}>Link</span>
              <Input
                value={entry.link}
                onChange={(v) => updateProject(entry.id, "link", v)}
                onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "link", label: "Project Link" })}
                placeholder="https://github.com/you/project"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <span className={styles.editorLabel}>Content Mode</span>
            <ContentModeToggle
              value={entry.contentMode}
              onChange={(mode) => updateProject(entry.id, "contentMode", mode)}
            />
          </div>

          {entry.contentMode === "paragraph" ? (
            <div>
              <span className={styles.editorLabel}>Description</span>
              <FocusedTextArea
                value={entry.description}
                onChange={(v) => updateProject(entry.id, "description", v)}
                onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "description", label: "Project Description" })}
                placeholder="Built and deployed..."
                rows={4}
              />
            </div>
          ) : (
            <div>
              <span className={styles.editorLabel}>Bullet Points</span>
              {entry.bullets.map((bullet, idx) => (
                <div key={`${entry.id}-bullet-${idx}`} className={styles.bulletRow}>
                  <FocusedTextArea
                    value={bullet}
                    onChange={(v) => updateProjectBullet(entry.id, idx, v)}
                    onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "bullets", index: idx, label: `Project Bullet ${idx + 1}` })}
                    placeholder="Reduced response time by 45%..."
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() => removeProjectBullet(entry.id, idx)}
                    className={styles.bulletRemove}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <AddBtn label="Project Bullet" onClick={() => addProjectBullet(entry.id)} />
            </div>
          )}
        </EntryCard>
      ))}

      <AddBtn label="Project" onClick={addProject} />
    </div>
  );
}

function CertificationsSection() {
  const { resume, addCertification, updateCertification, removeCertification, setFocusedField } = useResumeBuilderStore();
  const certifications = resume.sections.certifications;

  return (
    <div className={styles.sectionPadding}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.sectionTitle}>Certifications</h2>
      </div>

      {certifications.map((entry) => (
        <EntryCard
          key={entry.id}
          title={entry.name || "Untitled Certification"}
          subtitle={entry.issuer}
          onRemove={() => removeCertification(entry.id)}
        >
          <div className={styles.fieldGroup}>
            <span className={styles.editorLabel}>Name</span>
            <Input
              value={entry.name}
              onChange={(v) => updateCertification(entry.id, "name", v)}
              onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "name", label: "Certification Name" })}
              placeholder="AWS Certified Developer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className={styles.editorLabel}>Issuer</span>
              <Input
                value={entry.issuer}
                onChange={(v) => updateCertification(entry.id, "issuer", v)}
                onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "issuer", label: "Issuer" })}
                placeholder="Amazon Web Services"
              />
            </div>
            <div>
              <span className={styles.editorLabel}>Year</span>
              <Input
                value={entry.year}
                onChange={(v) => updateCertification(entry.id, "year", v)}
                onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "year", label: "Year" })}
                placeholder="2025"
              />
            </div>
          </div>
          <div className={styles.fieldGroup} style={{ marginTop: 4 }}>
            <span className={styles.editorLabel}>Credential URL</span>
            <Input
              value={entry.url ?? ""}
              onChange={(v) => updateCertification(entry.id, "url", v)}
              onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "url", label: "Credential URL" })}
              placeholder="https://example.com/certificate"
            />
          </div>
        </EntryCard>
      ))}

      <AddBtn label="Certification" onClick={addCertification} />
    </div>
  );
}

function LanguagesSection() {
  const { resume, addLanguage, updateLanguage, removeLanguage, setFocusedField } = useResumeBuilderStore();
  const languages = resume.sections.languages;

  return (
    <div className={styles.sectionPadding}>
      <div className={styles.fieldGroup}>
        <h2 className={styles.sectionTitle}>Languages</h2>
      </div>

      {languages.map((entry: LanguageEntry) => (
        <EntryCard
          key={entry.id}
          title={entry.language || "Language"}
          subtitle={entry.proficiency}
          onRemove={() => removeLanguage(entry.id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className={styles.editorLabel}>Language</span>
              <Input
                value={entry.language}
                onChange={(v) => updateLanguage(entry.id, "language", v)}
                onFocus={() => setFocusedField({ section: "languages", kind: "language", entityId: entry.id, field: "language", label: "Language" })}
                placeholder="English"
              />
            </div>
            <div>
              <span className={styles.editorLabel}>Proficiency</span>
              <select
                value={entry.proficiency}
                onFocus={() => setFocusedField({ section: "languages", kind: "language", entityId: entry.id, field: "proficiency", label: "Proficiency" })}
                onChange={(e) => updateLanguage(entry.id, "proficiency", e.target.value)}
                className={`editor-input ${styles.editorInp}`}
              >
                {(["Native", "Fluent", "Advanced", "Intermediate", "Basic"] as const).map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
        </EntryCard>
      ))}

      <AddBtn label="Language" onClick={addLanguage} />
    </div>
  );
}

export const EditorPanel = React.memo(function EditorPanel(): ReactNode {
  const {
    resume,
  } = useResumeBuilderStore();

  const sectionContent: Record<string, ReactNode> = {
    personal: <PersonalSection />,
    experience: <ExperienceSection />,
    education: <EducationSection />,
    skills: <SkillsSection />,
    projects: <ProjectsSection />,
    certifications: <CertificationsSection />,
    languages: <LanguagesSection />,
  };

  const [activeSection, setActiveSection] = useState<string>("personal");

  return (
    <div className={styles.editorPanelContainer}>
      <div className={styles.editorPanelScroll}>
        <div className={styles.sectionSelector}>
          {(["personal", ...resume.sectionOrder] as const).map((key) => {
            if (key !== "personal" && !resume.sectionVisibility[key]) return null;
            const label = key === "personal" ? "Personal" : key.charAt(0).toUpperCase() + key.slice(1);
            const active = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                aria-pressed={active}
                aria-label={`Edit ${label} section`}
                className={`${styles.sectionBtn} ${active ? styles.sectionBtnActive : styles.sectionBtnInactive}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className={styles.sectionContent}>
          <div className={styles.sectionContentInner}>{sectionContent[activeSection]}</div>
        </div>
      </div>
    </div>
  );
});

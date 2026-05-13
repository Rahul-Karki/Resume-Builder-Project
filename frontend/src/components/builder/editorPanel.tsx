import React, { useState, ReactNode } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { WorkEntry, LanguageEntry } from "@/types/resume-types";

/* ─── CSS Animations ─────────────────────────────────────────────────────────── */
const css = `
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } 50% { box-shadow: 0 0 20px rgba(255,255,255,0.2); } }
  .editor-fade-in { animation: fadeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .editor-card { animation: fadeSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; transition: all 0.3s ease; }
  .editor-card:hover { border-color: rgba(255,255,255,0.15) !important; box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important; }
  .editor-input:focus { border-color: rgba(255,255,255,0.6) !important; background: rgba(26,26,26,0.9) !important; box-shadow: 0 0 15px rgba(255,255,255,0.15) !important; }
  .editor-textarea:focus { border-color: rgba(255,255,255,0.6) !important; background: rgba(26,26,26,0.9) !important; box-shadow: 0 0 15px rgba(255,255,255,0.15) !important; }
`;

// ─── Shared Input Styles ───────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(20,20,20,0.6)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "#e4e4e7",
  fontSize: 14,
  fontFamily: "'Outfit', sans-serif",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
};

const inpFocus: React.CSSProperties = {
  borderColor: "rgba(255,255,255,0.6)",
  background: "rgba(26,26,26,0.9)",
  boxShadow: "0 0 15px rgba(255,255,255,0.15)",
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
  border: "1px solid #27272a",
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
              borderColor: active ? "#FFFFFF" : "transparent",
              borderRadius: 8,
              background: active ? "rgba(255,255,255,0.12)" : "transparent",
              color: active ? "#FFFFFF" : "#888",
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

// ─── Expandable Card ───────────────────────────────────────────────────────────
function EntryCard({ title, subtitle, onRemove, children, defaultOpen = true }: {
  title: string; subtitle?: string; onRemove: () => void;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="editor-card" style={{ background: "rgba(20,20,20,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", marginBottom: 14, transition: "all 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "16px 18px", cursor: "pointer", transition: "background 0.2s ease" }} onClick={() => setOpen(o => !o)} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7" }}>{title || <span style={{ color: "#444" }}>Untitled</span>}</div>
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
      width: "100%", padding: "14px", borderRadius: 16, border: "1px dashed rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.02)", color: "#888", fontSize: 14, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,255,255,0.1)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
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
          background: visible ? "rgba(255,255,255,0.12)" : "none",
          border: `1px solid ${visible ? "rgba(255,255,255,0.3)" : "#27272a"}`,
          borderRadius: 6, color: visible ? "#FFFFFF" : "#555",
          fontSize: 11, fontWeight: 700, padding: "3px 8px",
          cursor: "pointer", fontFamily: "inherit", marginLeft: 6,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
        onMouseLeave={(e) => { if (!visible) { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#27272a"; } }}
      >
        ✦ Enhance
      </button>
      {visible && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20,
          background: "#18181b", border: "1px solid #27272a", borderRadius: 10,
          padding: "10px 12px", fontSize: 12, color: "#FFFFFF", lineHeight: 1.6,
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
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "#18181b"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "#27272a"; e.currentTarget.style.background = "#09090b"; }}
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
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "#18181b"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "#27272a"; e.currentTarget.style.background = "#09090b"; }}
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

// ─── AI Enhance Button ─────────────────────────────────────────────────────────
function AIEnhanceButton({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid rgba(232, 98, 42, 0.3)",
        background: "rgba(232, 98, 42, 0.08)",
        color: "#e8622a",
        fontSize: 12,
        fontWeight: 600,
        cursor: isLoading ? "not-allowed" : "pointer",
        fontFamily: "'Outfit', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: "all 0.2s ease",
        opacity: isLoading ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = "rgba(232, 98, 42, 0.15)"; e.currentTarget.style.borderColor = "rgba(232, 98, 42, 0.5)"; } }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(232, 98, 42, 0.08)"; e.currentTarget.style.borderColor = "rgba(232, 98, 42, 0.3)"; }}
    >
      {isLoading ? (
        <>
          <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(232, 98, 42, 0.2)", borderTopColor: "#e8622a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Enhancing...
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-3 8 11-12h-9l3-8z" />
          </svg>
          AI Enhance Description
        </>
      )}
    </button>
  );
}

// ─── Mock AI Service ───────────────────────────────────────────────────────────
const mockEnhanceDescription = async (description: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        description
          .replace(/led/gi, "Orchestrated")
          .replace(/managed/gi, "Directed")
          .replace(/worked on/gi, "Spearheaded")
          .replace(/helped/gi, "Facilitated") +
        " Resulting in a 25% increase in efficiency and a 15% reduction in costs."
      );
    }, 1500);
  });
};

const mockFinalizeOptimize = async (experience: WorkEntry[]): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const totalWords = experience.reduce((acc, curr) => acc + (curr.description?.split(" ").length || 0) + curr.bullets.reduce((a, b) => a + b.split(" ").length, 0), 0);
      resolve(
        `Optimization Report:\n\n` +
        `1. Overall Impact: Your resume demonstrates strong technical skills, but could benefit from more quantifiable achievements.\n` +
        `2. Verb Usage: Consider varying your action verbs to avoid repetition.\n` +
        `3. Length: Your total experience description is ${totalWords} words. Aim for 300-500 words for optimal ATS parsing.\n` +
        `4. Keywords: Ensure you include relevant keywords from the job description.\n\n` +
        `Recommendation: Focus on metrics and outcomes in your most recent role.`
      );
    }, 2000);
  });
};

// ─── EXPERIENCE SECTION (Redesigned) ───────────────────────────────────────────
function ExperienceSection() {
  const { resume, addExperience, updateExperience, removeExperience, addBullet, updateBullet, removeBullet, setFocusedField, reorderExperience } = useResumeBuilderStore();
  const experience = resume.sections.experience;
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [optimizationModal, setOptimizationModal] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  

  const handleEnhanceDescription = async (expId: string) => {
    const exp = experience.find(e => e.id === expId);
    if (!exp) return;
    setEnhancingId(expId);
    setApiError(null);
    try {
      const textToEnhance = exp.contentMode === "paragraph" ? exp.description : exp.bullets.join("\n");
      const enhanced = await mockEnhanceDescription(textToEnhance);
      if (exp.contentMode === "paragraph") {
        updateExperience(expId, "description", enhanced);
      } else {
        // For bullets mode, update the first bullet or description
        updateExperience(expId, "description", enhanced);
      }
    } catch (error) {
      setApiError("Failed to enhance description. Please try again.");
    } finally {
      setEnhancingId(null);
    }
  };
  const handleFinalizeOptimize = async () => {
    setIsOptimizing(true);
    setApiError(null);
    try {
      const report = await mockFinalizeOptimize(experience);
      setOptimizationModal(report);
    } catch (error) {
      setApiError("Failed to generate optimization report.");
    } finally {
      setIsOptimizing(false);
    }
    };

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
    <div style={{ padding: "0 4px 24px" }}>
      {/* Section Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0f2", marginBottom: 4 }}>Work Experience</h2>
        <p style={{ fontSize: 12, color: "#a08090", lineHeight: 1.5 }}>
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
          onEnhance={() => handleEnhanceDescription(e.id)}
          isEnhancing={enhancingId === e.id}
          onDragStart={(ev) => handleDragStart(ev, e.id)}
          onDragOver={(ev) => handleDragOver(ev, e.id)}
          onDragEnd={handleDragEnd}
          setFocusedField={setFocusedField}
        />
      ))}

      {/* Add Experience Button */}
      <button
        onClick={addExperience}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: 12,
          border: "1px dashed rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.02)",
          color: "#888",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Outfit', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#e8622a"; e.currentTarget.style.color = "#e8622a"; e.currentTarget.style.background = "rgba(232, 98, 42, 0.05)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#888"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Work Experience
      </button>

      {optimizationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#121212', borderRadius: 24, padding: 24, maxWidth: 600, width: '100%', position: 'relative', border: '1px solid #1a1014' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, color: '#f5f0f2', margin: 0 }}>Optimization Suggestion</h3>
              <button onClick={() => setOptimizationModal(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{ background: "#1a1014", borderRadius: 12, padding: 16, border: "1px solid #2e1f28", marginBottom: 20 }}>
              <pre style={{ fontSize: 13, color: "#f5f0f2", whiteSpace: "pre-wrap", fontFamily: "'Outfit', sans-serif", lineHeight: 1.6, margin: 0 }}>
                {optimizationModal}
              </pre>
            </div>
            <button
              onClick={() => setOptimizationModal(null)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                border: "none",
                background: "#e8622a",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {apiError && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(220, 38, 38, 0.95)", color: "#fff", padding: "12px 20px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, zIndex: 100, border: "1px solid rgba(220, 38, 38, 0.5)", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13 }}>{apiError}</span>
          <button onClick={() => setApiError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", marginLeft: 8 }}>
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
  onEnhance,
  isEnhancing,
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
  onEnhance: () => void;
  isEnhancing: boolean;
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
      style={{ opacity: 0.8, cursor: "grab" }}
    >
      <EntryCard
        title={entry.role || "Untitled Job"}
        subtitle={entry.company}
        onRemove={onRemove}
      >
        <div style={{ marginBottom: 20 }}>
          <span style={label}>Job Title</span>
          <Input
            value={entry.role}
            onChange={(v) => onUpdate("role", v)}
            placeholder="e.g., Senior Software Engineer"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <span style={label}>Company</span>
          <Input
            value={entry.company}
            onChange={(v) => onUpdate("company", v)}
            placeholder="e.g., Google"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
          <div>
            <span style={label}>Start Date</span>
            <Input
              value={entry.start}
              onChange={(v) => onUpdate("start", v)}
              placeholder="Jan 2020"
            />
          </div>
          <div>
            <span style={label}>End Date</span>
            <Input
              value={entry.end}
              onChange={(v) => onUpdate("end", v)}
              placeholder="Dec 2023"
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <span style={label}>Location</span>
          <Input
            value={entry.location || ""}
            onChange={(v) => onUpdate("location", v)}
            placeholder="e.g., San Francisco, CA"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <span style={label}>Content Mode</span>
          </div>
          <ContentModeToggle
            value={entry.contentMode}
            onChange={(mode) => onUpdate("contentMode", mode)}
          />
        </div>

        {entry.contentMode === "paragraph" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={label}>Description</span>
              <InlineEnhanceTip text={entry.description} context="summary" />
            </div>
            <FocusedTextArea
              value={entry.description}
              onChange={(v) => onUpdate("description", v)}
              placeholder="Describe your role and achievements..."
              rows={5}
            />
            <AIEnhanceButton onClick={onEnhance} isLoading={isEnhancing} />
          </div>
        )}

        {entry.contentMode === "bullets" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <span style={label}>Bullet Points</span>
            </div>
            {entry.bullets.map((bullet, idx) => (
              <div key={idx} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <FocusedTextArea
                    value={bullet}
                    onChange={(v) => onUpdateBullet(idx, v)}
                    placeholder="e.g., Led a team of 5 developers..."
                    rows={2}
                  />
                  <button
                    onClick={() => onRemoveBullet(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#444",
                      fontSize: 14,
                      padding: "4px 8px",
                      borderRadius: 6,
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ff6b6b";
                      e.currentTarget.style.background = "rgba(255,107,107,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#444";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <AddBtn label="Bullet Point" onClick={onAddBullet} />
            <AIEnhanceButton onClick={onEnhance} isLoading={isEnhancing} />
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
    <div style={{ padding: "0 4px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0f2", marginBottom: 4 }}>Education</h2>
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
              <span style={label}>Institution</span>
              <Input
                value={entry.institution}
                onChange={(v) => updateEducation(entry.id, "institution", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "institution", label: "Institution" })}
                placeholder="University of Example"
              />
            </div>
            <div>
              <span style={label}>Degree</span>
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
              <span style={label}>Field</span>
              <Input
                value={entry.field}
                onChange={(v) => updateEducation(entry.id, "field", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "field", label: "Field" })}
                placeholder="Software Engineering"
              />
            </div>
            <div>
              <span style={label}>Year</span>
              <Input
                value={entry.year}
                onChange={(v) => updateEducation(entry.id, "year", v)}
                onFocus={() => setFocusedField({ section: "education", kind: "education", entityId: entry.id, field: "year", label: "Year" })}
                placeholder="2024"
              />
            </div>
            <div>
              <span style={label}>CGPA / GPA</span>
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
    <div style={{ padding: "0 4px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0f2", marginBottom: 4 }}>Skills</h2>
      </div>

      {skills.map((entry) => (
        <EntryCard
          key={entry.id}
          title={entry.category || "Skill Group"}
          subtitle={`${entry.items.length} skill${entry.items.length === 1 ? "" : "s"}`}
          onRemove={() => removeSkillGroup(entry.id)}
        >
          <div style={{ marginBottom: 20 }}>
            <span style={label}>Category</span>
            <Input
              value={entry.category}
              onChange={(v) => updateSkillGroup(entry.id, "category", v)}
              onFocus={() => setFocusedField({ section: "skills", kind: "skills", entityId: entry.id, field: "category", label: "Category" })}
              placeholder="Technical Skills"
            />
          </div>

          <div>
            <span style={label}>Items (comma separated)</span>
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
    <div style={{ padding: "0 4px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0f2", marginBottom: 4 }}>Projects</h2>
        <p style={{ fontSize: 12, color: "#a08090", lineHeight: 1.5 }}>
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
          <div style={{ marginBottom: 20 }}>
            <span style={label}>Project Name</span>
            <Input
              value={entry.name}
              onChange={(v) => updateProject(entry.id, "name", v)}
              onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "name", label: "Project Name" })}
              placeholder="Real-time Analytics Dashboard"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
            <div>
              <span style={label}>Tech Stack</span>
              <Input
                value={entry.tech}
                onChange={(v) => updateProject(entry.id, "tech", v)}
                onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "tech", label: "Tech Stack" })}
                placeholder="React, Node.js, Redis"
              />
            </div>
            <div>
              <span style={label}>Link</span>
              <Input
                value={entry.link}
                onChange={(v) => updateProject(entry.id, "link", v)}
                onFocus={() => setFocusedField({ section: "projects", kind: "projects", entityId: entry.id, field: "link", label: "Project Link" })}
                placeholder="https://github.com/you/project"
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <span style={label}>Content Mode</span>
            <ContentModeToggle
              value={entry.contentMode}
              onChange={(mode) => updateProject(entry.id, "contentMode", mode)}
            />
          </div>

          {entry.contentMode === "paragraph" ? (
            <div>
              <span style={label}>Description</span>
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
              <span style={label}>Bullet Points</span>
              {entry.bullets.map((bullet, idx) => (
                <div key={`${entry.id}-bullet-${idx}`} style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
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
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#444", fontSize: 14, padding: "4px 8px", borderRadius: 6 }}
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
    <div style={{ padding: "0 4px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0f2", marginBottom: 4 }}>Certifications</h2>
      </div>

      {certifications.map((entry) => (
        <EntryCard
          key={entry.id}
          title={entry.name || "Untitled Certification"}
          subtitle={entry.issuer}
          onRemove={() => removeCertification(entry.id)}
        >
          <div style={{ marginBottom: 20 }}>
            <span style={label}>Name</span>
            <Input
              value={entry.name}
              onChange={(v) => updateCertification(entry.id, "name", v)}
              onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "name", label: "Certification Name" })}
              placeholder="AWS Certified Developer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span style={label}>Issuer</span>
              <Input
                value={entry.issuer}
                onChange={(v) => updateCertification(entry.id, "issuer", v)}
                onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "issuer", label: "Issuer" })}
                placeholder="Amazon Web Services"
              />
            </div>
            <div>
              <span style={label}>Year</span>
              <Input
                value={entry.year}
                onChange={(v) => updateCertification(entry.id, "year", v)}
                onFocus={() => setFocusedField({ section: "certifications", kind: "certification", entityId: entry.id, field: "year", label: "Year" })}
                placeholder="2025"
              />
            </div>
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
    <div style={{ padding: "0 4px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0f2", marginBottom: 4 }}>Languages</h2>
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
              <span style={label}>Language</span>
              <Input
                value={entry.language}
                onChange={(v) => updateLanguage(entry.id, "language", v)}
                onFocus={() => setFocusedField({ section: "languages", kind: "language", entityId: entry.id, field: "language", label: "Language" })}
                placeholder="English"
              />
            </div>
            <div>
              <span style={label}>Proficiency</span>
              <select
                value={entry.proficiency}
                onFocus={() => setFocusedField({ section: "languages", kind: "language", entityId: entry.id, field: "proficiency", label: "Proficiency" })}
                onChange={(e) => updateLanguage(entry.id, "proficiency", e.target.value)}
                className="editor-input"
                style={inp}
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

export function EditorPanel(): ReactNode {
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
    <div className="editor-fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <style>{css}</style>

      <div style={{ flex: 1, overflowY: "auto" }} className="themed-scrollbar">
        {/* Section selector */}
        <div style={{ padding: "12px 14px 8px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(["personal", ...resume.sectionOrder] as const).map((key) => {
            if (key !== "personal" && !resume.sectionVisibility[key]) return null;
            const label = key === "personal" ? "Personal" : key.charAt(0).toUpperCase() + key.slice(1);
            const active = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: active ? "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))" : "transparent",
                  color: "#e8dfe3",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "12px 14px", display: "grid", gap: 14 }}>
          <div style={{ minWidth: 0 }}>{sectionContent[activeSection]}</div>
        </div>
      </div>
    </div>
  );
}

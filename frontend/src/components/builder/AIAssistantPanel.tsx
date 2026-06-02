import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { improveResumeText, enhanceResumeBullet } from "@/services/api";
import type { AiRewriteResult, AiTone, FocusedEditorField } from "@/types/resume-types";
import { Briefcase, Scissors, Settings, Target, Sparkles, Check, Copy, AlertCircle, RefreshCw, Loader2, ChevronDown, Wand2, Lightbulb, TrendingUp, AlertTriangle, Hash, UserCheck, Zap } from "lucide-react";
import { useAISuggestions } from "@/hooks/useAISuggestions";

const TONES: { id: AiTone; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "professional", label: "Professional", icon: <Briefcase size={12} />, description: "Polished and formal" },
  { id: "concise", label: "Concise", icon: <Scissors size={12} />, description: "Short and direct" },
  { id: "technical", label: "Technical", icon: <Settings size={12} />, description: "Skills-focused" },
  { id: "leadership-focused", label: "Leadership", icon: <Target size={12} />, description: "Impact-driven" },
];

type FocusTarget = {
  text: string;
  section: "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";
  context?: string;
  label?: string;
  applySuggestion: (suggestion: string) => void;
};

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const BLOCKED_PERSONAL_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "location",
  "linkedin",
  "github",
  "portfolio",
]);

const BLOCKED_PERSONAL_MESSAGE = "Name, email, phone, location, LinkedIn, GitHub, and portfolio are locked fields. Select summary, experience, skills, projects, certifications, or languages for suggestions.";

const EDITABLE_FIELD_MESSAGE = "Click an editable field to get field-specific AI suggestions. Summary, experience bullets, skills, projects, certifications, and languages each get different guidance.";

const getPersonalFieldText = (resume: ReturnType<typeof useResumeBuilderStore.getState>["resume"], field?: string) => {
  const personal = resume.personalInfo;
  switch (field) {
    case "name": return personal.name;
    case "title": return personal.title;
    case "email": return personal.email;
    case "phone": return personal.phone;
    case "location": return personal.location;
    case "linkedin": return personal.linkedin;
    case "github": return personal.github;
    case "portfolio": return personal.portfolio;
    case "summary":
    default:
      return personal.summary;
  }
};

const getFocusTarget = (
  resume: ReturnType<typeof useResumeBuilderStore.getState>["resume"],
  focusedField: FocusedEditorField | null,
  section: string,
  store: ReturnType<typeof useResumeBuilderStore.getState>,
) => {
  const toneContext = resume.personalInfo.title || resume.title;

  if (focusedField?.kind === "personal") {
    if (focusedField.field && BLOCKED_PERSONAL_FIELDS.has(focusedField.field)) {
      return null;
    }
    const text = compact(getPersonalFieldText(resume, focusedField.field));
    return {
      text, section: "summary" as const, context: toneContext, label: focusedField.label,
      applySuggestion: (suggestion: string) => {
        if (!focusedField.field) return;
        store.updatePersonalInfo(focusedField.field as keyof typeof resume.personalInfo, suggestion);
      },
    } satisfies FocusTarget;
  }

  if (focusedField?.kind === "experience") {
    const entry = resume.sections.experience.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = focusedField.field === "description"
        ? compact(entry.description)
        : focusedField.index !== undefined
          ? compact(entry.bullets[focusedField.index] ?? "")
          : compact(entry.description);
      return {
        text, section: "experience" as const, context: `${entry.role} at ${entry.company}`, label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "description") { store.updateExperience(entry.id, "description", suggestion); return; }
          if (focusedField.index !== undefined) { store.updateBullet(entry.id, focusedField.index, suggestion); }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "projects") {
    const entry = resume.sections.projects.find((item) => item.id === focusedField.entityId);
    if (entry) {
      if (!(focusedField.field === "description" || focusedField.index !== undefined)) {
        return null;
      }
      const text = focusedField.field === "description"
        ? compact(entry.description)
        : focusedField.index !== undefined
          ? compact(entry.bullets[focusedField.index] ?? "")
          : compact(entry.description);
      return {
        text, section: "projects" as const, context: entry.name, label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "description") { store.updateProject(entry.id, "description", suggestion); return; }
          if (focusedField.index !== undefined) { store.updateProjectBullet(entry.id, focusedField.index, suggestion); }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "education") {
    return null;
  }

  if (focusedField?.kind === "skills") {
    return null;
  }

  if (focusedField?.kind === "certification") {
    return null;
  }

  if (focusedField?.kind === "language") {
    return null;
  }

  if (section === "personal") {
    return {
      text: compact(resume.personalInfo.summary), section: "summary" as const, context: toneContext,
      applySuggestion: (suggestion: string) => store.updatePersonalInfo("summary", suggestion),
    } satisfies FocusTarget;
  }

  if (section === "experience") {
    const entry = [...resume.sections.experience].reverse().find((item) => compact(item.description) || item.bullets.some((bullet) => compact(bullet)));
    if (!entry) return null;
    const bulletIndex = Math.max(0, entry.bullets.findIndex((bullet) => compact(bullet)));
    const text = compact(entry.contentMode === "paragraph" ? entry.description : entry.bullets[bulletIndex] ?? entry.description);
    return {
      text, section: "experience" as const, context: `${entry.role} at ${entry.company}`,
      applySuggestion: (suggestion: string) => {
        if (entry.contentMode === "paragraph") { store.updateExperience(entry.id, "description", suggestion); return; }
        if (bulletIndex >= 0) store.updateBullet(entry.id, bulletIndex, suggestion);
      },
    } satisfies FocusTarget;
  }

  if (section === "projects") {
    const entry = [...resume.sections.projects].reverse().find((item) => compact(item.description) || item.bullets.some((bullet) => compact(bullet)));
    if (!entry) return null;
    const bulletIndex = Math.max(0, entry.bullets.findIndex((bullet) => compact(bullet)));
    const text = compact(entry.contentMode === "paragraph" ? entry.description : entry.bullets[bulletIndex] ?? entry.description);
    return {
      text, section: "projects" as const, context: entry.name,
      applySuggestion: (suggestion: string) => {
        if (entry.contentMode === "paragraph") { store.updateProject(entry.id, "description", suggestion); return; }
        if (bulletIndex >= 0) store.updateProjectBullet(entry.id, bulletIndex, suggestion);
      },
    } satisfies FocusTarget;
  }

  if (section === "skills") {
    return null;
  }

  return null;
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const css = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 1000px; } }
  
  .ai-container { font-family: 'Outfit', system-ui, sans-serif; }
  
  /* Collapsed Header */
  .ai-header-collapsed { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding: 12px 16px; 
    background: linear-gradient(135deg, rgba(255,255,255, 0.08) 0%, rgba(255,255,255, 0.02) 100%);
    border-bottom: 1px solid rgba(255,255,255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .ai-header-collapsed:hover { background: linear-gradient(135deg, rgba(255,255,255, 0.12) 0%, rgba(255,255,255, 0.04) 100%); }
  
  .ai-header-left { display: flex; align-items: center; gap: 10px; }
  .ai-header-icon { 
    width: 28px; height: 28px; 
    background: rgba(255,255,255, 0.15); 
    border-radius: 6px; 
    display: flex; align-items: center; justify-content: center;
    color: #FFFFFF;
  }
  .ai-header-text { display: flex; flex-direction: column; }
  .ai-header-title { font-size: 13px; font-weight: 600; color: #fafafa; }
  .ai-header-subtitle { font-size: 11px; color: #a1a1aa; }
  .ai-header-right { display: flex; align-items: center; gap: 8px; }
  .ai-chevron { color: #666; transition: transform 0.2s ease; }
  .ai-chevron.open { transform: rotate(180deg); }
  .ai-close-btn { 
    width: 24px; height: 24px; 
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; color: #a1a1aa; cursor: pointer;
    transition: all 0.15s ease;
  }
  .ai-close-btn:hover { background: rgba(255,255,255,0.08); color: #fafafa; }
  
  /* Expanded Panel */
  .ai-panel { 
    background: #18181b; 
    border-bottom: 1px solid #3f3f46; 
    color: #d4d4d8; 
    animation: slideDown 0.3s ease-out;
    max-height: 400px;
    overflow-y: auto;
  }
  .ai-panel::-webkit-scrollbar { width: 4px; }
  .ai-panel::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }
  
  .ai-panel-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between;
    padding: 12px 16px; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    position: sticky;
    top: 0;
    background: #0F0F0F;
    z-index: 10;
  }
  .ai-panel-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #fafafa; }
  .ai-context-badge { 
    display: inline-flex; align-items: center; 
    padding: 3px 8px; 
    background: rgba(255, 255, 255, 0.05); 
    border: 1px solid #3f3f46; 
    border-radius: 4px; 
    font-size: 10px; color: #a1a1aa; 
    font-weight: 500;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .ai-tone-bar { 
    display: flex; 
    gap: 6px; 
    padding: 12px 16px; 
    flex-wrap: wrap; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .ai-tone-btn { 
    display: flex; align-items: center; gap: 5px; 
    padding: 5px 10px; 
    border-radius: 6px; 
    border: 1px solid #3f3f46; 
    background: rgba(255, 255, 255, 0.02); 
    color: #a1a1aa; 
    font-size: 11px; 
    font-weight: 500; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .ai-tone-btn:hover { border-color: #71717a; color: #d4d4d8; background: rgba(255, 255, 255, 0.04); }
  .ai-tone-btn.active { 
    background: rgba(255,255,255, 0.1); 
    border-color: #fafafa; 
    color: #fafafa;
  }
  
  .ai-actions { 
    display: flex; 
    gap: 8px; 
    padding: 12px 16px; 
    flex-wrap: wrap; 
    align-items: center;
  }
  .ai-btn-primary { 
    display: flex; align-items: center; gap: 6px; 
    background: #FFFFFF; 
    color: #0A0A0A; 
    border: none; 
    border-radius: 6px; 
    padding: 8px 14px; 
    font-size: 12px; 
    font-weight: 600; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .ai-btn-primary:hover:not(:disabled) { background: #d4fa6e; transform: translateY(-1px); }
  .ai-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .ai-btn-secondary { 
    display: flex; align-items: center; gap: 6px; 
    background: transparent; 
    border: 1px solid rgba(255, 255, 255, 0.1); 
    color: #888; 
    border-radius: 6px; 
    padding: 8px 12px; 
    font-size: 12px; 
    font-weight: 500; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .ai-btn-secondary:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.2); color: #aaa; }
  .ai-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
  
  .ai-btn-apply { 
    display: flex; align-items: center; gap: 4px; 
    background: rgba(255,255,255, 0.1); 
    border: 1px solid rgba(255,255,255, 0.2); 
    color: #FFFFFF; 
    border-radius: 4px; 
    padding: 5px 10px; 
    font-size: 11px; 
    font-weight: 500; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .ai-btn-apply:hover { background: rgba(255,255,255, 0.15); border-color: rgba(255,255,255, 0.3); }
  
  .ai-status { font-size: 11px; color: #a1a1aa; margin-left: auto; }
  .ai-spin { animation: spin 1s linear infinite; }
  
  .ai-card { 
    background: rgba(255, 255, 255, 0.03); 
    border: 1px solid #3f3f46; 
    border-radius: 8px; 
    padding: 12px; 
    margin: 0 16px 10px; 
  }
  .ai-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .ai-card-reason { font-size: 12px; font-weight: 500; color: #d4d4d8; display: flex; align-items: center; gap: 6px; }
  .ai-card-text { font-size: 13px; color: #fafafa; line-height: 1.5; margin-bottom: 10px; }
  .ai-card-actions { display: flex; gap: 8px; }
  
  .ai-section-label { 
    font-size: 10px; font-weight: 600; color: #a1a1aa; 
    text-transform: uppercase; letter-spacing: 0.5px; 
    padding: 0 16px; margin: 12px 0 8px; 
  }
  
  .ai-error { 
    margin: 0 16px 12px; 
    padding: 10px 12px; 
    border-radius: 6px; 
    background: rgba(220, 38, 38, 0.1); 
    border: 1px solid rgba(220, 38, 38, 0.3); 
    color: #fca5a5; 
    font-size: 12px; 
    display: flex; align-items: center; gap: 8px; 
  }
  
  .ai-variation { 
    text-align: left; 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid #3f3f46; 
    color: #a1a1aa; 
    border-radius: 6px; 
    padding: 10px 12px; 
    font-size: 12px; 
    cursor: pointer; 
    line-height: 1.4; 
    transition: all 0.15s ease; 
    width: calc(100% - 32px); 
    margin: 0 16px 8px; 
    display: block;
  }
  .ai-variation:hover { border-color: #fafafa; color: #fafafa; background: rgba(255,255,255, 0.05); }
  
  .ai-empty { 
    padding: 32px 16px; 
    text-align: center; 
    color: #a1a1aa; 
    display: flex; flex-direction: column; align-items: center; gap: 12px; 
  }
  .ai-empty-icon { 
    width: 40px; height: 40px; 
    background: rgba(255, 255, 255, 0.03); 
    border-radius: 10px; 
    display: flex; align-items: center; justify-content: center;
    color: #71717a;
  }
  .ai-empty-text { font-size: 12px; line-height: 1.5; max-width: 240px; color: #a1a1aa; }
  
  .ai-impact { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.3px; }
  .ai-impact-high { background: rgba(220, 38, 38, 0.12); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.15); }
  .ai-impact-medium { background: rgba(217, 119, 6, 0.12); color: #fcd34d; border: 1px solid rgba(217, 119, 6, 0.15); }
  .ai-impact-low { background: rgba(22, 163, 74, 0.12); color: #86efac; border: 1px solid rgba(22, 163, 74, 0.15); }
  
  .ai-loader-block { background: rgba(255, 255, 255, 0.03); border-radius: 4px; height: 12px; margin: 8px 0; position: relative; overflow: hidden; }
  .ai-loader-block::after { 
    content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; 
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent); 
    animation: shimmer 1.5s infinite; 
  }
`;

export function AIAssistantPanel() {
  const store = useResumeBuilderStore();
  const { resume, ui } = store;
  const [tone, setTone] = useState<AiTone>("professional");
  const [rewrite, setRewrite] = useState<AiRewriteResult | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);

  const {
    suggestions: improveSuggestions,
    state: improveState,
    requestSuggestions: requestImproveSuggestions,
    cancelSuggestions: cancelImproveSuggestions,
  } = useAISuggestions();

  const loading = improveState.loading;
  const error = improveState.error;

  const target = useMemo(() => getFocusTarget(resume, ui.focusedField, ui.activeSection, store), [resume, ui.focusedField, ui.activeSection, store]);
  const blockedReason = useMemo(() => {
    if (ui.focusedField?.kind === "personal" && ui.focusedField.field && BLOCKED_PERSONAL_FIELDS.has(ui.focusedField.field)) {
      return BLOCKED_PERSONAL_MESSAGE;
    }
    return null;
  }, [ui.focusedField]);

  useEffect(() => {
    setRewrite(null);
    cancelImproveSuggestions("target-change");
  }, [target?.text, cancelImproveSuggestions]);

  useEffect(() => {
    if (!improveSuggestions) return;
    setRewrite(improveSuggestions as AiRewriteResult);
    setSource((improveSuggestions as any)._fallback === false ? "ai" : "fallback");
    setLastUpdatedAt(new Date().toISOString());
  }, [improveSuggestions]);

  // Auto-expand when there's a target with content
  useEffect(() => {
    if (target?.text && target.text.length > 10) {
      setIsExpanded(true);
    }
  }, [target?.text]);

  const applySuggestion = useCallback((suggestion: string) => { if (target) target.applySuggestion(suggestion); }, [target]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); }).catch(() => undefined);
  }, []);

  const handleImprove = useCallback(() => {
    if (!target || blockedReason) return;
    const fieldId = target.label || target.section;
    const payload = {
      text: target.text,
      section: target.section,
      tone,
      context: target.context,
      targetRole: resume.personalInfo.title || resume.title,
      forceRefresh: Boolean(rewrite),
      variationSeed: rewrite ? String(Date.now()) : undefined,
    };
    const requestFn = target.section === "experience" || target.section === "projects"
      ? enhanceResumeBullet
      : improveResumeText;
    const requestType = target.section === "experience" || target.section === "projects"
      ? "enhance-bullet"
      : "improve-text";
    requestImproveSuggestions(
      (body, options) => requestFn(body as any, options),
      payload,
      fieldId,
      requestType
    );
  }, [target, blockedReason, tone, resume.personalInfo.title, resume.title, rewrite, requestImproveSuggestions]);

  // Collapsed state - just show the header
  if (!isExpanded) {
    const hasContent = target?.text && target.text.length > 0;
    return (
      <div className="ai-container">
        <style>{css}</style>
        <div className="ai-header-collapsed" onClick={() => setIsExpanded(true)}>
          <div className="ai-header-left">
            <div className="ai-header-icon">
              <Wand2 size={14} />
            </div>
            <div className="ai-header-text">
              <span className="ai-header-title">AI Writing Assistant</span>
              <span className="ai-header-subtitle">
                {hasContent ? `Ready to improve "${target.label || target.section}"` : EDITABLE_FIELD_MESSAGE}
              </span>
            </div>
          </div>
          <div className="ai-header-right">
            {source && (
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                background: source === "ai" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                color: source === "ai" ? "#86efac" : "#fcd34d",
                border: source === "ai" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
              }}>
                {source === "ai" ? "⚡ AI" : "⚙️ Fallback"}
              </span>
            )}
            <ChevronDown size={16} className="ai-chevron" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-container">
      <style>{css}</style>
      <div className="ai-panel">
        {/* Compact Header */}
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <Sparkles size={14} /> AI Assistant
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {target?.label && <span className="ai-context-badge">{target.label}</span>}
            {source && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "3px",
                padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                background: source === "ai" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                color: source === "ai" ? "#86efac" : "#fcd34d",
                border: source === "ai" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
              }}>
                {source === "ai" ? "⚡ AI" : "⚙️ Fallback"}
              </span>
            )}
            <div className="ai-close-btn" onClick={() => setIsExpanded(false)} title="Collapse">
              <ChevronDown size={16} className="ai-chevron open" />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!target && (
          <div className="ai-empty">
            <div className="ai-empty-icon">
              <Lightbulb size={20} />
            </div>
            <div className="ai-empty-text">
              {blockedReason ?? EDITABLE_FIELD_MESSAGE}
            </div>
          </div>
        )}

        {target && (
          <>
            {/* Tone selector */}
            <div className="ai-tone-bar">
              {TONES.map((item) => (
                <button 
                  key={item.id} 
                  className={`ai-tone-btn ${tone === item.id ? "active" : ""}`} 
                  onClick={() => setTone(item.id)}
                  title={item.description}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="ai-actions">
              <button className="ai-btn-primary" onClick={handleImprove} disabled={loading || Boolean(blockedReason)}>
                {loading ? <Loader2 size={12} className="ai-spin" /> : <RefreshCw size={12} />} 
                Improve
              </button>
              <span className="ai-status">
                {loading ? "Working..." : lastUpdatedAt ? "Updated" : "Ready"}
              </span>
            </div>

            {/* Loading skeleton */}
            {loading && !rewrite && (
              <div style={{ padding: "0 16px 12px" }}>
                <div className="ai-loader-block" style={{ width: "80%" }} />
                <div className="ai-loader-block" style={{ width: "60%" }} />
              </div>
            )}

            {/* Error */}
            {blockedReason && (
              <div className="ai-error">
                <AlertCircle size={12} /> {blockedReason}
              </div>
            )}
            {error && !blockedReason && (
              <div className="ai-error">
                <AlertCircle size={12} /> {error}
              </div>
            )}

            {/* Rewrite result */}
            {rewrite && (
              <>
                {/* Main improved text */}
                <div className="ai-section-label" style={{ marginTop: "12px" }}>Improved Text</div>
                <div className="ai-card">
                  <div className="ai-card-header">
                    <div className="ai-card-reason">
                      <Zap size={12} /> {rewrite.impactLevel === "high" ? "High Impact" : rewrite.impactLevel === "medium" ? "Medium Impact" : "Low Impact"}
                    </div>
                    {rewrite.atsScoreImpact && (
                      <span className="ai-impact ai-impact-high">{rewrite.atsScoreImpact.estimatedImprovement}</span>
                    )}
                  </div>
                  <div className="ai-card-text">{rewrite.improvedText}</div>
                  <div className="ai-card-actions">
                    <button className="ai-btn-apply" onClick={() => applySuggestion(rewrite.improvedText)}>
                      <Check size={10} /> Apply
                    </button>
                    <button className="ai-btn-apply" onClick={() => handleCopy(rewrite.improvedText, "main")}>
                      <Copy size={10} /> {copiedId === "main" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* ATS Score Impact */}
                {rewrite.atsScoreImpact && (
                  <div className="ai-card" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TrendingUp size={14} style={{ color: "#86efac", flexShrink: 0 }} />
                    <div style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: "1.4" }}>
                      {rewrite.atsScoreImpact.reason}
                    </div>
                  </div>
                )}

                {/* Detected Weaknesses */}
                {rewrite.detectedWeaknesses?.length > 0 && (
                  <>
                    <div className="ai-section-label">Weaknesses Found</div>
                    {rewrite.detectedWeaknesses.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 16px", fontSize: "11px", color: "#fca5a5", alignItems: "flex-start" }}>
                        <AlertTriangle size={10} style={{ marginTop: "2px", flexShrink: 0 }} />
                        <span>{w}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Added Keywords */}
                {rewrite.addedKeywords?.length > 0 && (
                  <>
                    <div className="ai-section-label">ATS Keywords Added</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", padding: "0 16px 8px" }}>
                      {rewrite.addedKeywords.map((kw, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", background: "rgba(255,255,255,0.04)", border: "1px solid #3f3f46", borderRadius: "3px", fontSize: "10px", color: "#d4d4d8" }}>
                          <Hash size={8} /> {kw}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Recruiter Signals */}
                {rewrite.recruiterSignalsAdded?.length > 0 && (
                  <>
                    <div className="ai-section-label">Recruiter Signals</div>
                    {rewrite.recruiterSignalsAdded.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 16px", fontSize: "11px", color: "#86efac", alignItems: "flex-start" }}>
                        <UserCheck size={10} style={{ marginTop: "2px", flexShrink: 0 }} />
                        <span>{s}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Smart Suggestions */}
                {rewrite.smartSuggestions?.length > 0 && (
                  <>
                    <div className="ai-section-label">Recommendations</div>
                    {rewrite.smartSuggestions.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 16px 4px 16px", fontSize: "11px", color: "#fcd34d", alignItems: "flex-start" }}>
                        <Lightbulb size={10} style={{ marginTop: "2px", flexShrink: 0 }} />
                        <span>{s}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Variations */}
                {rewrite.variations?.length > 0 && (
                  <>
                    <div className="ai-section-label">Alternatives</div>
                    <div style={{ padding: "0 0 12px" }}>
                      {rewrite.variations.slice(0, 3).map((variation, index) => (
                        <button key={`${variation}-${index}`} className="ai-variation" onClick={() => applySuggestion(variation)}>
                          {variation}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}


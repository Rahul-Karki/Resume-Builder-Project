import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { improveResumeText, checkResumeGrammar, enhanceResumeBullet } from "@/services/api";
import type { AiRewriteResult, AiGrammarResult, AiTone, FocusedEditorField } from "@/types/resume-types";
import { Briefcase, Scissors, Settings, Target, Sparkles, Check, Copy, AlertCircle, RefreshCw, Loader2, PenTool, ChevronDown, Wand2, Lightbulb } from "lucide-react";

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
    background: linear-gradient(135deg, rgba(200, 245, 90, 0.08) 0%, rgba(200, 245, 90, 0.02) 100%);
    border-bottom: 1px solid rgba(200, 245, 90, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .ai-header-collapsed:hover { background: linear-gradient(135deg, rgba(200, 245, 90, 0.12) 0%, rgba(200, 245, 90, 0.04) 100%); }
  
  .ai-header-left { display: flex; align-items: center; gap: 10px; }
  .ai-header-icon { 
    width: 28px; height: 28px; 
    background: rgba(200, 245, 90, 0.15); 
    border-radius: 6px; 
    display: flex; align-items: center; justify-content: center;
    color: #C8F55A;
  }
  .ai-header-text { display: flex; flex-direction: column; }
  .ai-header-title { font-size: 13px; font-weight: 600; color: #C8F55A; }
  .ai-header-subtitle { font-size: 11px; color: #888; }
  .ai-header-right { display: flex; align-items: center; gap: 8px; }
  .ai-chevron { color: #666; transition: transform 0.2s ease; }
  .ai-chevron.open { transform: rotate(180deg); }
  .ai-close-btn { 
    width: 24px; height: 24px; 
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; color: #666; cursor: pointer;
    transition: all 0.15s ease;
  }
  .ai-close-btn:hover { background: rgba(255,255,255,0.05); color: #C8C7C0; }
  
  /* Expanded Panel */
  .ai-panel { 
    background: #0F0F0F; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.06); 
    color: #e4e4e7; 
    animation: slideDown 0.3s ease-out;
    max-height: 400px;
    overflow-y: auto;
  }
  .ai-panel::-webkit-scrollbar { width: 4px; }
  .ai-panel::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
  
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
  .ai-panel-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #C8F55A; }
  .ai-context-badge { 
    display: inline-flex; align-items: center; 
    padding: 3px 8px; 
    background: rgba(255, 255, 255, 0.05); 
    border: 1px solid rgba(255, 255, 255, 0.08); 
    border-radius: 4px; 
    font-size: 10px; color: #888; 
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
    border: 1px solid rgba(255, 255, 255, 0.06); 
    background: rgba(255, 255, 255, 0.02); 
    color: #888; 
    font-size: 11px; 
    font-weight: 500; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .ai-tone-btn:hover { border-color: rgba(255, 255, 255, 0.12); color: #aaa; background: rgba(255, 255, 255, 0.04); }
  .ai-tone-btn.active { 
    background: rgba(200, 245, 90, 0.12); 
    border-color: rgba(200, 245, 90, 0.3); 
    color: #C8F55A;
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
    background: #C8F55A; 
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
    background: rgba(200, 245, 90, 0.1); 
    border: 1px solid rgba(200, 245, 90, 0.2); 
    color: #C8F55A; 
    border-radius: 4px; 
    padding: 5px 10px; 
    font-size: 11px; 
    font-weight: 500; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .ai-btn-apply:hover { background: rgba(200, 245, 90, 0.15); border-color: rgba(200, 245, 90, 0.3); }
  
  .ai-status { font-size: 11px; color: #666; margin-left: auto; }
  .ai-spin { animation: spin 1s linear infinite; }
  
  .ai-card { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 8px; 
    padding: 12px; 
    margin: 0 16px 10px; 
  }
  .ai-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .ai-card-reason { font-size: 12px; font-weight: 500; color: #aaa; display: flex; align-items: center; gap: 6px; }
  .ai-card-text { font-size: 13px; color: #C8C7C0; line-height: 1.5; margin-bottom: 10px; }
  .ai-card-actions { display: flex; gap: 8px; }
  
  .ai-section-label { 
    font-size: 10px; font-weight: 600; color: #666; 
    text-transform: uppercase; letter-spacing: 0.5px; 
    padding: 0 16px; margin: 12px 0 8px; 
  }
  
  .ai-error { 
    margin: 0 16px 12px; 
    padding: 10px 12px; 
    border-radius: 6px; 
    background: rgba(220, 38, 38, 0.08); 
    border: 1px solid rgba(220, 38, 38, 0.2); 
    color: #fca5a5; 
    font-size: 12px; 
    display: flex; align-items: center; gap: 8px; 
  }
  
  .ai-variation { 
    text-align: left; 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    color: #888; 
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
  .ai-variation:hover { border-color: rgba(200, 245, 90, 0.2); color: #C8F55A; background: rgba(200, 245, 90, 0.03); }
  
  .ai-empty { 
    padding: 32px 16px; 
    text-align: center; 
    color: #666; 
    display: flex; flex-direction: column; align-items: center; gap: 12px; 
  }
  .ai-empty-icon { 
    width: 40px; height: 40px; 
    background: rgba(255, 255, 255, 0.03); 
    border-radius: 10px; 
    display: flex; align-items: center; justify-content: center;
    color: #555;
  }
  .ai-empty-text { font-size: 12px; line-height: 1.5; max-width: 240px; }
  
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

const impactClass = (impact?: string) =>
  impact === "high" ? "ai-impact-high" : impact === "medium" ? "ai-impact-medium" : "ai-impact-low";

export function AIAssistantPanel() {
  const store = useResumeBuilderStore();
  const { resume, ui } = store;
  const [tone, setTone] = useState<AiTone>("professional");
  const [rewrite, setRewrite] = useState<AiRewriteResult | null>(null);
  const [grammar, setGrammar] = useState<AiGrammarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const target = useMemo(() => getFocusTarget(resume, ui.focusedField, ui.activeSection, store), [resume, ui.focusedField, ui.activeSection, store]);
  const blockedReason = useMemo(() => {
    if (ui.focusedField?.kind === "personal" && ui.focusedField.field && BLOCKED_PERSONAL_FIELDS.has(ui.focusedField.field)) {
      return "AI suggestions are not available for contact fields.";
    }
    return null;
  }, [ui.focusedField]);

  useEffect(() => {
    setRewrite(null);
    setGrammar(null);
    setError(null);
  }, [target?.text]);

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
    setLoading(true); setError(null);
    const payload = {
      text: target.text,
      section: target.section,
      tone,
      context: target.context,
      targetRole: resume.personalInfo.title || resume.title,
      forceRefresh: Boolean(rewrite),
      variationSeed: rewrite ? String(Date.now()) : undefined,
    };
    const request = target.section === "experience" || target.section === "projects" ? enhanceResumeBullet(payload) : improveResumeText(payload);
    request.then((result) => { setRewrite(result); setLastUpdatedAt(new Date().toISOString()); })
      .catch((err) => setError(err instanceof Error ? err.message : "AI suggestions failed"))
      .finally(() => setLoading(false));
  }, [target, blockedReason, tone, resume.personalInfo.title, resume.title, rewrite]);

  const handleGrammar = useCallback(() => {
    if (!target || blockedReason) return;
    setLoading(true); setError(null);
    checkResumeGrammar({
      text: target.text,
      section: target.section,
      context: target.context,
      forceRefresh: Boolean(grammar),
      variationSeed: grammar ? String(Date.now()) : undefined,
    })
      .then((result) => { setGrammar(result); setLastUpdatedAt(new Date().toISOString()); })
      .catch((err) => setError(err instanceof Error ? err.message : "Grammar check failed"))
      .finally(() => setLoading(false));
  }, [target, blockedReason, grammar]);

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
                {hasContent ? `Ready to improve "${target.label || target.section}"` : "Click any text field to get started"}
              </span>
            </div>
          </div>
          <div className="ai-header-right">
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
              {blockedReason ?? "Click on any text field in your resume to get AI-powered writing suggestions"}
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
              <button className="ai-btn-secondary" onClick={handleGrammar} disabled={loading || Boolean(blockedReason)}>
                <PenTool size={12} /> Grammar
              </button>
              <span className="ai-status">
                {loading ? "Working..." : lastUpdatedAt ? "Updated" : "Ready"}
              </span>
            </div>

            {/* Loading skeleton */}
            {loading && !rewrite && !grammar && (
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

            {/* Rewrite suggestions */}
            {rewrite && rewrite.suggestions.length > 0 && (
              <>
                <div className="ai-section-label">Suggestions</div>
                {rewrite.suggestions.slice(0, 2).map((suggestion) => (
                  <div key={suggestion.id} className="ai-card">
                    <div className="ai-card-header">
                      <div className="ai-card-reason">
                        {suggestion.reason}
                      </div>
                      {suggestion.impact && <span className={`ai-impact ${impactClass(suggestion.impact)}`}>{suggestion.impact}</span>}
                    </div>
                    <div className="ai-card-text">{suggestion.suggestionText}</div>
                    <div className="ai-card-actions">
                      <button className="ai-btn-apply" onClick={() => applySuggestion(suggestion.suggestionText)}>
                        <Check size={10} /> Apply
                      </button>
                      <button className="ai-btn-apply" onClick={() => handleCopy(suggestion.suggestionText, suggestion.id)}>
                        <Copy size={10} /> {copiedId === suggestion.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Grammar issues */}
            {grammar && grammar.issues.length > 0 && (
              <>
                <div className="ai-section-label">Grammar ({grammar.issues.length})</div>
                {grammar.issues.slice(0, 2).map((issue) => (
                  <div key={issue.id} className="ai-card">
                    <div className="ai-card-header">
                      <div className="ai-card-reason">{issue.reason}</div>
                    </div>
                    <div className="ai-card-text">{issue.suggestionText}</div>
                    <div className="ai-card-actions">
                      <button className="ai-btn-apply" onClick={() => applySuggestion(issue.suggestionText)}>
                        <Check size={10} /> Fix
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Rewrite variations */}
            {rewrite?.variations?.length ? (
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
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}


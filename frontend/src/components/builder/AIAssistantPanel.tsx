import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { improveResumeText, checkResumeGrammar, enhanceResumeBullet } from "@/services/api";
import type { AiRewriteResult, AiGrammarResult, AiTone, FocusedEditorField } from "@/types/resume-types";
import { Briefcase, Scissors, Settings, Target, Sparkles, Check, Copy, AlertCircle, RefreshCw, Loader2, PenTool } from "lucide-react";

const TONES: { id: AiTone; label: string; icon: React.ReactNode }[] = [
  { id: "professional", label: "Professional", icon: <Briefcase size={14} /> },
  { id: "concise", label: "Concise", icon: <Scissors size={14} /> },
  { id: "technical", label: "Technical", icon: <Settings size={14} /> },
  { id: "leadership-focused", label: "Leadership", icon: <Target size={14} /> },
];

type FocusTarget = {
  text: string;
  section: "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";
  context?: string;
  label?: string;
  applySuggestion: (suggestion: string) => void;
};

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

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
      const text = focusedField.field === "description" ? compact(entry.description)
        : focusedField.index !== undefined ? compact(entry.bullets[focusedField.index] ?? "")
        : focusedField.field === "tech" ? compact(entry.tech)
        : focusedField.field === "link" ? compact(entry.link) : compact(entry.name);
      return {
        text, section: "projects" as const, context: entry.name, label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "description") { store.updateProject(entry.id, "description", suggestion); return; }
          if (focusedField.field === "tech" || focusedField.field === "link" || focusedField.field === "name") { store.updateProject(entry.id, focusedField.field, suggestion); return; }
          if (focusedField.index !== undefined) { store.updateProjectBullet(entry.id, focusedField.index, suggestion); }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "education") {
    const entry = resume.sections.education.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = compact(String((entry as unknown as Record<string, unknown>)[focusedField.field ?? "institution"] ?? entry.institution));
      return {
        text, section: "education" as const, context: entry.institution, label: focusedField.label,
        applySuggestion: (suggestion: string) => { if (focusedField.field) store.updateEducation(entry.id, focusedField.field as keyof typeof entry, suggestion); },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "skills") {
    const entry = resume.sections.skills.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = focusedField.field === "items" ? compact(entry.items.join(", ")) : compact(entry.category);
      return {
        text, section: "skills" as const, context: entry.category, label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "items") { const items = suggestion.split(/[,\n]/).map((item) => compact(item)).filter(Boolean); store.updateSkillGroup(entry.id, "items", items.length > 0 ? items : entry.items); return; }
          store.updateSkillGroup(entry.id, "category", suggestion);
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "certification") {
    const entry = resume.sections.certifications.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = compact(String((entry as unknown as Record<string, unknown>)[focusedField.field ?? "name"] ?? entry.name));
      return {
        text, section: "certifications" as const, context: entry.issuer, label: focusedField.label,
        applySuggestion: (suggestion: string) => { if (focusedField.field) store.updateCertification(entry.id, focusedField.field as keyof typeof entry, suggestion); },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "language") {
    const entry = resume.sections.languages.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = compact(String((entry as unknown as Record<string, unknown>)[focusedField.field ?? "language"] ?? entry.language));
      return {
        text, section: "languages" as const, context: entry.language, label: focusedField.label,
        applySuggestion: (suggestion: string) => { if (focusedField.field) store.updateLanguage(entry.id, focusedField.field as keyof typeof entry, suggestion); },
      } satisfies FocusTarget;
    }
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
    const entry = [...resume.sections.skills].reverse().find((item) => compact(item.category) || item.items.length > 0);
    if (!entry) return null;
    return {
      text: compact([entry.category, entry.items.join(", ")].filter(Boolean).join(" - ")),
      section: "skills" as const, context: entry.category,
      applySuggestion: (suggestion: string) => {
        const items = suggestion.split(/[,\n]/).map((item) => compact(item)).filter(Boolean);
        store.updateSkillGroup(entry.id, "items", items.length > 0 ? items : entry.items);
      },
    } satisfies FocusTarget;
  }

  return null;
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const css = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .ai-panel { border-bottom: 1px solid rgba(255, 255, 255, 0.06); background: linear-gradient(180deg, #09090b 0%, #0c0c0e 100%); color: #e4e4e7; font-family: 'Outfit', system-ui, sans-serif; animation: fadeIn 0.3s ease-out; }
  .ai-header { padding: 18px 20px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .ai-title-wrap { display: flex; flex-direction: column; gap: 6px; }
  .ai-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #f4f4f5; letter-spacing: 0.2px; }
  .ai-context { display: inline-flex; align-items: center; padding: 4px 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; font-size: 11px; color: #a1a1aa; font-weight: 500; letter-spacing: 0.3px; }
  .ai-subtitle { font-size: 12px; color: #71717a; font-weight: 400; }
  
  .ai-tone-bar { display: flex; gap: 8px; padding: 0 20px 16px; flex-wrap: wrap; }
  .ai-tone-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06); background: rgba(255, 255, 255, 0.02); color: #a1a1aa; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  .ai-tone-btn:hover { border-color: rgba(255, 255, 255, 0.12); color: #e4e4e7; background: rgba(255, 255, 255, 0.05); transform: translateY(-1px); }
  .ai-tone-btn.active { background: rgba(200, 245, 90, 0.1); border-color: rgba(200, 245, 90, 0.3); color: #C8F55A; box-shadow: 0 0 12px rgba(200, 245, 90, 0.05); }
  
  .ai-actions { display: flex; gap: 10px; padding: 0 20px 20px; flex-wrap: wrap; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.04); margin-bottom: 16px; }
  .ai-btn-primary { display: flex; align-items: center; gap: 8px; background: #C8F55A; color: #0A0A0A; border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(200, 245, 90, 0.15); }
  .ai-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200, 245, 90, 0.2); background: #d4fa6e; }
  .ai-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
  
  .ai-btn-secondary { display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: #e4e4e7; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
  .ai-btn-secondary:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.15); }
  .ai-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .ai-btn-apply { display: flex; align-items: center; gap: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #e4e4e7; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
  .ai-btn-apply:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); }
  
  .ai-status { font-size: 12px; color: #71717a; margin-left: auto; display: flex; align-items: center; gap: 6px; font-weight: 500; }
  .ai-spin { animation: spin 1s linear infinite; }
  
  .ai-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px; margin: 0 20px 16px; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); }
  .ai-card:hover { border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.03); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); }
  .ai-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .ai-card-reason { font-size: 13px; font-weight: 600; color: #f4f4f5; display: flex; align-items: center; gap: 8px; }
  .ai-card-text { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 16px; }
  .ai-card-actions { display: flex; gap: 10px; }
  
  .ai-section-label { font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.8px; padding: 0 20px; margin: 0 0 12px; }
  
  .ai-error { margin: 0 20px 16px; padding: 14px; border-radius: 8px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); color: #fca5a5; font-size: 13px; display: flex; align-items: center; gap: 10px; font-weight: 500; }
  
  .ai-variation { text-align: left; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); color: #a1a1aa; border-radius: 8px; padding: 14px 16px; font-size: 13px; cursor: pointer; line-height: 1.5; transition: all 0.2s ease; width: calc(100% - 40px); margin: 0 20px 10px; display: block; }
  .ai-variation:hover { border-color: rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.05); color: #e4e4e7; transform: translateX(2px); }
  
  .ai-empty { padding: 48px 20px; text-align: center; color: #71717a; display: flex; flex-direction: column; align-items: center; gap: 16px; background: #0A0A0A; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
  .ai-empty-text { font-size: 14px; line-height: 1.6; max-width: 280px; font-weight: 400; }
  
  .ai-impact { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .ai-impact-high { background: rgba(220, 38, 38, 0.15); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.2); }
  .ai-impact-medium { background: rgba(217, 119, 6, 0.15); color: #fcd34d; border: 1px solid rgba(217, 119, 6, 0.2); }
  .ai-impact-low { background: rgba(22, 163, 74, 0.15); color: #86efac; border: 1px solid rgba(22, 163, 74, 0.2); }
  
  .ai-loader-block { background: rgba(255, 255, 255, 0.04); border-radius: 6px; height: 14px; margin: 10px 0; position: relative; overflow: hidden; }
  .ai-loader-block::after { content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent); animation: shimmer 1.5s infinite; }
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

  const target = useMemo(() => getFocusTarget(resume, ui.focusedField, ui.activeSection, store), [resume, ui.focusedField, ui.activeSection, store]);

  useEffect(() => {
    // Reset AI state when moving to a new target
    setRewrite(null);
    setGrammar(null);
    setError(null);
  }, [target?.text]);

  const applySuggestion = useCallback((suggestion: string) => { if (target) target.applySuggestion(suggestion); }, [target]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); }).catch(() => undefined);
  }, []);

  const handleImprove = useCallback(() => {
    if (!target) return;
    setLoading(true); setError(null);
    const payload = { text: target.text, section: target.section, tone, context: target.context, targetRole: resume.personalInfo.title || resume.title };
    const request = target.section === "experience" || target.section === "projects" ? enhanceResumeBullet(payload) : improveResumeText(payload);
    request.then((result) => { setRewrite(result); setLastUpdatedAt(new Date().toISOString()); })
      .catch((err) => setError(err instanceof Error ? err.message : "AI suggestions failed"))
      .finally(() => setLoading(false));
  }, [target, tone, resume.personalInfo.title, resume.title]);

  const handleGrammar = useCallback(() => {
    if (!target) return;
    setLoading(true); setError(null);
    checkResumeGrammar({ text: target.text, section: target.section, context: target.context })
      .then((result) => { setGrammar(result); setLastUpdatedAt(new Date().toISOString()); })
      .catch((err) => setError(err instanceof Error ? err.message : "Grammar check failed"))
      .finally(() => setLoading(false));
  }, [target]);

  if (!target) {
    return (
      <div className="ai-panel">
        <style>{css}</style>
        <div className="ai-empty">
          <Sparkles size={24} opacity={0.5} />
          <div className="ai-empty-text">Select any text field in the editor to view context-aware writing suggestions.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <style>{css}</style>

      {/* Header */}
      <div className="ai-header">
        <div className="ai-title-wrap">
          <div className="ai-title">
            <Sparkles size={14} /> AI Assistant
          </div>
          <div className="ai-subtitle">Select a tone to refine your content</div>
        </div>
        {target.label && <div className="ai-context">{target.label}</div>}
      </div>

      {/* Tone selector */}
      <div className="ai-tone-bar">
        {TONES.map((item) => (
          <button key={item.id} className={`ai-tone-btn ${tone === item.id ? "active" : ""}`} onClick={() => setTone(item.id)}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="ai-actions">
        <button className="ai-btn-primary" onClick={handleImprove} disabled={loading}>
          {loading ? <Loader2 size={14} className="ai-spin" /> : <RefreshCw size={14} />} 
          Improve Content
        </button>
        <button className="ai-btn-secondary" onClick={handleGrammar} disabled={loading}>
          <PenTool size={14} /> Check Grammar
        </button>
        <div className="ai-status">
          {loading ? "Analyzing..." : lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "Ready"}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !rewrite && !grammar && (
        <div style={{ padding: "0 16px 16px" }}>
          <div className="ai-loader-block" style={{ width: "80%" }} />
          <div className="ai-loader-block" style={{ width: "60%" }} />
          <div className="ai-loader-block" style={{ width: "90%" }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="ai-error">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Rewrite suggestions */}
      {rewrite && rewrite.suggestions.length > 0 && (
        <>
          <div className="ai-section-label">Recommendations</div>
          {rewrite.suggestions.slice(0, 3).map((suggestion) => (
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
                  <Check size={12} /> Apply
                </button>
                <button className="ai-btn-apply" onClick={() => handleCopy(suggestion.suggestionText, suggestion.id)}>
                  <Copy size={12} /> {copiedId === suggestion.id ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Grammar issues */}
      {grammar && grammar.issues.length > 0 && (
        <>
          <div className="ai-section-label">Grammar Issues</div>
          {grammar.issues.slice(0, 3).map((issue) => (
            <div key={issue.id} className="ai-card">
              <div className="ai-card-header">
                <div className="ai-card-reason">{issue.reason}</div>
              </div>
              <div className="ai-card-text">{issue.suggestionText}</div>
              <div className="ai-card-actions">
                <button className="ai-btn-apply" onClick={() => applySuggestion(issue.suggestionText)}>
                  <Check size={12} /> Resolve
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Rewrite variations */}
      {rewrite?.variations?.length ? (
        <>
          <div className="ai-section-label">Alternative Phrasing</div>
          <div style={{ padding: "0 0 16px" }}>
            {rewrite.variations.map((variation, index) => (
              <button key={`${variation}-${index}`} className="ai-variation" onClick={() => applySuggestion(variation)}>
                {variation}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

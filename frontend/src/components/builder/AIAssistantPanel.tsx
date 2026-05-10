import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { improveResumeText, checkResumeGrammar, enhanceResumeBullet } from "@/services/api";
import type { AiRewriteResult, AiGrammarResult, AiTone, FocusedEditorField } from "@/types/resume-types";

const TONES: { id: AiTone; label: string; icon: string }[] = [
  { id: "professional", label: "Professional", icon: "💼" },
  { id: "concise", label: "Concise", icon: "✂️" },
  { id: "technical", label: "Technical", icon: "⚙️" },
  { id: "leadership-focused", label: "Leadership", icon: "🎯" },
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
  @keyframes ai-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes ai-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes ai-fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .ai-panel { border-bottom: 1px solid #1E1E1E; background: linear-gradient(180deg, rgba(139,92,246,0.06) 0%, rgba(139,92,246,0.01) 100%); }
  .ai-header { padding: 14px 16px 12px; display: flex; align-items: center; gap: 10px; }
  .ai-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 7px; background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.15)); border: 1px solid rgba(139,92,246,0.3); border-radius: 20px; font-size: 11px; font-weight: 700; color: #C4B5FD; letter-spacing: 0.3px; }
  .ai-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #8B5CF6; box-shadow: 0 0 8px rgba(139,92,246,0.6); }
  .ai-subtitle { font-size: 11px; color: #555; margin-top: 2px; }
  .ai-tone-bar { display: flex; gap: 4px; padding: 0 16px 12px; flex-wrap: wrap; }
  .ai-tone-btn { padding: 5px 10px; border-radius: 8px; border: 1px solid #252525; background: #111; color: #777; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
  .ai-tone-btn:hover { border-color: rgba(139,92,246,0.4); color: #aaa; }
  .ai-tone-btn.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.4); color: #C4B5FD; }
  .ai-actions { display: flex; gap: 8px; padding: 0 16px 14px; flex-wrap: wrap; align-items: center; }
  .ai-btn-primary { background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.15)); border: 1px solid rgba(139,92,246,0.35); color: #C4B5FD; border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
  .ai-btn-primary:hover { background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.25)); border-color: rgba(139,92,246,0.5); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.2); }
  .ai-btn-secondary { background: #111; border: 1px solid #252525; color: #888; border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
  .ai-btn-secondary:hover { border-color: #3a3a3a; color: #bbb; }
  .ai-btn-apply { background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.1)); border: 1px solid rgba(34,197,94,0.3); color: #86EFAC; border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .ai-btn-apply:hover { background: linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.2)); transform: translateY(-1px); }
  .ai-btn-copy { background: #111; border: 1px solid #252525; color: #888; border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .ai-btn-copy:hover { border-color: #3a3a3a; color: #bbb; }
  .ai-status { font-size: 11px; color: #555; margin-left: auto; display: flex; align-items: center; gap: 6px; }
  .ai-loading-dot { width: 5px; height: 5px; border-radius: 50%; background: #8B5CF6; animation: ai-pulse 1.2s ease-in-out infinite; }
  .ai-card { background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 12px; padding: 14px; margin: 0 16px 10px; animation: ai-fadeIn 0.3s ease-out; transition: border-color 0.2s; }
  .ai-card:hover { border-color: rgba(139,92,246,0.25); }
  .ai-card-reason { font-size: 12px; font-weight: 700; color: #E5E5E5; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .ai-card-text { font-size: 12px; color: #999; line-height: 1.6; margin-bottom: 10px; }
  .ai-card-actions { display: flex; gap: 6px; }
  .ai-section-label { font-size: 10px; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 1px; padding: 0 16px; margin: 8px 0 10px; display: flex; align-items: center; gap: 8px; }
  .ai-section-label::after { content: ''; flex: 1; height: 1px; background: #1A1A1A; }
  .ai-error { margin: 0 16px 12px; padding: 10px 14px; border-radius: 10px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #FCA5A5; font-size: 12px; display: flex; align-items: center; gap: 8px; }
  .ai-variation { text-align: left; background: #0D0D0D; border: 1px solid #1E1E1E; color: #999; border-radius: 10px; padding: 12px 14px; font-size: 12px; cursor: pointer; line-height: 1.5; transition: all 0.2s; width: 100%; margin: 0 16px 6px; display: block; }
  .ai-variation:hover { border-color: rgba(139,92,246,0.3); color: #ccc; background: rgba(139,92,246,0.04); }
  .ai-empty { padding: 20px 16px; text-align: center; }
  .ai-empty-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.4; }
  .ai-empty-text { font-size: 12px; color: #444; line-height: 1.5; }
  .ai-impact { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .ai-impact-high { background: rgba(239,68,68,0.12); color: #F87171; }
  .ai-impact-medium { background: rgba(245,158,11,0.12); color: #FBBF24; }
  .ai-impact-low { background: rgba(34,197,94,0.12); color: #86EFAC; }
  .ai-shimmer { background: linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%); background-size: 200% 100%; animation: ai-shimmer 1.5s ease-in-out infinite; border-radius: 6px; height: 14px; margin: 4px 0; }
  .ai-context-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); border-radius: 6px; font-size: 10px; color: #93C5FD; font-weight: 600; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    if (!target || !target.text) { setRewrite(null); setGrammar(null); return; }
    const timeout = window.setTimeout(() => {
      setLoading(true); setError(null);
      const payload = { text: target.text, section: target.section, tone, context: target.context, targetRole: resume.personalInfo.title || resume.title };
      Promise.all([
        target.section === "experience" || target.section === "projects" ? enhanceResumeBullet(payload) : improveResumeText(payload),
        checkResumeGrammar(payload),
      ])
        .then(([rewriteResult, grammarResult]) => { setRewrite(rewriteResult); setGrammar(grammarResult); setLastUpdatedAt(new Date().toISOString()); })
        .catch((err) => setError(err instanceof Error ? err.message : "AI suggestions failed"))
        .finally(() => setLoading(false));
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [target, tone, resume.personalInfo.title, resume.title]);

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
          <div className="ai-empty-icon">✨</div>
          <div className="ai-empty-text">Click on any text field in your resume to get<br />AI-powered writing suggestions</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <style>{css}</style>

      {/* Header */}
      <div className="ai-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span className="ai-badge"><span className="ai-badge-dot" />AI Assistant</span>
            {target.label && <span className="ai-context-pill">📝 {target.label}</span>}
          </div>
          <div className="ai-subtitle">Context-aware suggestions · Nothing applied automatically</div>
        </div>
      </div>

      {/* Tone selector */}
      <div className="ai-tone-bar">
        {TONES.map((item) => (
          <button key={item.id} className={`ai-tone-btn ${tone === item.id ? "active" : ""}`} onClick={() => setTone(item.id)}>
            <span style={{ fontSize: 12 }}>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="ai-actions">
        <button className="ai-btn-primary" onClick={handleImprove} disabled={loading}>
          <span style={{ fontSize: 14 }}>✨</span> Improve with AI
        </button>
        <button className="ai-btn-secondary" onClick={handleGrammar} disabled={loading}>
          <span style={{ fontSize: 14 }}>📝</span> Check Grammar
        </button>
        <div className="ai-status">
          {loading ? (<><span className="ai-loading-dot" /><span className="ai-loading-dot" style={{ animationDelay: "0.2s" }} /><span className="ai-loading-dot" style={{ animationDelay: "0.4s" }} /> Analyzing...</>)
            : lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Ready"}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !rewrite && !grammar && (
        <div style={{ padding: "0 16px 12px" }}>
          <div className="ai-shimmer" style={{ width: "80%" }} />
          <div className="ai-shimmer" style={{ width: "60%", marginTop: 8 }} />
          <div className="ai-shimmer" style={{ width: "90%", marginTop: 8 }} />
        </div>
      )}

      {/* Error */}
      {error && <div className="ai-error"><span>⚠</span> {error}</div>}

      {/* Rewrite suggestions */}
      {rewrite && rewrite.suggestions.length > 0 && (
        <>
          <div className="ai-section-label">Suggestions</div>
          {rewrite.suggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="ai-card">
              <div className="ai-card-reason">
                <span>💡</span> {suggestion.reason}
                {suggestion.impact && <span className={`ai-impact ${impactClass(suggestion.impact)}`}>{suggestion.impact}</span>}
              </div>
              <div className="ai-card-text">{suggestion.suggestionText}</div>
              <div className="ai-card-actions">
                <button className="ai-btn-apply" onClick={() => applySuggestion(suggestion.suggestionText)}>✓ Apply</button>
                <button className="ai-btn-copy" onClick={() => handleCopy(suggestion.suggestionText, suggestion.id)}>
                  {copiedId === suggestion.id ? "Copied!" : "Copy"}
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
              <div className="ai-card-reason"><span>🔤</span> {issue.reason}</div>
              <div className="ai-card-text">{issue.suggestionText}</div>
              <div className="ai-card-actions">
                <button className="ai-btn-apply" onClick={() => applySuggestion(issue.suggestionText)}>✓ Accept</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Rewrite variations */}
      {rewrite?.variations?.length ? (
        <>
          <div className="ai-section-label">Alternative Rewrites</div>
          <div style={{ padding: "0 0 12px" }}>
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

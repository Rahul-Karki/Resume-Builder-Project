import React, { useEffect, useMemo, useState } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { improveResumeText, checkResumeGrammar, enhanceResumeBullet } from "@/services/api";
import type { AiRewriteResult, AiGrammarResult, AiTone, FocusedEditorField } from "@/types/resume-types";

const TONES: AiTone[] = ["professional", "concise", "technical", "leadership-focused"];

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
      text,
      section: "summary" as const,
      context: toneContext,
      label: focusedField.label,
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
        text,
        section: "experience" as const,
        context: `${entry.role} at ${entry.company}`,
        label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "description") {
            store.updateExperience(entry.id, "description", suggestion);
            return;
          }

          if (focusedField.index !== undefined) {
            store.updateBullet(entry.id, focusedField.index, suggestion);
          }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "projects") {
    const entry = resume.sections.projects.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = focusedField.field === "description"
        ? compact(entry.description)
        : focusedField.index !== undefined
          ? compact(entry.bullets[focusedField.index] ?? "")
          : focusedField.field === "tech"
            ? compact(entry.tech)
            : focusedField.field === "link"
              ? compact(entry.link)
              : compact(entry.name);

      return {
        text,
        section: "projects" as const,
        context: entry.name,
        label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "description") {
            store.updateProject(entry.id, "description", suggestion);
            return;
          }

          if (focusedField.field === "tech" || focusedField.field === "link" || focusedField.field === "name") {
            store.updateProject(entry.id, focusedField.field, suggestion);
            return;
          }

          if (focusedField.index !== undefined) {
            store.updateProjectBullet(entry.id, focusedField.index, suggestion);
          }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "education") {
    const entry = resume.sections.education.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = compact(String((entry as Record<string, unknown>)[focusedField.field ?? "institution"] ?? entry.institution));
      return {
        text,
        section: "education" as const,
        context: entry.institution,
        label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field) {
            store.updateEducation(entry.id, focusedField.field as keyof typeof entry, suggestion);
          }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "skills") {
    const entry = resume.sections.skills.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = focusedField.field === "items" ? compact(entry.items.join(", ")) : compact(entry.category);
      return {
        text,
        section: "skills" as const,
        context: entry.category,
        label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field === "items") {
            const items = suggestion.split(/[,\n]/).map((item) => compact(item)).filter(Boolean);
            store.updateSkillGroup(entry.id, "items", items.length > 0 ? items : entry.items);
            return;
          }

          store.updateSkillGroup(entry.id, "category", suggestion);
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "certification") {
    const entry = resume.sections.certifications.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = compact(String((entry as Record<string, unknown>)[focusedField.field ?? "name"] ?? entry.name));
      return {
        text,
        section: "certifications" as const,
        context: entry.issuer,
        label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field) {
            store.updateCertification(entry.id, focusedField.field as keyof typeof entry, suggestion);
          }
        },
      } satisfies FocusTarget;
    }
  }

  if (focusedField?.kind === "language") {
    const entry = resume.sections.languages.find((item) => item.id === focusedField.entityId);
    if (entry) {
      const text = compact(String((entry as Record<string, unknown>)[focusedField.field ?? "language"] ?? entry.language));
      return {
        text,
        section: "languages" as const,
        context: entry.language,
        label: focusedField.label,
        applySuggestion: (suggestion: string) => {
          if (focusedField.field) {
            store.updateLanguage(entry.id, focusedField.field as keyof typeof entry, suggestion);
          }
        },
      } satisfies FocusTarget;
    }
  }

  if (section === "personal") {
    return {
      text: compact(resume.personalInfo.summary),
      section: "summary" as const,
      context: toneContext,
      applySuggestion: (suggestion: string) => store.updatePersonalInfo("summary", suggestion),
    } satisfies FocusTarget;
  }

  if (section === "experience") {
    const entry = [...resume.sections.experience].reverse().find((item) => compact(item.description) || item.bullets.some((bullet) => compact(bullet)));
    if (!entry) return null;

    const bulletIndex = Math.max(0, entry.bullets.findIndex((bullet) => compact(bullet)));
    const text = compact(entry.contentMode === "paragraph" ? entry.description : entry.bullets[bulletIndex] ?? entry.description);

    return {
      text,
      section: "experience" as const,
      context: `${entry.role} at ${entry.company}`,
      applySuggestion: (suggestion: string) => {
        if (entry.contentMode === "paragraph") {
          store.updateExperience(entry.id, "description", suggestion);
          return;
        }

        if (bulletIndex >= 0) {
          store.updateBullet(entry.id, bulletIndex, suggestion);
        }
      },
    } satisfies FocusTarget;
  }

  if (section === "projects") {
    const entry = [...resume.sections.projects].reverse().find((item) => compact(item.description) || item.bullets.some((bullet) => compact(bullet)));
    if (!entry) return null;

    const bulletIndex = Math.max(0, entry.bullets.findIndex((bullet) => compact(bullet)));
    const text = compact(entry.contentMode === "paragraph" ? entry.description : entry.bullets[bulletIndex] ?? entry.description);

    return {
      text,
      section: "projects" as const,
      context: entry.name,
      applySuggestion: (suggestion: string) => {
        if (entry.contentMode === "paragraph") {
          store.updateProject(entry.id, "description", suggestion);
          return;
        }

        if (bulletIndex >= 0) {
          store.updateProjectBullet(entry.id, bulletIndex, suggestion);
        }
      },
    } satisfies FocusTarget;
  }

  if (section === "skills") {
    const entry = [...resume.sections.skills].reverse().find((item) => compact(item.category) || item.items.length > 0);
    if (!entry) return null;

    return {
      text: compact([entry.category, entry.items.join(", ")].filter(Boolean).join(" - ")),
      section: "skills" as const,
      context: entry.category,
      applySuggestion: (suggestion: string) => {
        const items = suggestion
          .split(/[,\n]/)
          .map((item) => compact(item))
          .filter(Boolean);
        store.updateSkillGroup(entry.id, "items", items.length > 0 ? items : entry.items);
      },
    } satisfies FocusTarget;
  }

  return null;
};

export function AIAssistantPanel() {
  const store = useResumeBuilderStore();
  const { resume, ui } = store;
  const [tone, setTone] = useState<AiTone>("professional");
  const [rewrite, setRewrite] = useState<AiRewriteResult | null>(null);
  const [grammar, setGrammar] = useState<AiGrammarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const target = useMemo(() => getFocusTarget(resume, ui.focusedField, ui.activeSection, store), [resume, ui.focusedField, ui.activeSection, store]);

  useEffect(() => {
    if (!target || !target.text) {
      setRewrite(null);
      setGrammar(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      const payload = {
        text: target.text,
        section: target.section,
        tone,
        context: target.context,
        targetRole: resume.personalInfo.title || resume.title,
      };

      Promise.all([
        target.section === "experience" || target.section === "projects"
          ? enhanceResumeBullet(payload)
          : improveResumeText(payload),
        checkResumeGrammar(payload),
      ])
        .then(([rewriteResult, grammarResult]) => {
          setRewrite(rewriteResult);
          setGrammar(grammarResult);
          setLastUpdatedAt(new Date().toISOString());
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "AI suggestions failed");
        })
        .finally(() => setLoading(false));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [target, tone, resume.personalInfo.title, resume.title]);

  const applySuggestion = (suggestion: string) => {
    if (!target) return;
    target.applySuggestion(suggestion);
  };

  if (!target) {
    return null;
  }

  return (
    <div style={{ borderBottom: "1px solid #1E1E1E", background: "linear-gradient(180deg, rgba(200,245,90,0.05), rgba(200,245,90,0.01))" }}>
      <div style={{ padding: "12px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#F0EFE8" }}>AI writing assistant</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Section-scoped suggestions only. Nothing is applied automatically.</div>
          </div>
          <div style={{ flex: 1 }} />
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value as AiTone)}
            style={{
              background: "#141414",
              border: "1px solid #252525",
              borderRadius: 8,
              color: "#C8C7C0",
              fontSize: 11,
              padding: "6px 8px",
            }}
          >
            {TONES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => {
              if (!target) return;
              setLoading(true);
              setError(null);
              const payload = {
                text: target.text,
                section: target.section,
                tone,
                context: target.context,
                targetRole: resume.personalInfo.title || resume.title,
              };
              const request = target.section === "experience" || target.section === "projects"
                ? enhanceResumeBullet(payload)
                : improveResumeText(payload);

              request
                .then((result) => setRewrite(result))
                .catch((err) => setError(err instanceof Error ? err.message : "AI suggestions failed"))
                .finally(() => setLoading(false));
            }}
            style={{
              background: "rgba(200,245,90,0.12)",
              border: "1px solid rgba(200,245,90,0.25)",
              color: "#E7F7B2",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Improve with AI
          </button>
          <button
            type="button"
            onClick={() => {
              if (!target) return;
              setLoading(true);
              setError(null);
              checkResumeGrammar({ text: target.text, section: target.section, context: target.context })
                .then(setGrammar)
                .catch((err) => setError(err instanceof Error ? err.message : "Grammar check failed"))
                .finally(() => setLoading(false));
            }}
            style={{
              background: "#121212",
              border: "1px solid #252525",
              color: "#C8C7C0",
              borderRadius: 8,
              padding: "7px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Check grammar
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11, color: "#666" }}>{loading ? "Thinking..." : lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Idle"}</div>
        </div>

        {error && (
          <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(127,29,29,0.35)", border: "1px solid rgba(248,113,113,0.2)", color: "#FCA5A5", fontSize: 12 }}>
            {error}
          </div>
        )}

        {rewrite && rewrite.suggestions.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {rewrite.suggestions.slice(0, 3).map((suggestion) => (
              <div key={suggestion.id} style={{ background: "#101010", border: "1px solid #252525", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#F0EFE8", marginBottom: 6 }}>{suggestion.reason}</div>
                <div style={{ fontSize: 12, color: "#AAA", lineHeight: 1.5, marginBottom: 8 }}>{suggestion.suggestionText}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => applySuggestion(suggestion.suggestionText)}
                    style={{ background: "rgba(200,245,90,0.12)", border: "1px solid rgba(200,245,90,0.25)", color: "#E7F7B2", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Apply suggestion
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(suggestion.suggestionText).catch(() => undefined)}
                    style={{ background: "#121212", border: "1px solid #252525", color: "#C8C7C0", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {grammar && grammar.issues.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#999", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Grammar issues</div>
            <div style={{ display: "grid", gap: 8 }}>
              {grammar.issues.slice(0, 3).map((issue) => (
                <div key={issue.id} style={{ background: "#101010", border: "1px solid #252525", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F0EFE8", marginBottom: 4 }}>{issue.reason}</div>
                  <div style={{ fontSize: 12, color: "#AAA", marginBottom: 8 }}>{issue.suggestionText}</div>
                  <button
                    type="button"
                    onClick={() => applySuggestion(issue.suggestionText)}
                    style={{ background: "#121212", border: "1px solid #252525", color: "#C8C7C0", borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Accept correction
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {rewrite?.variations?.length ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#999", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Rewrite variations</div>
            <div style={{ display: "grid", gap: 6 }}>
              {rewrite.variations.map((variation, index) => (
                <button
                  key={`${variation}-${index}`}
                  type="button"
                  onClick={() => applySuggestion(variation)}
                  style={{ textAlign: "left", background: "#101010", border: "1px solid #252525", color: "#C8C7C0", borderRadius: 10, padding: 10, fontSize: 12, cursor: "pointer", lineHeight: 1.45 }}
                >
                  {variation}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

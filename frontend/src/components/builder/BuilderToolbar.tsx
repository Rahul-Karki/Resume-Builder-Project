import React, { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";

type TemplateOption = {
  layoutId: string;
  name: string;
  status?: string;
  sortOrder?: number;
};

interface Props {
  onDownload: () => void;
  canDownload: boolean;
  isEditingExistingResume?: boolean;
}

export function BuilderToolbar({ onDownload, canDownload, isEditingExistingResume = false }: Props) {
  const { resume, ui, saveResume, initFromTemplate, setTitle } = useResumeBuilderStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(resume.title);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const response = await api.get("/templates");
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const mapped = rows
          .map((row: any) => ({
            layoutId: String(row.layoutId ?? ""),
            name: String(row.name ?? row.layoutId ?? "Template"),
            status: row.status,
            sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
          }))
          .filter((template: TemplateOption) => template.layoutId);

        if (active) {
          setTemplates(mapped.sort((a, b) => a.sortOrder! - b.sortOrder!));
        }
      } catch {
        if (active) {
          setTemplates([]);
        }
      } finally {
        if (active) {
          setTemplatesLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isEditingExistingResume) {
      setShowTemplates(false);
      setEditingTitle(false);
    }
  }, [isEditingExistingResume]);

  const currentTemplateLabel = templates.find((template) => template.layoutId === resume.templateId)?.name
    ?? resume.templateId
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());

  const handleSave = async () => {
    await saveResume();
  };

  const handleTitleCommit = () => {
    setTitle(titleDraft || "Untitled Resume");
    setEditingTitle(false);
  };

  return (
    <header style={{
      height: 56, background: "#0F0F0F", borderBottom: "1px solid #1E1E1E",
      display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
      fontFamily: "'Outfit', sans-serif", position: "relative", zIndex: 40,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ fontWeight: 800, fontSize: 15, color: "#F0EFE8", letterSpacing: "-0.3px", flexShrink: 0 }}>
        Resume<span style={{ color: "#C8F55A" }}>Studio</span>
      </div>

      <div style={{ width: 1, height: 24, background: "#2A2A2A", flexShrink: 0 }} />

      {/* Resume Title */}
      {editingTitle && !isEditingExistingResume ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={handleTitleCommit}
          onKeyDown={e => e.key === "Enter" && handleTitleCommit()}
          style={{
            background: "#1A1A1A", border: "1px solid #3A3A3A", borderRadius: 6,
            color: "#F0EFE8", fontSize: 13, fontWeight: 600, padding: "4px 10px",
            outline: "none", fontFamily: "inherit", width: 200,
          }}
        />
      ) : (
        <button
          onClick={() => {
            if (isEditingExistingResume) return;
            setTitleDraft(resume.title);
            setEditingTitle(true);
          }}
          title={isEditingExistingResume ? "Resume name is locked in edit mode" : "Click to rename"}
          disabled={isEditingExistingResume}
          style={{
            background: "none", border: "none", color: "#888", fontSize: 13,
            fontWeight: 500, cursor: isEditingExistingResume ? "not-allowed" : "pointer", fontFamily: "inherit",
            padding: "4px 8px", borderRadius: 6, maxWidth: 200,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            transition: "color 0.15s", opacity: isEditingExistingResume ? 0.5 : 1,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#F0EFE8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#888")}
        >
          ✎ {resume.title}
        </button>
      )}

      {/* Dirty indicator */}
      {ui.isDirty && !ui.isSaved && (
        <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600, flexShrink: 0 }}>● Unsaved</span>
      )}
      {ui.isSaved && (
        <span style={{ fontSize: 10, color: "#4ADE80", fontWeight: 600, flexShrink: 0 }}>✓ Saved</span>
      )}

      {/* Template switcher */}
      <div style={{ position: "relative", marginLeft: 4 }}>
        <button
          onClick={() => {
            if (isEditingExistingResume) return;
            setShowTemplates(!showTemplates);
          }}
          title={isEditingExistingResume ? "Template is locked in edit mode" : "Switch template"}
          disabled={isEditingExistingResume}
          style={{
            background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 7,
            color: "#C8C7C0", fontSize: 12, fontWeight: 600, padding: "5px 12px",
            cursor: isEditingExistingResume ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            opacity: isEditingExistingResume ? 0.6 : 1,
          }}
        >
          ◈ {currentTemplateLabel}
          <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
        </button>
        {showTemplates && !isEditingExistingResume && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowTemplates(false)} />
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#161616",
              border: "1px solid #2A2A2A", borderRadius: 10, overflow: "hidden",
              zIndex: 50, minWidth: 160, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            }}>
              {templatesLoading ? (
                <div style={{ padding: "10px 14px", color: "#666", fontSize: 13 }}>Loading templates...</div>
              ) : templates.length > 0 ? (
                templates.map((template) => (
                  <button
                    key={template.layoutId}
                    onClick={() => { void initFromTemplate(template.layoutId); setShowTemplates(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "9px 14px", background: resume.templateId === template.layoutId ? "#222" : "transparent",
                      border: "none", color: resume.templateId === template.layoutId ? "#F0EFE8" : "#888",
                      fontSize: 13, fontWeight: resume.templateId === template.layoutId ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {resume.templateId === template.layoutId ? "✓ " : "  "}{template.name}
                  </button>
                ))
              ) : (
                <div style={{ padding: "10px 14px", color: "#666", fontSize: 13 }}>No templates found.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      <div style={{ width: 1, height: 24, background: "#2A2A2A" }} />

      {/* Actions */}
      <button
        onClick={onDownload}
        disabled={!canDownload}
        title={canDownload ? "Download as PDF" : "Save resume first to enable download"}
        style={{
          background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 7,
          color: canDownload ? "#C8C7C0" : "#555", fontSize: 13, fontWeight: 600, padding: "7px 14px",
          cursor: canDownload ? "pointer" : "not-allowed", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          flexShrink: 0,
          opacity: canDownload ? 1 : 0.7,
        }}
      >
        ↓ Download PDF
      </button>

      <button
        onClick={handleSave}
        disabled={ui.isSaving}
        style={{
          background: "#C8F55A", border: "none", borderRadius: 7,
          color: "#0E0E0E", fontSize: 13, fontWeight: 800, padding: "7px 18px",
          cursor: ui.isSaving ? "wait" : "pointer", fontFamily: "inherit",
          opacity: ui.isSaving ? 0.7 : 1, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {ui.isSaving ? "Saving…" : "Save Resume"}
      </button>
    </header>
  );
}
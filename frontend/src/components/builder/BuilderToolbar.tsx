import React, { useState } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { PreviewScale } from "@/types/resume-types";

const SCALES: { label: string; value: PreviewScale }[] = [
  { label: "50%", value: 0.5 },
  { label: "60%", value: 0.6 },
  { label: "75%", value: 0.75 },
  { label: "85%", value: 0.85 },
  { label: "100%", value: 1 },
];

const TEMPLATES = [
  { id: "classic",   label: "Classic" },
  { id: "executive", label: "Executive" },
  { id: "modern",    label: "Modern" },
  { id: "compact",   label: "Compact" },
  { id: "sidebar",   label: "Sidebar" },
];

interface Props {
  onDownload: () => void;
  canDownload: boolean;
}

export function BuilderToolbar({ onDownload, canDownload }: Props) {
  const { resume, ui, saveResume, setPreviewScale, initFromTemplate, setTitle } = useResumeBuilderStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(resume.title);
  const [showTemplates, setShowTemplates] = useState(false);

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
      {editingTitle ? (
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
          onClick={() => { setTitleDraft(resume.title); setEditingTitle(true); }}
          title="Click to rename"
          style={{
            background: "none", border: "none", color: "#888", fontSize: 13,
            fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            padding: "4px 8px", borderRadius: 6, maxWidth: 200,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            transition: "color 0.15s",
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
          onClick={() => setShowTemplates(!showTemplates)}
          style={{
            background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 7,
            color: "#C8C7C0", fontSize: 12, fontWeight: 600, padding: "5px 12px",
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ◈ {TEMPLATES.find(t => t.id === resume.templateId)?.label ?? "Template"}
          <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
        </button>
        {showTemplates && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setShowTemplates(false)} />
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, background: "#161616",
              border: "1px solid #2A2A2A", borderRadius: 10, overflow: "hidden",
              zIndex: 50, minWidth: 160, boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { initFromTemplate(t.id); setShowTemplates(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 14px", background: resume.templateId === t.id ? "#222" : "transparent",
                    border: "none", color: resume.templateId === t.id ? "#F0EFE8" : "#888",
                    fontSize: 13, fontWeight: resume.templateId === t.id ? 700 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {resume.templateId === t.id ? "✓ " : "  "}{t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Preview scale */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "#555", marginRight: 4 }}>Zoom</span>
        {SCALES.map(s => (
          <button
            key={s.value}
            onClick={() => setPreviewScale(s.value)}
            style={{
              padding: "3px 8px", borderRadius: 5, border: "1px solid",
              borderColor: ui.previewScale === s.value ? "#C8F55A" : "#2A2A2A",
              background: ui.previewScale === s.value ? "rgba(200,245,90,0.1)" : "transparent",
              color: ui.previewScale === s.value ? "#C8F55A" : "#555",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

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
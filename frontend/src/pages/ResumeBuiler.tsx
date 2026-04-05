import React, { useEffect, useCallback, useRef } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { BuilderToolbar } from "@/components/builder/BuilderToolbar";
import { EditorPanel } from "@/components/builder/editorPanel";
import { StylePanel } from "@/components/builder/stylePanel";
import { PreviewPanel } from "@/components/builder/previewPanel";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { EditorTab, ResumeDocument } from "@/types/resume-types";

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS: { id: EditorTab; label: string; icon: string; description: string }[] = [
  { id: "content",  label: "Content",  icon: "◉", description: "Fill in your resume information" },
  { id: "style",    label: "Style",    icon: "◈", description: "Customize colors, fonts & layout" },
  { id: "sections", label: "Sections", icon: "◧", description: "Show/hide and reorder sections" },
];

// ─── Section reorder panel (shown in "sections" tab) ─────────────────────────
function SectionsTab() {
  const { resume, toggleSectionVisibility, reorderSections } = useResumeBuilderStore();
  const [dragging, setDragging] = React.useState<number | null>(null);

  const SECTION_LABELS: Record<string, { label: string; desc: string }> = {
    experience:     { label: "Experience",    desc: "Work history and achievements" },
    education:      { label: "Education",     desc: "Degrees & institutions" },
    skills:         { label: "Skills",        desc: "Technical & soft skill groups" },
    projects:       { label: "Projects",      desc: "Personal & open-source work" },
    certifications: { label: "Certifications", desc: "Professional credentials" },
    languages:      { label: "Languages",     desc: "Spoken languages & proficiency" },
  };

  return (
    <div style={{ padding: "14px", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ padding: "10px 12px", background: "#141414", border: "1px solid #252525", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "#555", lineHeight: 1.5 }}>
        Drag rows to reorder. Toggle the switch to show or hide a section from your resume.
      </div>
      {resume.sectionOrder.map((sectionKey, idx) => {
        const meta = SECTION_LABELS[sectionKey];
        const visible = resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility];
        return (
          <div
            key={sectionKey}
            draggable
            onDragStart={() => setDragging(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null && dragging !== idx) {
                reorderSections(dragging, idx);
                setDragging(null);
              }
            }}
            onDragEnd={() => setDragging(null)}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              background: "#141414", border: "1px solid #252525", borderRadius: 10,
              marginBottom: 6, cursor: "grab", userSelect: "none",
              opacity: dragging === idx ? 0.4 : 1,
              transition: "all 0.15s",
            }}
          >
            <span style={{ color: "#333", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>⠿</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: visible ? "#C8C7C0" : "#444" }}>{meta?.label}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>{meta?.desc}</div>
            </div>
            <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>#{idx + 1}</span>
            {/* Toggle */}
            <div
              onClick={() => toggleSectionVisibility(sectionKey as any)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: "pointer", flexShrink: 0,
                background: visible ? "#C8F55A" : "#1E1E1E",
                border: `1px solid ${visible ? "#C8F55A" : "#2A2A2A"}`,
                position: "relative", transition: "all 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%",
                background: visible ? "#0E0E0E" : "#3A3A3A",
                left: visible ? 23 : 3, transition: "left 0.2s",
              }} />
            </div>
          </div>
        );
      })}

      {/* ATS tips */}
      <div style={{ marginTop: 24, padding: "14px", background: "#0D1A12", border: "1px solid #1A3A24", borderRadius: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#4ADE80", marginBottom: 8 }}>✓ ATS Best Practices</div>
        {[
          "Always include Experience and Education — ATS parsers expect them.",
          "Skills sections dramatically improve keyword matching scores.",
          "Keep sections in a logical reading order: Experience → Education → Skills.",
        ].map((tip, i) => (
          <div key={i} style={{ fontSize: 11, color: "#3A7A50", marginBottom: 4, paddingLeft: 12, position: "relative" }}>
            <span style={{ position: "absolute", left: 0 }}>·</span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PDF Download (browser print approach) ────────────────────────────────────
function downloadResume(resume: ResumeDocument) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  // Import fonts and render resume HTML
  const content = document.getElementById("resume-preview-inner");
  if (!content) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${resume.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&family=Lora:wght@400;600&family=Outfit:wght@300;400;500;600&family=Source+Serif+4:wght@300;400;600&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { width: 210mm; min-height: 297mm; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      ${content.innerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 800);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ResumeBuilder() {
  const { resume, ui, setActiveTab, saveResume, initFromTemplate } = useResumeBuilderStore();

  // Init template from URL param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get("template") ?? "classic";
    initFromTemplate(templateId);
  }, []);

  // Ctrl+S to save
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveResume();
    }
  }, [saveResume]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (ui.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [ui.isDirty]);

  const handleDownload = () => downloadResume(resume);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&family=Lora:wght@400;600&family=Source+Serif+4:wght@300;400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { background: #0A0A0A; overflow: hidden; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #0A0A0A; }
    ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: #3A3A3A; }
    input, textarea, select { box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { outline: none; }
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0A0A0A", overflow: "hidden" }}>
        {/* Top Toolbar */}
        <BuilderToolbar onDownload={handleDownload} />

        {/* Error toast */}
        {ui.saveError && (
          <div style={{
            position: "fixed", top: 64, right: 20, background: "#7F1D1D", color: "#FCA5A5",
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif", zIndex: 100, border: "1px solid #991B1B",
          }}>
            ⚠ {ui.saveError}
          </div>
        )}

        {/* Main 3-column layout */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ─── LEFT PANEL: Editor / Style / Sections ─── */}
          <div style={{
            width: 360, flexShrink: 0, display: "flex", flexDirection: "column",
            background: "#0F0F0F", borderRight: "1px solid #1E1E1E",
          }}>
            {/* Tab switcher */}
            <div style={{
              display: "flex", borderBottom: "1px solid #1E1E1E",
              padding: "0 8px", background: "#0A0A0A",
            }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.description}
                  style={{
                    flex: 1, padding: "12px 8px", background: "none", border: "none",
                    borderBottom: `2px solid ${ui.activeTab === tab.id ? "#C8F55A" : "transparent"}`,
                    color: ui.activeTab === tab.id ? "#C8F55A" : "#555",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 11 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {ui.activeTab === "content"  && <EditorPanel />}
              {ui.activeTab === "style"   && <StylePanel />}
              {ui.activeTab === "sections" && (
                <div style={{ overflowY: "auto", flex: 1 }}>
                  <SectionsTab />
                </div>
              )}
            </div>

            {/* Bottom status bar */}
            <div style={{
              borderTop: "1px solid #1A1A1A", padding: "8px 14px",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'Outfit', sans-serif",
            }}>
              <span style={{ fontSize: 10, color: "#333" }}>⌘S to save</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: "#2A2A2A" }}>
                {resume.sections.experience.length} exp · {resume.sections.skills.length} skill groups · {resume.sections.education.length} edu
              </span>
            </div>
          </div>

          {/* ─── RIGHT PANEL: Live Preview ─── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            {/* Preview panel with inner ID for export */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div id="resume-preview-inner" style={{ display: "none" }}>
                {/* Hidden 1:1 clone for PDF export — same renderer, no scaling */}
                <ResumeRenderer resume={resume} />
              </div>
              <PreviewPanel onDownload={handleDownload} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
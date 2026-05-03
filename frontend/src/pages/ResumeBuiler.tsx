import React, { useEffect, useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { BuilderToolbar } from "@/components/builder/BuilderToolbar";
import { EditorPanel } from "@/components/builder/editorPanel";
import { StylePanel } from "@/components/builder/stylePanel";
import { PreviewPanel } from "@/components/builder/previewPanel";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { EditorTab, ResumeDocument } from "@/types/resume-types";
import { exportResumePdfSafe, getResumeExportPreset } from "@/services/api";

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

    </div>
  );
}

// ─── PDF Download (browser print approach) ────────────────────────────────────
async function downloadResume(
  resume: ResumeDocument,
  preset: "web" | "standard" | "print",
  resumeId?: string,
  onStatus?: (status: string) => void,
) {
  const resumeMarkup = renderToStaticMarkup(<ResumeRenderer resume={resume} forExport />);
  onStatus?.("Preparing export payload...");

  if (resumeId) {
    try {
      onStatus?.("Resolving export preset...");
      await getResumeExportPreset(resumeId, preset);
    } catch {
      // Keep browser export available even if preset endpoint fails.
    }
  }

  if (resumeId && resumeMarkup.trim().length > 0) {
    try {
      onStatus?.("Generating secure PDF...");
      const safeResult = await exportResumePdfSafe(resumeId, {
        html: resumeMarkup,
        title: resume.title,
        preset,
      });

      if (safeResult.blob.size > 0) {
        onStatus?.("Downloading PDF...");
        const blobUrl = window.URL.createObjectURL(safeResult.blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = safeResult.filename ?? `${resume.title.replace(/\s+/g, "_")}_safe.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
    } catch {
      // Keep local browser export as resilient fallback.
    }
  }

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${resume.title} (${preset})</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&family=Lora:wght@400;600&family=Outfit:wght@300;400;500;600&family=Source+Serif+4:wght@300;400;600&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 210mm; height: 297mm; }
        body {
          overflow: hidden;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .pdf-page {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          overflow: hidden;
        }
        .pdf-page > * {
          width: 100% !important;
          max-width: 100% !important;
        }
        @media print {
          html, body, .pdf-page {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="pdf-page">${resumeMarkup}</div>
    </body>
    </html>
  `;

  const printedViaFrame = await new Promise<boolean>((resolve) => {
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";

    let done = false;
    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      window.setTimeout(() => frame.remove(), 1000);
      resolve(result);
    };

    const safetyTimer = window.setTimeout(() => finish(false), 6500);

    frame.addEventListener("load", () => {
      const targetWindow = frame.contentWindow;
      if (!targetWindow) {
        window.clearTimeout(safetyTimer);
        finish(false);
        return;
      }

      const attemptPrint = () => {
        try {
          targetWindow.focus();
          targetWindow.print();
          window.clearTimeout(safetyTimer);
          finish(true);
        } catch {
          window.clearTimeout(safetyTimer);
          finish(false);
        }
      };

      const fonts = targetWindow.document?.fonts;
      if (fonts?.ready) {
        fonts.ready.then(() => window.setTimeout(attemptPrint, 120)).catch(() => window.setTimeout(attemptPrint, 120));
      } else {
        window.setTimeout(attemptPrint, 180);
      }
    }, { once: true });

    document.body.appendChild(frame);

    const frameDoc = frame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printHtml);
      frameDoc.close();
    } else {
      frame.srcdoc = printHtml;
    }
  });

  if (printedViaFrame) {
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    window.alert("Could not open print dialog. Please allow popups for this site or disable popup-blocking extensions, then try again.");
    return;
  }

  printWindow.document.write(printHtml);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 800);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ResumeBuilder() {
  const { resume, ui, setActiveTab, saveResume, initFromTemplate, loadResume } = useResumeBuilderStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const isEditingExistingResume = Boolean(searchParams.get("resume"));
  const canDownload = isEditingExistingResume
    ? Boolean(resume.id) && !ui.isSaving
    : ui.isSaved && !ui.isDirty && !ui.isSaving;

  // Init from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get("resume");
    const templateId = params.get("template") ?? "classic";
    const preloadedResume = (location.state as { preloadedResume?: ResumeDocument } | null)?.preloadedResume;

    if (resumeId) {
      void loadResume(resumeId, preloadedResume);
      return;
    }

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

  const handleDownload = () => {
    if (!canDownload || isExporting) {
      return;
    }
    setIsExporting(true);
    setExportStatus("Preparing export...");
    const resumeId = resume.id ?? resume._id;
    void downloadResume(resume, ui.exportPreset, resumeId, setExportStatus)
      .finally(() => {
        setIsExporting(false);
        window.setTimeout(() => setExportStatus(null), 1500);
      });
  };

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 1100);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=EB+Garamond:wght@400;500;600&family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Serif:wght@400;600&family=Nunito:wght@600;700;800&family=Nunito+Sans:wght@300;400;700&family=Lora:wght@400;600&family=Source+Serif+4:wght@300;400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { background: #0A0A0A; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #0A0A0A; }
    ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: #3A3A3A; }
    input, textarea, select { box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { outline: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "auto" : "100vh", minHeight: "100vh", background: "#0A0A0A", overflow: isMobile ? "visible" : "hidden" }}>
        {/* Top Toolbar */}
        <BuilderToolbar
          onDownload={handleDownload}
          canDownload={canDownload}
          isEditingExistingResume={isEditingExistingResume}
          isExporting={isExporting}
          exportStatus={exportStatus}
        />

        {isExporting && (
          <div style={{ position: "sticky", top: 0, zIndex: 55, background: "linear-gradient(90deg, rgba(200,245,90,0.16), rgba(200,245,90,0.05))", borderBottom: "1px solid rgba(200,245,90,0.18)", color: "#E7F7B2", padding: "10px 16px", fontSize: 12, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(231,247,178,0.3)", borderTopColor: "#E7F7B2", animation: "spin 0.8s linear infinite" }} />
              <span>{exportStatus ?? "Preparing export..."}</span>
            </div>
          </div>
        )}

        {/* Error toast */}
        {ui.saveError && (
          <div style={{
            position: "fixed", top: 64, right: isMobile ? 12 : 20, left: isMobile ? 12 : "auto", background: "#7F1D1D", color: "#FCA5A5",
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif", zIndex: 100, border: "1px solid #991B1B",
          }}>
            ⚠ {ui.saveError}
          </div>
        )}

        {/* Main 3-column layout */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: isMobile ? "column" : "row" }}>

          {/* ─── LEFT PANEL: Editor / Style / Sections ─── */}
          <div style={{
            width: isMobile ? "100%" : 360, maxHeight: isMobile ? "50vh" : "none", flexShrink: 0, display: "flex", flexDirection: "column",
            background: "#0F0F0F", borderRight: isMobile ? "none" : "1px solid #1E1E1E", borderBottom: isMobile ? "1px solid #1E1E1E" : "none",
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
          <div style={{ flex: 1, minHeight: isMobile ? "50vh" : "auto", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            {/* Preview panel with inner ID for export */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div id="resume-preview-inner" style={{ display: "none" }}>
                {/* Hidden 1:1 clone for PDF export — same renderer, no scaling */}
                <div style={{ all: "initial", display: "block", width: "100%", height: "100%" }}>
                  <ResumeRenderer resume={resume} />
                </div>
              </div>
              <PreviewPanel onDownload={handleDownload} canDownload={canDownload} isExporting={isExporting} exportStatus={exportStatus} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
import React, { useEffect, useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { BuilderToolbar } from "@/components/builder/BuilderToolbar";
import { EditorPanel } from "@/components/builder/editorPanel";
import { StylePanel } from "@/components/builder/stylePanel";
import { PreviewPanel } from "@/components/builder/previewPanel";
import { ATSAnalysisPanel } from "@/components/builder/ATSAnalysisPanel";
import { AIAssistantPanel } from "@/components/builder/AIAssistantPanel";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { EditorTab, ResumeDocument } from "@/types/resume-types";
import { api, getResumeDownloadJobStatus, queueResumeDownload } from "@/services/api";

// ─── Tab definitions ──────────────────────────────────────────────────────────
import { FileText, Palette, LayoutGrid } from "lucide-react";

const TABS: { id: EditorTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "content",  label: "Content",  icon: <FileText size={14} />, description: "Fill in your resume information" },
  { id: "style",    label: "Style",    icon: <Palette size={14} />, description: "Customize colors, fonts & layout" },
  { id: "sections", label: "Sections", icon: <LayoutGrid size={14} />, description: "Show/hide and reorder sections" },
];

// ─── Section reorder panel (shown in "sections" tab) ─────────────────────────
import { GripVertical, Eye, EyeOff, Briefcase, GraduationCap, Wrench, FolderGit, Award, Languages } from "lucide-react";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  experience: <Briefcase size={16} />,
  education: <GraduationCap size={16} />,
  skills: <Wrench size={16} />,
  projects: <FolderGit size={16} />,
  certifications: <Award size={16} />,
  languages: <Languages size={16} />,
};

function SectionsTab() {
  const { resume, toggleSectionVisibility, reorderSections } = useResumeBuilderStore();
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [dragOver, setDragOver] = React.useState<number | null>(null);

  const SECTION_LABELS: Record<string, { label: string; desc: string }> = {
    experience:     { label: "Experience",    desc: "Work history and achievements" },
    education:      { label: "Education",     desc: "Degrees & institutions" },
    skills:         { label: "Skills",        desc: "Technical & soft skill groups" },
    projects:       { label: "Projects",      desc: "Personal & open-source work" },
    certifications: { label: "Certifications", desc: "Professional credentials" },
    languages:      { label: "Languages",     desc: "Spoken languages & proficiency" },
  };

  return (
    <div style={{ padding: "16px", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ 
        padding: "12px 14px", 
        background: "linear-gradient(135deg, rgba(200,245,90,0.08) 0%, rgba(200,245,90,0.02) 100%)", 
        border: "1px solid rgba(200,245,90,0.15)", 
        borderRadius: 10, 
        marginBottom: 16, 
        fontSize: 12, 
        color: "#888", 
        lineHeight: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        <GripVertical size={14} style={{ color: "#C8F55A" }} />
        Drag sections to reorder. Click the eye icon to show/hide.
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {resume.sectionOrder.map((sectionKey, idx) => {
          const meta = SECTION_LABELS[sectionKey];
          const visible = resume.sectionVisibility[sectionKey as keyof typeof resume.sectionVisibility];
          const isDragging = dragging === idx;
          const isDragOver = dragOver === idx;
          
          return (
            <div
              key={sectionKey}
              draggable
              onDragStart={() => setDragging(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(idx);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragging !== null && dragging !== idx) {
                  reorderSections(dragging, idx);
                }
                setDragging(null);
                setDragOver(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setDragOver(null);
              }}
              style={{
                display: "flex", 
                alignItems: "center", 
                gap: 12, 
                padding: "14px 16px",
                background: isDragging ? "rgba(200,245,90,0.05)" : isDragOver ? "rgba(200,245,90,0.08)" : "#141414", 
                border: `1px solid ${isDragOver ? "rgba(200,245,90,0.3)" : "#252525"}`, 
                borderRadius: 12,
                cursor: "grab", 
                userSelect: "none",
                opacity: isDragging ? 0.5 : 1,
                transform: isDragOver ? "translateY(2px)" : "none",
                transition: "all 0.2s ease",
                boxShadow: isDragOver ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
              }}
            >
              <div style={{ color: visible ? "#555" : "#333", flexShrink: 0, cursor: "grab" }}>
                <GripVertical size={18} />
              </div>
              
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 8, 
                background: visible ? "rgba(200,245,90,0.1)" : "#1A1A1A",
                border: `1px solid ${visible ? "rgba(200,245,90,0.2)" : "#2A2A2A"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: visible ? "#C8F55A" : "#555",
                flexShrink: 0,
                transition: "all 0.2s ease"
              }}>
                {SECTION_ICONS[sectionKey]}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: visible ? "#C8C7C0" : "#555",
                  transition: "color 0.2s ease"
                }}>
                  {meta?.label}
                </div>
                <div style={{ fontSize: 11, color: visible ? "#666" : "#444", marginTop: 2 }}>
                  {meta?.desc}
                </div>
              </div>
              
              <span style={{ 
                fontSize: 11, 
                color: "#444", 
                fontFamily: "monospace",
                background: "#1A1A1A",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid #2A2A2A"
              }}>
                {idx + 1}
              </span>
              
              {/* Toggle Button */}
              <button
                onClick={() => toggleSectionVisibility(sectionKey as any)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #2A2A2A",
                  background: visible ? "rgba(200,245,90,0.1)" : "#1A1A1A",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: visible ? "#C8F55A" : "#555",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                title={visible ? "Hide section" : "Show section"}
              >
                {visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RESUME_DOWNLOAD_POLL_INTERVAL_MS = 5000;
const RESUME_DOWNLOAD_MAX_POLLS = 60;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const sanitizeFileName = (value: string) =>
  Array.from(value)
    .map((char) => (char.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(char) ? "-" : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim() || "resume";

const buildDownloadFileName = (resume: ResumeDocument, preset: string) => `${sanitizeFileName(resume.title || "resume")}-${preset}.pdf`;

const normalizeDownloadUrl = (downloadUrl: string) => {
  // If already absolute URL, use as-is
  if (/^https?:\/\//i.test(downloadUrl)) {
    return downloadUrl;
  }

  // If relative path starting with /api, prepend backend domain
  if (downloadUrl.startsWith("/api/")) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    const backendBase = apiBaseUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${backendBase}${downloadUrl}`;
  }

  return downloadUrl;
};

const openPdfInNewTab = (downloadUrl: string) => {
  const url = normalizeDownloadUrl(downloadUrl);
  // Open PDF directly in browser's native viewer
  // Browser detects Content-Type: application/pdf and activates native PDF viewer
  // User gets zoom, print, and native save/download controls
  // Backend serves with Content-Disposition: inline for browser preview
  window.open(url, "_blank");
};

const waitForResumeDownload = async (jobId: string, onStatus?: (status: string) => void) => {
  for (let attempt = 1; attempt <= RESUME_DOWNLOAD_MAX_POLLS; attempt += 1) {
    const status = await getResumeDownloadJobStatus(jobId);

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "failed") {
      throw new Error(status.lastError || "Resume download failed");
    }

    onStatus?.(`Generating PDF... (${attempt}/${RESUME_DOWNLOAD_MAX_POLLS})`);
    await sleep(RESUME_DOWNLOAD_POLL_INTERVAL_MS);
  }

  throw new Error("Resume download is taking longer than expected. Please try again later.");
};

async function downloadResume(
  resume: ResumeDocument,
  preset: "web" | "standard" | "print",
  resumeId?: string,
  onStatus?: (status: string) => void,
) {
  onStatus?.("Queuing PDF export...");

  const queueResponse = await queueResumeDownload(
    resumeId
      ? { resumeId, preset }
      : { resume, preset },
  );

  const initialDownloadUrl = queueResponse.resultUrl || queueResponse.downloadUrl;

  if (queueResponse.status === "failed") {
    throw new Error(queueResponse.message || "Resume download failed");
  }

  if (queueResponse.status === "completed" && initialDownloadUrl) {
    onStatus?.("Opening PDF...");
    openPdfInNewTab(initialDownloadUrl);
    return;
  }

  onStatus?.("Generating PDF...");
  const completedJob = await waitForResumeDownload(queueResponse.jobId, onStatus);
  const downloadUrl = completedJob.resultUrl || initialDownloadUrl;

  if (!downloadUrl) {
    throw new Error("Resume download finished without a download URL.");
  }

  onStatus?.("Opening PDF...");
  openPdfInNewTab(downloadUrl);
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ResumeBuilder() {
  const { resume, ui, setActiveTab, saveResume, initFromTemplate, loadResume, updatePersonalInfo } = useResumeBuilderStore();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
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

  // Prefill immutable personal info from the authenticated user.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await api.get("/auth/me");
        const user = response.data?.user;
        if (!user || cancelled) return;

        const nextName = String(user.name ?? "").trim();
        const nextEmail = String(user.email ?? "").trim();

        if (!resume.personalInfo.name?.trim() && nextName) updatePersonalInfo("name", nextName);
        if (!resume.personalInfo.email?.trim() && nextEmail) updatePersonalInfo("email", nextEmail);
      } catch {
        // ignore: builder should still function without this call
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [resume.personalInfo.name, resume.personalInfo.email, updatePersonalInfo]);

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
    setExportError(null);
    setExportStatus("Preparing export...");
    const resumeId = resume.id ?? resume._id;
    void downloadResume(resume, ui.exportPreset, resumeId, setExportStatus)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Resume download failed. Please try again.";
        setExportError(message);
        setExportStatus(message);
      })
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

        {exportError && (
          <div style={{
            position: "fixed", top: 64, right: isMobile ? 12 : 20, left: isMobile ? 12 : "auto", background: "#7F1D1D", color: "#FCA5A5",
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif", zIndex: 101, border: "1px solid #991B1B",
          }}>
            {exportError}
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
              display: "flex", 
              borderBottom: "1px solid #1E1E1E",
              padding: "8px 12px 0", 
              background: "#0A0A0A",
              gap: 4,
            }}>
              {TABS.map(tab => {
                const isActive = ui.activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.description}
                    style={{
                      flex: 1, 
                      padding: "10px 12px", 
                      background: isActive ? "rgba(200,245,90,0.08)" : "transparent", 
                      border: "none",
                      borderRadius: "8px 8px 0 0",
                      borderBottom: `2px solid ${isActive ? "#C8F55A" : "transparent"}`,
                      color: isActive ? "#C8F55A" : "#666",
                      fontSize: 12, 
                      fontWeight: isActive ? 700 : 600, 
                      cursor: "pointer", 
                      fontFamily: "'Outfit', sans-serif",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 6,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{ 
                      opacity: isActive ? 1 : 0.7,
                      transition: "opacity 0.2s ease"
                    }}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {ui.activeTab === "content"  && (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                  <AIAssistantPanel />
                  <div style={{ flex: 1, overflow: "auto" }}>
                    <EditorPanel />
                  </div>
                </div>
              )}
              {ui.activeTab === "style"   && <StylePanel />}
              {ui.activeTab === "sections" && (
                <div style={{ overflowY: "auto", flex: 1 }}>
                  <SectionsTab />
                </div>
              )}
            </div>

            {/* Bottom status bar */}
            <div style={{
              borderTop: "1px solid #1A1A1A", 
              padding: "10px 16px",
              display: "flex", 
              alignItems: "center", 
              gap: 12,
              fontFamily: "'Outfit', sans-serif",
              background: "#0A0A0A",
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 6,
                fontSize: 11, 
                color: "#555",
                background: "#141414",
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #252525"
              }}>
                <span style={{ color: "#C8F55A", fontWeight: 600 }}>⌘S</span>
                <span>to save</span>
              </div>
              
              <div style={{ flex: 1 }} />
              
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 12,
                fontSize: 11, 
                color: "#666" 
              }}>
                <span style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  background: "#141414",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #252525"
                }}>
                  <span style={{ color: "#C8F55A", fontWeight: 600 }}>{resume.sections.experience.length}</span>
                  <span>exp</span>
                </span>
                <span style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  background: "#141414",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #252525"
                }}>
                  <span style={{ color: "#C8F55A", fontWeight: 600 }}>{resume.sections.skills.length}</span>
                  <span>skills</span>
                </span>
                <span style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  background: "#141414",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #252525"
                }}>
                  <span style={{ color: "#C8F55A", fontWeight: 600 }}>{resume.sections.education.length}</span>
                  <span>edu</span>
                </span>
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL: Live Preview ─── */}
          <div style={{ flex: 1, minHeight: isMobile ? "50vh" : "auto", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            <ATSAnalysisPanel />
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

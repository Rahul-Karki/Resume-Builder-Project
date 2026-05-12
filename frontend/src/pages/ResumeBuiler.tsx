import React, { useEffect, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { BuilderToolbar } from "@/components/builder/BuilderToolbar";
import { BuilderWorkspaceChrome } from "@/components/builder/BuilderWorkspaceChrome";
import { EditorPanel } from "@/components/builder/editorPanel";
import { StylePanel } from "@/components/builder/stylePanel";
import { PreviewPanel } from "@/components/builder/previewPanel";
import { AIAssistantPanel } from "@/components/builder/AIAssistantPanel";
import { ATSAnalysisPanel } from "@/components/builder/ATSAnalysisPanel";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import { EditorTab, ResumeDocument } from "@/types/resume-types";
import { api, getResumeDownloadJobStatus, queueResumeDownload } from "@/services/api";

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
    <div className="p-4 lg:p-5 font-['Outfit']">
      {/* Info banner */}
      <div className="mb-4 p-3 lg:p-4 bg-linear-to-r from-[#c8f55a]/12 to-[#c8f55a]/3 border border-[#c8f55a]/20 rounded-xl text-xs lg:text-sm text-white/75 leading-relaxed flex items-start gap-3">
        <GripVertical size={14} className="text-[#c8f55a] shrink-0 mt-0.5" />
        <span>Drag sections to reorder. Click the eye icon to show/hide.</span>
      </div>
      
      {/* Sections list */}
      <div className="space-y-2">
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
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-200 cursor-grab select-none ${
                isDragging
                  ? "opacity-50 bg-[#c8f55a]/5"
                  : isDragOver
                    ? "border-[#c8f55a]/30 bg-[#c8f55a]/8 shadow-md translate-y-0.5"
                    : "border-[#252525] bg-[#141414] hover:border-[#3a3a3a]"
              }`}
            >
              {/* Drag Handle */}
              <div className={`shrink-0 ${visible ? "text-white/60" : "text-white/30"}`}>
                <GripVertical size={16} />
              </div>
              
              {/* Section Icon */}
              <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                visible
                  ? "border-[#c8f55a]/20 bg-[#c8f55a]/10 text-[#c8f55a]"
                  : "border-[#2a2a2a] bg-[#1a1a1a] text-white/40"
              }`}>
                {SECTION_ICONS[sectionKey]}
              </div>
              
              {/* Section Info */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold transition-colors ${visible ? "text-white" : "text-white/50"}`}>
                  {meta?.label}
                </div>
                <div className={`text-xs leading-tight mt-1 transition-colors ${visible ? "text-white/50" : "text-white/30"}`}>
                  {meta?.desc}
                </div>
              </div>
              
              {/* Index Badge */}
              <span className="text-xs font-semibold text-white/40 bg-[#1a1a1a] px-2 py-1 rounded-md border border-[#2a2a2a] shrink-0">
                {idx + 1}
              </span>
              
              {/* Toggle Visibility Button */}
              <button
                onClick={() => toggleSectionVisibility(sectionKey as any)}
                className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-all hover:scale-105 ${
                  visible
                    ? "border-[#c8f55a]/20 bg-[#c8f55a]/10 text-[#c8f55a] hover:border-[#c8f55a]/40"
                    : "border-[#2a2a2a] bg-[#1a1a1a] text-white/40 hover:border-[#3a3a3a]"
                }`}
                title={visible ? "Hide section" : "Show section"}
              >
                {visible ? <Eye size={14} /> : <EyeOff size={14} />}
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
    const normalizedUrl = `${backendBase}${downloadUrl}`;
    
    // Log for debugging
    console.log('[Download] Normalizing URL:', {
      downloadUrl,
      apiBaseUrl,
      backendBase,
      normalizedUrl
    });
    
    return normalizedUrl;
  }

  return downloadUrl;
};

const openPdfInNewTab = (downloadUrl: string) => {
  const url = normalizeDownloadUrl(downloadUrl);
  console.log('[Download] Opening PDF in new tab:', url);
  
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

  console.log('[Download] Starting download process:', { resumeId, preset });

  const queueResponse = await queueResumeDownload(
    resumeId
      ? { resumeId, preset }
      : { resume, preset },
  );

  console.log('[Download] Queue response:', queueResponse);

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

  console.log('[Download] Job completed:', { completedJob, downloadUrl });

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
      console.log('[Download] Download blocked:', { canDownload, isExporting, isEditingExistingResume, resumeId: resume.id ?? resume._id, ui });
      return;
    }
    setIsExporting(true);
    setExportError(null);
    setExportStatus("Preparing export...");
    const resumeId = resume.id ?? resume._id;
    console.log('[Download] Starting download with resumeId:', resumeId);
    void downloadResume(resume, ui.exportPreset, resumeId, setExportStatus)
      .catch((error) => {
        console.error('[Download] Error:', error);
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

  const activeTabContent = (() => {
    switch (ui.activeTab) {
      case "content":
        return <EditorPanel />;
      case "style":
        return <StylePanel />;
      case "sections":
        return <SectionsTab />;
      case "ai":
        return <AIAssistantPanel />;
      case "ats":
        return <ATSAnalysisPanel />;
      default:
        return <EditorPanel />;
    }
  })();

  const previewContent = (
    <>
      <div id="resume-preview-inner" style={{ display: "none" }}>
        {/* Hidden 1:1 clone for PDF export — same renderer, no scaling */}
        <div style={{ all: "initial", display: "block", width: "100%", height: "100%" }}>
          <ResumeRenderer resume={resume} />
        </div>
      </div>
      <PreviewPanel onDownload={handleDownload} canDownload={canDownload} isExporting={isExporting} exportStatus={exportStatus} />
    </>
  );

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
      <div className="flex flex-col h-screen bg-[#0a0a0a] text-[#f1efe8] overflow-hidden">
        {/* Top Toolbar */}
        <BuilderToolbar
          onDownload={handleDownload}
          canDownload={canDownload}
          isEditingExistingResume={isEditingExistingResume}
          isExporting={isExporting}
          exportStatus={exportStatus}
        />

        {/* Export Status Bar */}
        {isExporting && (
          <div className="sticky top-0 z-55 bg-linear-to-r from-[#c8f55a]/16 to-[#c8f55a]/5 border-b border-[#c8f55a]/18 text-[#e7f7b2] px-4 py-2.5 text-xs font-bold font-['Outfit']">
            <div className="flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-[#e7f7b2]/30 border-t-[#e7f7b2] animate-spin" />
              <span>{exportStatus ?? "Preparing export..."}</span>
            </div>
          </div>
        )}

        {/* Export Error Toast */}
        {exportError && (
          <div className={`fixed top-20 ${isMobile ? "left-3 right-3" : "right-5"} bg-red-900 text-red-200 px-4 py-3 rounded-lg text-xs font-semibold font-['Outfit'] z-101 border border-red-800 shadow-lg`}>
            {exportError}
          </div>
        )}

        {/* Save Error Toast */}
        {ui.saveError && (
          <div className={`fixed top-20 ${isMobile ? "left-3 right-3" : "right-5"} bg-red-900 text-red-200 px-4 py-3 rounded-lg text-xs font-semibold font-['Outfit'] z-100 border border-red-800 shadow-lg`}>
            ⚠ {ui.saveError}
          </div>
        )}

        {/* Main Workspace */}
        <BuilderWorkspaceChrome
          activeTabContent={activeTabContent}
          onDownload={handleDownload}
          canDownload={canDownload}
          isExporting={isExporting}
          exportStatus={exportStatus}
          previewContent={previewContent}
        />
      </div>
    </>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  Gauge,
  LayoutGrid,
  Languages,
  Menu,
  Palette,
  PencilLine,
  Sparkles,
  Briefcase,
  Award,
  FolderGit,
  Wrench,
  X,
} from "lucide-react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import type { ActiveSection, EditorTab, ResumeDocument } from "@/types/resume-types";

type AiToolId = "summary" | "bullets" | "ats" | "grammar" | "keywords" | "skills" | "achievement";

interface Props {
  activeTabContent: React.ReactNode;
  onDownload: () => void;
  canDownload: boolean;
  isExporting?: boolean;
  exportStatus?: string | null;
  previewContent: React.ReactNode;
}

const NAV_TABS: Array<{ id: EditorTab; label: string; description: string; icon: React.ReactNode }> = [
  { id: "content", label: "Content", description: "Write resume sections", icon: <LayoutGrid size={16} /> },
  { id: "style", label: "Style", description: "Fonts and colors", icon: <Palette size={16} /> },
  { id: "sections", label: "Sections", description: "Reorder blocks", icon: <Sparkles size={16} /> },
  { id: "ai", label: "AI", description: "Rewrite and polish", icon: <Bot size={16} /> },
  { id: "ats", label: "ATS", description: "Score and keywords", icon: <Gauge size={16} /> },
];

const SECTION_NAV: Array<{
  id: ActiveSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "personal", label: "Personal", icon: <PencilLine size={15} /> },
  { id: "experience", label: "Experience", icon: <Briefcase size={15} /> },
  { id: "education", label: "Education", icon: <GraduationCap size={15} /> },
  { id: "skills", label: "Skills", icon: <Wrench size={15} /> },
  { id: "projects", label: "Projects", icon: <FolderGit size={15} /> },
  { id: "certifications", label: "Certs", icon: <Award size={15} /> },
  { id: "languages", label: "Languages", icon: <Languages size={15} /> },
];

const AI_TOOL_META: Record<AiToolId, { label: string; helper: string; tab: EditorTab }> = {
  summary: { label: "Improve summary", helper: "Polish the headline block", tab: "ai" },
  bullets: { label: "Rewrite bullets", helper: "Sharpen impact statements", tab: "ai" },
  ats: { label: "ATS suggestions", helper: "Surface missing keywords", tab: "ats" },
  grammar: { label: "Grammar fixes", helper: "Correct tone and flow", tab: "ai" },
  keywords: { label: "Keyword ideas", helper: "Match the job description", tab: "ats" },
  skills: { label: "Skill recommendations", helper: "Tune the skills section", tab: "ai" },
  achievement: { label: "Achievement boost", helper: "Turn duties into wins", tab: "ai" },
};

const countFilled = (value: string) => value.trim().length > 0;

const getChecklist = (resume: ResumeDocument) => {
  const p = resume.personalInfo;
  const s = resume.sections;

  return [
    { label: "Professional summary", passed: p.summary.trim().length >= 50 },
    { label: "Contact details", passed: Boolean(p.name.trim() && p.email.trim() && (p.phone.trim() || p.linkedin.trim())) },
    { label: "Experience added", passed: s.experience.length > 0 },
    { label: "Impact in bullets", passed: s.experience.some((entry) => entry.bullets.some((bullet) => /\d/.test(bullet)) || /\d/.test(entry.description)) },
    { label: "Skills grouped", passed: s.skills.some((group) => group.category.trim() || group.items.some((item) => item.trim())) },
    { label: "Education added", passed: s.education.length > 0 },
    { label: "Projects or certs", passed: s.projects.length > 0 || s.certifications.length > 0 },
    { label: "Languages optional", passed: s.languages.length >= 0 },
  ];
};

const getToolTarget = (resume: ResumeDocument, tool: AiToolId) => {
  const lastExperience = [...resume.sections.experience].slice(-1)[0];
  const lastProject = [...resume.sections.projects].slice(-1)[0];

  switch (tool) {
    case "summary":
      return {
        tab: "ai" as const,
        section: "personal" as const,
        focusedField: { section: "personal" as const, kind: "personal" as const, field: "summary", label: "Professional Summary" },
      };
    case "bullets":
    case "achievement":
      return lastExperience
        ? {
            tab: "ai" as const,
            section: "experience" as const,
            focusedField: {
              section: "experience" as const,
              kind: "experience" as const,
              entityId: lastExperience.id,
              field: lastExperience.contentMode === "paragraph" ? "description" : "bullet",
              index: lastExperience.contentMode === "paragraph" ? undefined : Math.max(0, lastExperience.bullets.length - 1),
              label: lastExperience.contentMode === "paragraph" ? "Experience Summary" : "Experience Bullet",
            },
          }
        : {
            tab: "ai" as const,
            section: "experience" as const,
            focusedField: null,
          };
    case "grammar":
      return {
        tab: "ai" as const,
        section: "personal" as const,
        focusedField: { section: "personal" as const, kind: "personal" as const, field: "summary", label: "Professional Summary" },
      };
    case "skills":
      return {
        tab: "ai" as const,
        section: "skills" as const,
        focusedField: null,
      };
    case "ats":
    case "keywords":
      return {
        tab: "ats" as const,
        section: "personal" as const,
        focusedField: null,
      };
  }

  return lastProject
    ? {
        tab: "ai" as const,
        section: "projects" as const,
        focusedField: {
          section: "projects" as const,
          kind: "projects" as const,
          entityId: lastProject.id,
          field: lastProject.contentMode === "paragraph" ? "description" : "bullet",
          index: lastProject.contentMode === "paragraph" ? undefined : Math.max(0, lastProject.bullets.length - 1),
          label: lastProject.contentMode === "paragraph" ? "Project Description" : "Project Bullet",
        },
      }
    : { tab: "ai" as const, section: "projects" as const, focusedField: null };
};

export function BuilderWorkspaceChrome({ activeTabContent, onDownload, canDownload, isExporting = false, exportStatus = null, previewContent }: Props) {
  const { resume, ui, saveResume, setActiveTab, setActiveSection, setFocusedField } = useResumeBuilderStore();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const checklist = useMemo(() => getChecklist(resume), [resume]);
  const completed = checklist.filter((item) => item.passed).length;
  const progress = Math.round((completed / checklist.length) * 100);
  const progressLabel = progress >= 90 ? "Launch ready" : progress >= 70 ? "Nearly there" : progress >= 40 ? "In progress" : "Just started";

  const personalFieldsFilled = [
    resume.personalInfo.name,
    resume.personalInfo.title,
    resume.personalInfo.email,
    resume.personalInfo.phone,
    resume.personalInfo.location,
    resume.personalInfo.linkedin,
    resume.personalInfo.summary,
  ].filter(countFilled).length;

  const activeTool = (tool: AiToolId) => {
    const target = getToolTarget(resume, tool);
    setActiveTab(target.tab);
    setActiveSection(target.section);
    setFocusedField(target.focusedField as any);
    if (isMobile) setDrawerOpen(false);
  };

  const handleTabChange = (tab: EditorTab) => {
    setActiveTab(tab);
    if (isMobile) setDrawerOpen(false);
  };

  const handleSectionChange = (section: ActiveSection) => {
    setActiveSection(section);
    setActiveTab("content");
    if (isMobile) setDrawerOpen(false);
  };

  const sidebarBody = (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0b0b] text-[#e9e7df]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-3 lg:px-3 lg:py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-linear-to-br from-[#c8f55a]/30 to-transparent text-[#c8f55a]">
            <Sparkles size={16} />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-snug text-white">Studio</div>
              <div className="text-[9px] text-white/35">Resume</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          className="hidden rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/50 transition hover:border-[#c8f55a]/40 hover:bg-white/8 hover:text-[#c8f55a] lg:inline-flex"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-2 py-3 lg:px-3">
        {/* Progress Card */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(200,245,90,0.1),rgba(255,255,255,0.01)_50%)] p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Progress</div>
              <div className="mt-2 text-xl font-bold tracking-tight text-white">{progress}%</div>
              <div className="text-[10px] text-white/40">{progressLabel}</div>
            </div>
            {!sidebarCollapsed && (
              <div className="relative h-14 w-14 shrink-0">
                <div className="absolute inset-0 rounded-full bg-[conic-gradient(#c8f55a_0%_var(--progress),rgba(255,255,255,0.05)_var(--progress)_100%)]" style={{ ["--progress" as string]: `${progress}%` }} />
                <div className="absolute inset-1 rounded-full bg-[#0b0b0b]" />
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[#c8f55a]">{completed}/{checklist.length}</div>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-white/6 bg-white/3 px-2.5 py-2">
                  <div className="text-white/40 text-[9px] font-semibold">Fields</div>
                  <div className="mt-1 font-bold text-white text-sm">{personalFieldsFilled}/7</div>
                </div>
                <div className="rounded-lg border border-white/6 bg-white/3 px-2.5 py-2">
                  <div className="text-white/40 text-[9px] font-semibold">State</div>
                  <div className="mt-1 font-bold text-white text-sm">{ui.isSaved ? "Synced" : ui.isSaving ? "Saving" : ui.isDirty ? "Unsaved" : "Idle"}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void saveResume()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#c8f55a] px-2.5 py-1.5 text-[10px] font-bold text-[#0a0a0a] transition hover:bg-[#d7fa74] active:scale-95"
                >
                  <CheckCircle2 size={12} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={!canDownload || isExporting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/70 transition hover:border-[#c8f55a]/40 hover:bg-white/8 hover:text-[#c8f55a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={12} />
                  {isExporting ? "Exporting" : "Download"}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange("sections")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/70 transition hover:border-[#c8f55a]/40 hover:bg-white/8 hover:text-[#c8f55a]"
                >
                  <LayoutGrid size={12} />
                  Reorder
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Shortcuts */}
        {!sidebarCollapsed && (
          <div className="mb-4 rounded-2xl border border-white/8 bg-white/2 p-3">
            <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
              <Bot size={11} /> AI Tools
            </div>
            <div className="space-y-1.5">
              {(Object.keys(AI_TOOL_META) as AiToolId[]).map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => activeTool(tool)}
                  className="flex w-full items-start gap-2 rounded-lg border border-white/6 bg-[#121212] px-2.5 py-2 text-left text-[11px] transition hover:border-[#c8f55a]/30 hover:bg-[#141414]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white/90">{AI_TOOL_META[tool].label}</div>
                    <div className="mt-0.5 text-[9px] leading-tight text-white/40">{AI_TOOL_META[tool].helper}</div>
                  </div>
                  <ArrowRight size={11} className="mt-0.5 shrink-0 text-white/25" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Tabs */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-white/2 p-3">
          <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
            <LayoutGrid size={11} /> {sidebarCollapsed ? "Tabs" : "Workflow"}
          </div>
          <div className="space-y-1">
            {NAV_TABS.map((tab) => {
              const active = ui.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs transition lg:justify-start ${active ? "border-[#c8f55a]/30 bg-[#c8f55a]/12 text-[#c8f55a]" : "border-white/6 bg-[#121212] text-white/60 hover:border-white/12 hover:bg-[#141414]"}`}
                  title={sidebarCollapsed ? tab.label : undefined}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/6 bg-black/40 shrink-0">{tab.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-xs font-semibold">{tab.label}</span>
                      <span className="block text-[9px] text-white/35">{tab.description}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sections Nav */}
        <div className="mb-4 rounded-2xl border border-white/8 bg-white/2 p-3">
          <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
            <Briefcase size={11} /> {sidebarCollapsed ? "Sec" : "Sections"}
          </div>
          <div className="space-y-1">
            {SECTION_NAV.map((section) => {
              const active = ui.activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionChange(section.id)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs transition lg:justify-start ${active ? "border-[#c8f55a]/30 bg-[#c8f55a]/12 text-[#c8f55a]" : "border-white/6 bg-[#121212] text-white/60 hover:border-white/12 hover:bg-[#141414]"}`}
                  title={sidebarCollapsed ? section.label : undefined}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/6 bg-black/40 shrink-0">{section.icon}</span>
                  {!sidebarCollapsed && <span className="text-xs font-semibold">{section.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Checklist */}
        {!sidebarCollapsed && (
          <div className="rounded-2xl border border-white/8 bg-white/1 p-3">
            <div className="mb-2.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/35">
              <span>Status</span>
              <span className="text-[#c8f55a]">{ui.isSaving ? "Saving" : ui.isSaved ? "Synced" : ui.isDirty ? "Unsaved" : "Idle"}</span>
            </div>
            <div className="space-y-1.5">
              {checklist.slice(0, 4).map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/1 px-2.5 py-1.5 text-[10px]">
                  <span className={`shrink-0 text-xs ${item.passed ? "text-[#4ade80]" : "text-white/20"}`}>{item.passed ? "●" : "○"}</span>
                  <span className="text-white/60">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0a0a0a] text-[#f1efe8]">
      {isMobile && !drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="fixed left-3 top-3 z-50 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#111111]/95 px-3 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur transition hover:border-[#c8f55a]/40"
          aria-label="Open sidebar"
        >
          <Menu size={16} />
          <span className="hidden xs:inline">Menu</span>
        </button>
      )}

      {!isMobile && (
        <motion.aside
          animate={{ width: sidebarCollapsed ? 80 : 340 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative hidden min-h-0 shrink-0 border-r border-white/5 bg-[#090909] lg:flex"
        >
          {sidebarBody}
        </motion.aside>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 lg:gap-4 lg:p-4">
        {/* Editor & Preview Grid */}
        <div className="grid min-h-0 flex-1 gap-3 lg:gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          {/* Editor Panel */}
          <div className="min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#0f0f0f] shadow-lg">
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3 lg:px-5 lg:py-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">Editor</div>
                <div className="mt-1 text-sm font-bold text-white">{NAV_TABS.find((tab) => tab.id === ui.activeTab)?.label ?? "Content"}</div>
              </div>
              <div className="text-[10px] text-white/40 truncate max-w-xs">{resume.title}</div>
            </div>
            <div className="min-h-0 overflow-hidden">{activeTabContent}</div>
          </div>

          {/* Preview Panel */}
          <div className="hidden min-h-0 overflow-hidden rounded-[24px] border border-white/8 bg-[#0f0f0f] shadow-lg lg:flex lg:flex-col">
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3 lg:px-5 lg:py-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/35">Live Preview</div>
                <div className="mt-1 text-sm font-bold text-white">PDF-ready Canvas</div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                <CheckCircle2 size={12} className="text-[#4ade80]" />
                <span className="truncate">{ui.isSaved ? "Synced" : "Pending"}</span>
              </div>
            </div>
            <div className="min-h-0 overflow-hidden">{previewContent}</div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay + Sidebar */}
      <AnimatePresence>
        {isMobile && drawerOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              aria-label="Close sidebar"
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[min(85vw,320px)] border-r border-white/8 bg-[#090909] shadow-2xl flex flex-col"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-white/6 px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-linear-to-br from-[#c8f55a]/30 to-transparent text-[#c8f55a]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Studio</div>
                    <div className="text-[9px] text-white/35">Resume</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/50 transition hover:bg-white/8"
                  aria-label="Close sidebar"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{sidebarBody}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
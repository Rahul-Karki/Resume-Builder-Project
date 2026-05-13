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
    const update = () => setIsMobile(window.innerWidth < 1280);
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

      {/* 1. Far Left Sidebar (Slim Nav) */}
      {!isMobile && (
        <aside className="relative z-20 flex w-16 min-h-0 shrink-0 flex-col items-center border-r border-white/5 bg-[#0a0a0a] py-6">
          <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-[#c8f55a]/20 to-transparent text-[#c8f55a]">
            <Sparkles size={18} />
          </div>
          <div className="flex flex-col gap-4">
            {SECTION_NAV.map((section) => {
              const active = ui.activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  title={section.label}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-[1.05] active:scale-95 ${
                    active
                      ? "border-[#c8f55a]/40 bg-[#c8f55a]/15 text-[#c8f55a] shadow-[0_0_15px_rgba(200,245,90,0.1)]"
                      : "border-transparent bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  {section.icon}
                </button>
              );
            })}
          </div>
          
          <div className="mt-auto flex flex-col gap-4">
            {NAV_TABS.filter(t => t.id !== "content" && t.id !== "sections").map(tab => {
              const active = ui.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={tab.label}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-[1.05] active:scale-95 ${
                    active
                      ? "border-[#c8f55a]/40 bg-[#c8f55a]/15 text-[#c8f55a] shadow-[0_0_15px_rgba(200,245,90,0.1)]"
                      : "border-transparent bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  {tab.icon}
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* 2. Middle Left Sidebar (Editor) */}
      {!isMobile && (
        <aside className="relative z-10 flex w-[380px] min-h-0 shrink-0 flex-col border-r border-white/5 bg-[#0e0e0e]/95 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {ui.activeTab === "content" ? SECTION_NAV.find((s) => s.id === ui.activeSection)?.label || "Editor" : NAV_TABS.find(t => t.id === ui.activeTab)?.label}
              </h2>
              <p className="mt-1 text-[11px] text-white/40">
                {ui.activeTab === "content" ? "Detail your professional journey" : "Customize your resume"}
              </p>
            </div>
            {ui.activeTab === "content" && (
              <button 
                onClick={() => handleTabChange("sections")}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <LayoutGrid size={12} />
                Reorder
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {activeTabContent}
          </div>
        </aside>
      )}

      {/* 3. Center (Preview) */}
      <main className="flex min-w-0 flex-1 flex-col items-center bg-[radial-gradient(ellipse_at_top,#141414_0%,#0a0a0a_80%)] overflow-hidden lg:p-6">
        <div className="flex w-full items-center justify-between mb-4 px-4 lg:px-0">
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"><Bot size={14}/></button>
          </div>
        </div>
        <div className="w-full flex-1 overflow-hidden rounded-[20px] border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          {previewContent}
        </div>
      </main>

      {/* 4. Right Sidebar (Insights) */}
      {!isMobile && (
        <aside className="relative z-10 flex w-[340px] min-h-0 shrink-0 flex-col border-l border-white/5 bg-[#0e0e0e]/95 backdrop-blur-xl">
          <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {/* Resume Strength */}
            <h3 className="mb-4 text-sm font-bold text-white/90 tracking-wide">Resume Strength</h3>
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs leading-relaxed text-white/60">
                  Your resume is stronger than <strong className="text-white">{progress}%</strong> of applicants for {resume.personalInfo.title || "your role"}.
                </div>
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(#c8f55a_0%_var(--progress),rgba(255,255,255,0.05)_var(--progress)_100%)]" style={{ ["--progress" as string]: `${progress}%` }} />
                  <div className="absolute inset-[3px] rounded-full bg-[#111]" />
                  <div className="relative text-[11px] font-bold text-[#c8f55a]">{progress}%</div>
                </div>
              </div>
            </div>

            {/* Actionable Tips */}
            <h3 className="mb-4 mt-8 text-[11px] font-bold uppercase tracking-widest text-white/40">Actionable Tips</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(AI_TOOL_META).slice(0, 3).map(([key, tool], idx) => {
                const colors = ["text-blue-400", "text-purple-400", "text-orange-400"];
                const icons = [<CheckCircle2 size={14}/>, <Sparkles size={14}/>, <Award size={14}/>];
                return (
                  <div key={key} className="flex items-start gap-3 rounded-xl border border-white/5 bg-[#141414] p-3 transition hover:border-white/10 hover:bg-[#1a1a1a]">
                    <div className={`mt-0.5 shrink-0 ${colors[idx]}`}>
                      {icons[idx]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white/90">{tool.label}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-white/50">{tool.helper}. Improve your content formatting and layout to stand out.</div>
                      <button onClick={() => activeTool(key as AiToolId)} className="mt-2 text-[10px] font-bold text-[#c8f55a] hover:underline">Apply Suggestion</button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 rounded-2xl border border-[#c8f55a]/10 bg-gradient-to-br from-[#c8f55a]/10 to-transparent p-4 relative overflow-hidden">
               <div className="relative z-10">
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#c8f55a]">Template Insights</h3>
                 <div className="mt-2 text-sm font-bold text-white">Pro Template</div>
                 <div className="mt-1 text-[11px] text-white/60">Upgrade to unlock ATS-optimized formats.</div>
               </div>
            </div>
          </div>

          <div className="border-t border-white/5 p-5 bg-[#0a0a0a]">
            <button
              onClick={() => void saveResume()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#c8f55a] py-3 text-[13px] font-bold text-[#0a0a0a] shadow-[0_0_15px_rgba(200,245,90,0.2)] transition hover:scale-[1.02] hover:bg-[#d7fa74] hover:shadow-[0_0_25px_rgba(200,245,90,0.4)] active:scale-95"
            >
              <Sparkles size={14} /> Finalize & Optimize
            </button>
            <div className="mt-3 flex gap-2">
               <button
                  type="button"
                  onClick={onDownload}
                  disabled={!canDownload || isExporting}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
               >
                  <Download size={12} /> {isExporting ? "Exporting..." : "Download PDF"}
               </button>
            </div>
          </div>
        </aside>
      )}

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
              className="fixed inset-y-0 left-0 z-50 w-[min(85vw,360px)] border-r border-white/8 bg-[#090909] shadow-2xl flex flex-col"
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-white/6 px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-[#c8f55a]/30 to-transparent text-[#c8f55a]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Studio</div>
                    <div className="text-[10px] text-white/35">Resume</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/50 transition hover:bg-white/8"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{activeTabContent}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
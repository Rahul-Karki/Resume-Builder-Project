import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, GripVertical, Sparkles, Wand2, Scissors, Target, Bot, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useResumeBuilderStore } from '@/store/useResumeBuilderStore';
import type { FocusedEditorField, ResumeDocument, SectionVisibility, WorkEntry } from '@/types/resume-types';
import { api, improveResumeText, getLatestAtsAnalysis } from '@/services/api';
import { templates as localTemplateCatalog } from '@/data/templateMeta';
import { normalizeResumeTemplateId } from '@/utils/resumeTemplate';
import printResume from '@/utils/print';
import { EditorPanel } from '@/components/builder/editorPanel';
import { StylePanel } from '@/components/builder/stylePanel';
import { AIAssistantPanel } from '@/components/builder/AIAssistantPanel';
import { ATSAnalysisPanel } from '@/components/builder/ATSAnalysisPanel';
import { Logo } from '@/components/Logo';
import { PaginatedResumePreview } from '@/components/builder/PaginatedResumePreview';
import { A4_WIDTH_PX } from '@/utils/resumePagination';

type LeftTab = 'content' | 'style' | 'sections';
type AssistantTab = 'tips' | 'ai' | 'ats';

type FocusTarget = {
  label: string;
  text: string;
  applySuggestion: (value: string) => void;
};

type ContextActionKind = 'improve' | 'rewrite' | 'shorten' | 'ats';



type TemplateOption = {
  layoutId: string;
  name: string;
  audience?: 'tech' | 'non-tech';
  sortOrder?: number;
};

const getEntryDescription = (entry: WorkEntry): string => {
  if (entry.description.trim()) return entry.description;
  return entry.bullets.find((bullet) => bullet.trim()) || '';
};

function SectionsTab(): React.ReactElement {
  const { resume, toggleSectionVisibility, reorderSections } = useResumeBuilderStore();
  const [dragging, setDragging] = useState<number | null>(null);

  const labels: Record<string, string> = {
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certifications: 'Certifications',
    languages: 'Languages',
  };

  return (
    <div className="p-5 space-y-2">
      {resume.sectionOrder.map((sectionKey, idx) => {
        const visible = resume.sectionVisibility[sectionKey as keyof SectionVisibility];
        return (
          <div
            key={sectionKey}
            draggable
            onDragStart={() => setDragging(idx)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragging !== null && dragging !== idx) reorderSections(dragging, idx);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-3"
          >
            <GripVertical size={16} className="text-zinc-500" />
            <div className="flex-1 text-sm text-zinc-100 font-medium">{labels[sectionKey] ?? sectionKey}</div>
            <button
              onClick={() => toggleSectionVisibility(sectionKey as keyof SectionVisibility)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-700/80 text-zinc-300 hover:text-white transition-colors"
            >
              {visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const ResumeStudioWorkExperienceEditor: React.FC = () => {
  const {
    resume,
    ui,
    loadResume,
    initFromTemplate,
    applyTemplateUpgrade,
    saveResume,
    updatePersonalInfo,
    updateBullet,
    updateExperience,
    updateProject,
    updateProjectBullet,
    updateSkillGroup,
  } = useResumeBuilderStore();

  const location = useLocation();

  const [leftTab, setLeftTab] = useState<LeftTab>('content');
  const [assistantTab, setAssistantTab] = useState<AssistantTab>('tips');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>('classic');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [userZoom, setUserZoom] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<ContextActionKind | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<any | null>(null);

  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get('resume');
    const templateId = params.get('template') ?? 'classic';
    const preloadedResume = (location.state as { preloadedResume?: ResumeDocument } | null)?.preloadedResume;

    if (resumeId) {
      void loadResume(resumeId, preloadedResume);
      return;
    }

    void initFromTemplate(templateId);
  }, [initFromTemplate, loadResume, location.state]);

  useEffect(() => {
    setTemplateId(normalizeResumeTemplateId(resume.templateId));
  }, [resume.templateId]);

  useEffect(() => {
    let active = true;

    const loadTemplates = async () => {
      try {
        const response = await api.get('/templates');
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const apiTemplates: TemplateOption[] = rows
          .map((row: unknown) => {
            const data = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {};
            return {
              layoutId: String(data.layoutId ?? ''),
              name: String(data.name ?? data.layoutId ?? 'Template'),
              audience: data.audience === 'tech' ? 'tech' : 'non-tech',
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
            };
          })
          .filter((template: TemplateOption) => template.layoutId);

        const mergedById = new Map<string, TemplateOption>();
        apiTemplates.forEach((template) => mergedById.set(template.layoutId, template));

        localTemplateCatalog.forEach((template) => {
          if (!mergedById.has(template.id)) {
            mergedById.set(template.id, {
              layoutId: template.id,
              name: template.name,
              audience: template.audience,
              sortOrder: 999,
            });
          }
        });

        if (!active) return;
        setTemplateOptions(Array.from(mergedById.values()).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
      } catch {
        if (!active) return;
        setTemplateOptions(
          localTemplateCatalog.map((template) => ({
            layoutId: template.id,
            name: template.name,
            audience: template.audience,
            sortOrder: 999,
          })),
        );
      }
    };

    void loadTemplates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (userZoom !== null) return;
    const computeScale = () => {
      const host = previewHostRef.current;
      if (!host) return;

      const maxW = host.clientWidth - 12;
      if (maxW <= 0) return;

      const fitScale = Math.min(maxW / A4_WIDTH_PX, 1.15);
      setPreviewScale(Math.max(0.28, fitScale));
    };

    computeScale();

    const host = previewHostRef.current;
    const observer = host ? new ResizeObserver(computeScale) : null;
    if (host && observer) observer.observe(host);

    window.addEventListener('resize', computeScale);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', computeScale);
    };
  }, [assistantOpen, mobileEditorOpen, isMobile, userZoom]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await api.get('/auth/me');
        const user = response.data?.user;
        if (!user || cancelled) return;

        const nextName = String(user.name ?? '').trim();
        const nextEmail = String(user.email ?? '').trim();

        if (!resume.personalInfo.name?.trim() && nextName) updatePersonalInfo('name', nextName);
        if (!resume.personalInfo.email?.trim() && nextEmail) updatePersonalInfo('email', nextEmail);
      } catch {
        // keep page usable without auth prefill
      }

      // load latest ATS analysis for this resume (if saved)
      try {
        if (resume?._id) {
          const res = await getLatestAtsAnalysis(resume._id);
          setLatestAnalysis(res.analysis ?? null);
        }
      } catch {
        setLatestAnalysis(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [resume.personalInfo.email, resume.personalInfo.name, updatePersonalInfo]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (ui.isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ui.isDirty]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveResume();
      }
    },
    [saveResume],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resumeStrength = useMemo(() => {
    const entries = resume.sections.experience;
    const totalWords = entries.reduce((acc, curr) => acc + getEntryDescription(curr).split(/\s+/).filter(Boolean).length, 0);
    const metrics = entries.reduce((acc, curr) => acc + (getEntryDescription(curr).match(/\d+/g) || []).length, 0);

    let score = 40;
    if (totalWords > 50) score += 14;
    if (totalWords > 120) score += 14;
    score += Math.min(24, metrics * 4);
    score += Math.min(10, entries.length * 2);

    return Math.max(10, Math.min(95, Math.round(score)));
  }, [resume.sections.experience]);

  const weakVerbUsage = useMemo(() => {
    const ledCount = resume.sections.experience.reduce((acc, entry) => {
      return acc + ((getEntryDescription(entry).match(/\bled\b/gi) || []).length);
    }, 0);
    return ledCount > 1;
  }, [resume.sections.experience]);

  const focusedTarget = useMemo<FocusTarget | null>(() => {
    const focused = ui.focusedField as FocusedEditorField | null;
    if (!focused) return null;

    if (focused.kind === 'personal' && focused.field === 'summary') {
      return {
        label: 'Summary',
        text: resume.personalInfo.summary,
        applySuggestion: (value) => updatePersonalInfo('summary', value),
      };
    }

    if (focused.kind === 'experience' && focused.entityId) {
      const entry = resume.sections.experience.find((item) => item.id === focused.entityId);
      if (!entry) return null;

      if (focused.field === 'description') {
        return {
          label: 'Experience Description',
          text: entry.description,
          applySuggestion: (value) => updateExperience(entry.id, 'description', value),
        };
      }

      if (typeof focused.index === 'number') {
        const text = entry.bullets[focused.index] ?? '';
        return {
          label: 'Experience Bullet',
          text,
          applySuggestion: (value) => updateBullet(entry.id, focused.index as number, value),
        };
      }
    }

    if (focused.kind === 'projects' && focused.entityId) {
      const project = resume.sections.projects.find((item) => item.id === focused.entityId);
      if (!project) return null;

      if (focused.field === 'description') {
        return {
          label: 'Project Description',
          text: project.description,
          applySuggestion: (value) => updateProject(project.id, 'description', value),
        };
      }

      if (typeof focused.index === 'number') {
        const text = project.bullets[focused.index] ?? '';
        return {
          label: 'Project Bullet',
          text,
          applySuggestion: (value) => updateProjectBullet(project.id, focused.index as number, value),
        };
      }
    }

    if (focused.kind === 'skills' && focused.entityId) {
      const skillGroup = resume.sections.skills.find((item) => item.id === focused.entityId);
      if (!skillGroup) return null;

      if (focused.field === 'category') {
        return {
          label: 'Skill Category',
          text: skillGroup.category,
          applySuggestion: (value) => updateSkillGroup(skillGroup.id, 'category', value),
        };
      }

      if (focused.field === 'items') {
        return {
          label: 'Skills',
          text: skillGroup.items.join(', '),
          applySuggestion: (value) => {
            const items = value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
            updateSkillGroup(skillGroup.id, 'items', items);
          },
        };
      }
    }

    return null;
  }, [resume.personalInfo.summary, resume.sections.experience, resume.sections.projects, resume.sections.skills, ui.focusedField, updateBullet, updateExperience, updatePersonalInfo, updateProject, updateProjectBullet, updateSkillGroup]);

  const runContextAction = useCallback(async (kind: ContextActionKind) => {
    // Open assistant drawer for full AI interactions
    setAssistantTab('ai');
    setAssistantOpen(true);
    setStatusMessage('AI Assistant opened for contextual action.');
  }, []);

  

  // Finalize & Optimize flow removed — ATS-driven suggestions now surfaced in Tips after analysis.

  const handleSave = async () => {
    setApiError(null);
    setStatusMessage('Saving resume...');
    try {
      await saveResume();
      setStatusMessage('Resume saved.');
    } catch {
      setStatusMessage(null);
    }
  };

  const handleDownload = async () => {
    setApiError(null);
    setIsExporting(true);
    setStatusMessage('Opening print preview...');

    try {
      // Capture the rendered resume DOM from the editor and print it
      // This ensures the print preview matches the editor display exactly
      await printResume('#resume-preview-root');
      
      setStatusMessage('Print dialog opened. Select "Save as PDF" to download with custom filename and location.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open print preview.';
      setStatusMessage(message);
      setApiError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateChange = async (value: string) => {
    const normalized = normalizeResumeTemplateId(value);
    setTemplateId(normalized);
    await applyTemplateUpgrade(normalized);
  };

  const compactInsights = [
    {
      icon: '•',
      text: `Resume strength score: ${resumeStrength}%`,
      tone: 'text-zinc-300',
    },
    {
      icon: weakVerbUsage ? '⚠' : '✓',
      text: weakVerbUsage ? 'Weak verbs detected in experience text' : 'Strong action verbs used in experience',
      tone: weakVerbUsage ? 'text-amber-300' : 'text-emerald-300',
    },
    {
      icon: '✓',
      text: 'Add measurable metrics in at least 2 bullets',
      tone: 'text-emerald-300',
    },
    {
      icon: '✓',
      text: 'Missing React/TypeScript keywords in summary',
      tone: 'text-blue-300',
    },
  ];

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  return (
    <div className="h-screen overflow-hidden bg-[#09090b] text-[#F0EFE8] font-['Outfit']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap');

        /* Hide default scrollbar when explicitly requested */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Themed thin scrollbar for editor panes and textareas */
        .themed-scrollbar::-webkit-scrollbar { width: 10px; }
        .themed-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .themed-scrollbar::-webkit-scrollbar-thumb { background: rgba(200,200,200,0.14); border-radius: 9999px; border: 3px solid rgba(0,0,0,0); background-clip: padding-box; }
        .themed-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(200,200,200,0.22); }
        .themed-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(200,200,200,0.14) transparent; }

        /* Small rounded native scrollbar for textareas specifically */
        textarea.editor-textarea { scrollbar-width: thin; }
        textarea.editor-textarea::-webkit-scrollbar { width: 8px; }
        textarea.editor-textarea::-webkit-scrollbar-thumb { background: rgba(200,200,200,0.18); border-radius: 8px; }

        /* Shift preview to the left when assistant open on desktop (space for right drawer) */
        .preview-shift { transition: transform 220ms cubic-bezier(.16,1,.3,1); }
        .preview-shift.shift-left { transform: translateX(-360px); }
        @media (max-width: 1024px) { .preview-shift.shift-left { transform: none; } }
      `}</style>

      <header className="h-12 border-b border-zinc-800/70 flex items-center justify-between px-3 md:px-4 lg:px-6 bg-[#0C0C0F]/95 backdrop-blur-sm sticky top-0 z-30 builder-header">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileEditorOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300"
            aria-label="Toggle editor"
          >
            {mobileEditorOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <Logo isCompact />
          <div className="text-xs text-zinc-400 hidden sm:block tracking-wide">Editor</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={templateId}
            onChange={(event) => void handleTemplateChange(event.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs text-zinc-100"
          >
            {templateOptions.map((templateOption) => (
              <option key={templateOption.layoutId} value={templateOption.layoutId}>
                {templateOption.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => void handleSave()}
            disabled={ui.isSaving}
            className="px-2.5 py-1 text-xs rounded-lg border border-zinc-700 bg-zinc-900 hover:border-[#C8F55A] disabled:opacity-50 transition-colors"
          >
            {ui.isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => void handleDownload()}
            disabled={isExporting}
            className="px-2.5 py-1 text-xs rounded-lg bg-[#C8F55A] text-[#0A0A0A] font-semibold disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
      </header>

      <div className="text-[11px] text-zinc-500 border-b border-zinc-800/70 px-3 md:px-4 lg:px-6 py-1.5 min-h-7 bg-[#0B0B0D] builder-status">
        {statusMessage || ui.saveError || (ui.isDirty ? 'Unsaved changes' : 'All changes saved')}
      </div>

      <div className="flex h-[calc(100vh-76px)] overflow-hidden builder-layout">
        <aside className="hidden md:flex w-105 shrink-0 border-r border-zinc-800/70 bg-[#0D0D10] flex-col overflow-hidden themed-scrollbar builder-aside">
          <div className="p-3 border-b border-zinc-800/70">
            <div className="flex gap-2 bg-transparent p-1 rounded-xl">
              {([
                ['content', 'Content'],
                ['style', 'Style'],
                ['sections', 'Sections'],
              ] as Array<[LeftTab, string]>).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors border ${leftTab === tab ? 'bg-[#08100A] text-[#C8F55A] border-zinc-700' : 'text-zinc-300 hover:bg-zinc-800 border-transparent'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div ref={editorPaneRef} className="flex-1 overflow-y-auto themed-scrollbar">
            {leftTab === 'content' && <EditorPanel />}
            {leftTab === 'style' && <StylePanel />}
            {leftTab === 'sections' && <SectionsTab />}
          </div>
        </aside>

        <main className={`flex-1 bg-[#0A0A0D] overflow-hidden ${assistantOpen && !isMobile ? 'mr-90' : ''}`}>
          <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-[#0A0A0D] border-b border-[#1A1A1D]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setUserZoom((z) => {
                  const next = Math.max(0.28, (z ?? previewScale) - 0.1);
                  return Math.round(next * 100) / 100;
                })}
                className="text-[#888] hover:text-[#e4e4e7] text-xs px-1.5 py-0.5 rounded hover:bg-[#1A1A1D] transition-colors"
                title="Zoom out"
              >−</button>
              <span className="text-[#888] text-xs font-mono tabular-nums w-10 text-center">{Math.round((userZoom ?? previewScale) * 100)}%</span>
              <button
                onClick={() => setUserZoom((z) => {
                  const next = Math.min(2, (z ?? previewScale) + 0.1);
                  return Math.round(next * 100) / 100;
                })}
                className="text-[#888] hover:text-[#e4e4e7] text-xs px-1.5 py-0.5 rounded hover:bg-[#1A1A1D] transition-colors"
                title="Zoom in"
              >+</button>
              {userZoom !== null && (
                <button
                  onClick={() => setUserZoom(null)}
                  className="text-[#888] hover:text-[#C8F55A] text-xs px-1.5 py-0.5 rounded hover:bg-[#1A1A1D] transition-colors ml-1"
                  title="Reset zoom to fit"
                >auto</button>
              )}
            </div>
          </div>
          <div ref={previewHostRef} className="h-full w-full p-1.5 md:p-2.5 flex items-start justify-center overflow-auto themed-scrollbar">
            <div
              id="resume-preview-root"
              style={{
                width: `${A4_WIDTH_PX * previewScale}px`,
              }}
            >
              <PaginatedResumePreview resume={resume} scale={previewScale} />
            </div>
          </div>
        </main>
      </div>

      <button
        onClick={() => setAssistantOpen(true)}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#C8F55A] text-[#0A0A0A] text-sm font-semibold shadow-[0_10px_32px_rgba(200,245,90,0.35)] hover:-translate-y-px transition-transform"
        aria-label="Open AI Assistant"
      >
        <Bot size={16} /> AI Assistant
      </button>

      

      {isMobile ? (
        <div className={`fixed inset-x-0 bottom-0 z-50 h-[74vh] bg-[#0C0D11] border-t border-zinc-700 rounded-t-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] flex flex-col transition-transform duration-250 ${assistantOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="p-3 border-b border-zinc-800/70 flex items-center justify-between">
            <div className="text-sm font-semibold">AI Assistant</div>
            <button onClick={() => setAssistantOpen(false)} className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center" aria-label="Close assistant"><X size={16} /></button>
          </div>
          <div className="p-3 border-b border-zinc-800/70">
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/70">
              {([
                ['tips', 'Tips'],
                ['ai', 'AI'],
                ['ats', 'ATS'],
              ] as Array<[AssistantTab, string]>).map(([tab, label]) => (
                <button key={tab} onClick={() => setAssistantTab(tab)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${assistantTab === tab ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto themed-scrollbar p-4">
            {assistantTab === 'tips' && (
              <div className="space-y-2.5">
                {latestAnalysis ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">ATS Suggestions</div>
                    {(() => {
                      const groups: Record<string, any[]> = {};
                      const suggestions = Array.isArray(latestAnalysis.rewriteSuggestions) ? latestAnalysis.rewriteSuggestions : [];
                      for (const s of suggestions) {
                        const path: string = s.path ?? 'general';
                        let key = 'general';
                        if (path.startsWith('personalInfo.summary')) key = 'summary';
                        else if (path.startsWith('sections.experience')) key = 'experience';
                        else if (path.startsWith('sections.skills')) key = 'skills';
                        else if (path.startsWith('sections.education')) key = 'education';
                        else if (path.startsWith('sections.projects')) key = 'projects';
                        else if (path.startsWith('sections.certifications')) key = 'certifications';
                        else if (path.startsWith('sections.languages')) key = 'languages';

                        groups[key] = groups[key] ?? [];
                        groups[key].push(s);
                      }

                      return Object.keys(groups).map((key) => (
                        <div key={key} className="mb-3">
                          <div className="text-sm font-semibold text-zinc-200 mb-2" style={{ textTransform: 'capitalize' }}>{key}</div>
                          {groups[key].map((g: any) => (
                            <div key={g.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5 text-sm mb-2">
                              <div className="text-zinc-100 font-medium">{g.suggestionText}</div>
                              <div className="text-zinc-400 text-xs mt-1">{g.reason}</div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  compactInsights.map((insight, idx) => (
                    <div key={idx} className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5 text-sm flex items-center gap-2">
                      <span className={insight.tone}>{insight.icon}</span>
                      <span className="text-zinc-200">{insight.text}</span>
                    </div>
                  ))
                )}
                {/* Finalize & Optimize removed — ATS suggestions will appear here after analysis */}
              </div>
            )}
            {assistantTab === 'ai' && <AIAssistantPanel />}
            {assistantTab === 'ats' && <ATSAnalysisPanel />}
          </div>
        </div>
      ) : (
        <div className={`fixed right-0 top-12 bottom-0 z-50 w-90 bg-[#0C0D11] border-l border-zinc-700/80 shadow-[-24px_0_60px_rgba(0,0,0,0.5)] flex flex-col transition-transform duration-250 ${assistantOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-3.5 border-b border-zinc-800/70 flex items-center justify-between">
            <div className="text-sm font-semibold">AI Assistant</div>
            <button onClick={() => setAssistantOpen(false)} className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center" aria-label="Close assistant"><X size={16} /></button>
          </div>
          <div className="p-3 border-b border-zinc-800/70">
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/70">
              {([
                ['tips', 'Tips'],
                ['ai', 'AI'],
                ['ats', 'ATS'],
              ] as Array<[AssistantTab, string]>).map(([tab, label]) => (
                <button key={tab} onClick={() => setAssistantTab(tab)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${assistantTab === tab ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto themed-scrollbar p-4">
            {assistantTab === 'tips' && (
              <div className="space-y-2.5">
                {latestAnalysis ? (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">ATS Suggestions</div>
                    {(() => {
                      const groups: Record<string, any[]> = {};
                      const suggestions = Array.isArray(latestAnalysis.rewriteSuggestions) ? latestAnalysis.rewriteSuggestions : [];
                      for (const s of suggestions) {
                        const path: string = s.path ?? 'general';
                        let key = 'general';
                        if (path.startsWith('personalInfo.summary')) key = 'summary';
                        else if (path.startsWith('sections.experience')) key = 'experience';
                        else if (path.startsWith('sections.skills')) key = 'skills';
                        else if (path.startsWith('sections.education')) key = 'education';
                        else if (path.startsWith('sections.projects')) key = 'projects';
                        else if (path.startsWith('sections.certifications')) key = 'certifications';
                        else if (path.startsWith('sections.languages')) key = 'languages';

                        groups[key] = groups[key] ?? [];
                        groups[key].push(s);
                      }

                      return Object.keys(groups).map((key) => (
                        <div key={key} className="mb-3">
                          <div className="text-sm font-semibold text-zinc-200 mb-2" style={{ textTransform: 'capitalize' }}>{key}</div>
                          {groups[key].map((g: any) => (
                            <div key={g.id} className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5 text-sm mb-2">
                              <div className="text-zinc-100 font-medium">{g.suggestionText}</div>
                              <div className="text-zinc-400 text-xs mt-1">{g.reason}</div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  compactInsights.map((insight, idx) => (
                    <div key={idx} className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5 text-sm flex items-center gap-2">
                      <span className={insight.tone}>{insight.icon}</span>
                      <span className="text-zinc-200">{insight.text}</span>
                    </div>
                  ))
                )}
                {/* Finalize & Optimize removed — ATS suggestions will appear here after analysis */}
              </div>
            )}
            {assistantTab === 'ai' && <AIAssistantPanel />}
            {assistantTab === 'ats' && <ATSAnalysisPanel />}
          </div>
        </div>
      )}

      {isMobile && mobileEditorOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-label="Close editor" onClick={() => setMobileEditorOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[92vw] max-w-85 bg-[#0D0D10] border-r border-zinc-700/80 shadow-[20px_0_50px_rgba(0,0,0,0.5)] flex flex-col">
            <div className="p-3 border-b border-zinc-800/70 flex items-center justify-between">
              <div className="text-sm font-semibold">Editor</div>
              <button onClick={() => setMobileEditorOpen(false)} className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-3 border-b border-zinc-800/70">
              <div className="flex gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/70">
                {([
                  ['content', 'Content'],
                  ['style', 'Style'],
                  ['sections', 'Sections'],
                ] as Array<[LeftTab, string]>).map(([tab, label]) => (
                  <button key={tab} onClick={() => setLeftTab(tab)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${leftTab === tab ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div ref={editorPaneRef} className="flex-1 overflow-y-auto themed-scrollbar">
              {leftTab === 'content' && <EditorPanel />}
              {leftTab === 'style' && <StylePanel />}
              {leftTab === 'sections' && <SectionsTab />}
            </div>
          </div>
        </div>
      )}

      {apiError && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-70 bg-red-950/95 border border-red-700 text-red-100 px-4 py-2.5 rounded-xl text-sm">
          {apiError}
        </div>
      )}
    </div>
  );
};

export default ResumeStudioWorkExperienceEditor;

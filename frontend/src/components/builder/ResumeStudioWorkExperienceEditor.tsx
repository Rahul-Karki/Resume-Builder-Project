import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, GripVertical, Bot, PanelLeftClose, PanelLeftOpen, X, Pen, Monitor, Sparkles, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useResumeBuilderStore } from '@/store/useResumeBuilderStore';
import type { FocusedEditorField, ResumeDocument, SectionVisibility, WorkEntry } from '@/types/resume-types';
import { api } from '@/services/api';
import { templates as localTemplateCatalog } from '@/data/templateMeta';
import { normalizeResumeTemplateId } from '@/utils/resumeTemplate';
import { useViewport } from '@/hooks/useViewport';
import printResume from '@/utils/print';
import { downloadPdfFromPreview } from '@/utils/pdfGenerator';
import { EditorPanel } from '@/components/builder/editorPanel';
import { StylePanel } from '@/components/builder/stylePanel';
import { AIAssistantPanel } from '@/components/builder/AIAssistantPanel';
import { ATSAnalysisPanel } from '@/components/builder/ATSAnalysisPanel';
import { Logo } from '@/components/Logo';
import { PaginatedResumePreview } from '@/components/builder/PaginatedResumePreview';
import { A4_WIDTH_PX } from '@/utils/resumePagination';

type LeftTab = 'content' | 'style' | 'sections';
type AssistantTab = 'ai' | 'ats';
type MobileView = 'editor' | 'preview' | 'ai';

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

const TAB_BAR_HEIGHT = 60;

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

function MobileTabBar({
  active,
  onChange,
  assistantOpen,
  onToggleAssistant,
}: {
  active: MobileView;
  onChange: (view: MobileView) => void;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
}) {
  const tabs: { id: MobileView; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Edit', icon: <Pen size={16} /> },
    { id: 'preview', label: 'Preview', icon: <Monitor size={16} /> },
    { id: 'ai', label: 'AI', icon: <Sparkles size={16} /> },
  ];

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: TAB_BAR_HEIGHT, zIndex: 60,
        background: '#0C0C0F', borderTop: '1px solid rgba(63,63,70,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 4px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontFamily: 'inherit',
              color: isActive ? '#C8F55A' : '#71717a',
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            {tab.id === 'ai' && assistantOpen && (
              <span style={{
                position: 'absolute', top: 4, right: 'calc(50% - 22px)',
                width: 6, height: 6, borderRadius: '50%',
                background: '#C8F55A',
              }} />
            )}
            {tab.icon}
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </button>
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
  const [assistantTab, setAssistantTab] = useState<AssistantTab>('ai');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('editor');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string>('classic');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [previewScale, setPreviewScale] = useState(1);
  const [mobilePreviewZoom, setMobilePreviewZoom] = useState(1);
  const [actionLoading, setActionLoading] = useState<ContextActionKind | null>(null);

  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const mobileMainRef = useRef<HTMLElement | null>(null);
  const touchStartX = useRef(0);
  const isMobile = useViewport(768);
  const isTablet = useViewport(1024);

  // On mobile, auto-calculate initial preview scale to fill viewport width
  const fillScale = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const sidePadding = 16;
    return Math.max(0.35, Math.min(1, (viewportWidth - sidePadding) / A4_WIDTH_PX));
  }, []);

  useEffect(() => {
    if (isMobile && fillScale < 1) {
      setMobilePreviewZoom(fillScale);
    }
  }, [isMobile, fillScale]);

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
        const rows: unknown[] = response.data?.templates ?? response.data?.data?.templates ?? [];
        const apiTemplates: TemplateOption[] = (rows
          .map((row: unknown) => {
            const data = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {};
            return {
              layoutId: String(data.layoutId ?? ''),
              name: String(data.name ?? data.layoutId ?? 'Template'),
              audience: data.audience === 'tech' ? 'tech' : 'non-tech',
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
            };
          })
          .filter((t) => t.layoutId)) as TemplateOption[];

        if (!active) return;

        const currentId = normalizeResumeTemplateId(resume.templateId);
        const hasCurrent = apiTemplates.some((t) => t.layoutId === currentId);
        let result = apiTemplates;
        if (!hasCurrent) {
          const local = localTemplateCatalog.find((t) => t.id === currentId);
          result = [
            ...apiTemplates,
            local
              ? { layoutId: local.id, name: local.name, audience: local.audience, sortOrder: -1 }
              : { layoutId: currentId, name: currentId, sortOrder: -1 },
          ];
        }
        setTemplateOptions(result.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999)));
      } catch {
        if (!active) return;
        const currentId = normalizeResumeTemplateId(resume.templateId);
        const local = localTemplateCatalog.find((t) => t.id === currentId);
        setTemplateOptions([
          local
            ? { layoutId: local.id, name: local.name, audience: local.audience, sortOrder: -1 }
            : { layoutId: currentId, name: currentId, sortOrder: -1 },
        ]);
      }
    };

    void loadTemplates();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const currentId = normalizeResumeTemplateId(resume.templateId);
    setTemplateOptions((prev) => {
      if (prev.some((t) => t.layoutId === currentId)) return prev;
      const local = localTemplateCatalog.find((t) => t.id === currentId);
      return [
        local
          ? { layoutId: local.id, name: local.name, audience: local.audience, sortOrder: -1 }
          : { layoutId: currentId, name: currentId, sortOrder: -1 },
        ...prev,
      ];
    });
  }, [resume.templateId]);

  useEffect(() => {
    const computeScale = () => {
      const host = previewHostRef.current;
      if (!host) return;

      const maxW = host.clientWidth;
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
  }, [isMobile]);

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
    setAssistantTab('ai');
    setAssistantOpen(true);
    setMobileView('ai');
    setStatusMessage('AI Assistant opened for contextual action.');
  }, []);

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

    if (isMobile) {
      setStatusMessage('Generating PDF for download...');
      try {
        await downloadPdfFromPreview('#resume-preview-root');
        setStatusMessage('PDF downloaded successfully.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate PDF.';
        setStatusMessage(message);
        setApiError(message);
        // Fall back to print dialog
        try {
          setStatusMessage('Trying print preview as fallback...');
          await printResume('#resume-preview-root');
          setStatusMessage('Print dialog opened.');
        } catch {
          // give up
        }
      }
    } else {
      setStatusMessage('Opening print preview...');
      try {
        await printResume('#resume-preview-root');
        setStatusMessage('Print dialog opened. Select "Save as PDF" to download with custom filename and location.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open print preview.';
        setStatusMessage(message);
        setApiError(message);
      }
    }

    setIsExporting(false);
  };

  const handleTemplateChange = async (value: string) => {
    const normalized = normalizeResumeTemplateId(value);
    setTemplateId(normalized);
    await applyTemplateUpgrade(normalized);
  };

  const handleMobileViewChange = useCallback((view: MobileView) => {
    if (view === 'ai') {
      setAssistantOpen(true);
    } else {
      setAssistantOpen(false);
    }
    setMobileView(view);
  }, []);

  const handleAssistantToggle = useCallback(() => {
    setAssistantOpen((prev) => !prev);
    if (!assistantOpen) {
      setMobileView('ai');
    }
  }, [assistantOpen]);

  const handleZoomIn = () => {
    setMobilePreviewZoom((z) => Math.min(z + 0.15, 1.5));
  };

  const handleZoomOut = () => {
    setMobilePreviewZoom((z) => Math.max(z - 0.15, 0.4));
  };

  const handleZoomReset = () => {
    setMobilePreviewZoom(1);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (Math.abs(deltaX) <= threshold) return;
    const views: MobileView[] = ['editor', 'preview', 'ai'];
    const currentIndex = views.indexOf(mobileView);
    if (deltaX < 0 && currentIndex < views.length - 1) {
      handleMobileViewChange(views[currentIndex + 1]);
    } else if (deltaX > 0 && currentIndex > 0) {
      handleMobileViewChange(views[currentIndex - 1]);
    }
  }, [mobileView, handleMobileViewChange]);

  const renderEditorSidebar = () => (
    <>
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
    </>
  );

  const renderPreview = (scale: number) => (
    <div
      ref={previewHostRef}
      style={{
        height: '100%', width: '100%',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflow: 'auto',
      }}
      className="themed-scrollbar"
    >
      <div
        id="resume-preview-root"
        style={{ width: `${A4_WIDTH_PX * scale}px`, margin: '0 auto' }}
      >
        <PaginatedResumePreview resume={resume} scale={scale} />
      </div>
    </div>
  );

  const renderMobilePreviewZoomControls = () => (
    <div style={{
      position: 'absolute', bottom: TAB_BAR_HEIGHT + 12, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, alignItems: 'center',
      background: 'rgba(12,12,15,0.92)', border: '1px solid rgba(63,63,70,0.6)',
      borderRadius: 12, padding: '6px 10px',
      zIndex: 10, backdropFilter: 'blur(8px)',
    }}>
      <button onClick={handleZoomOut} style={zoomBtnStyle}><ZoomOut size={14} /></button>
      <button onClick={handleZoomReset} style={{ ...zoomBtnStyle, fontSize: 10, fontWeight: 700, color: '#d4d4d8', minWidth: 40 }}>
        {Math.round(mobilePreviewZoom * 100)}%
      </button>
      <button onClick={handleZoomIn} style={zoomBtnStyle}><ZoomIn size={14} /></button>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#09090b] text-[#F0EFE8] font-['Outfit']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap');

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .themed-scrollbar::-webkit-scrollbar { width: 10px; }
        .themed-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .themed-scrollbar::-webkit-scrollbar-thumb { background: rgba(200,200,200,0.14); border-radius: 9999px; border: 3px solid rgba(0,0,0,0); background-clip: padding-box; }
        .themed-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(200,200,200,0.22); }
        .themed-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(200,200,200,0.14) transparent; }

        textarea.editor-textarea { scrollbar-width: thin; }
        textarea.editor-textarea::-webkit-scrollbar { width: 8px; }
        textarea.editor-textarea::-webkit-scrollbar-thumb { background: rgba(200,200,200,0.18); border-radius: 8px; }

        .preview-shift { transition: transform 220ms cubic-bezier(.16,1,.3,1); }
        .preview-shift.shift-left { transform: translateX(-360px); }
        @media (max-width: 1024px) { .preview-shift.shift-left { transform: none; } }

        .panel-slide-enter { animation: panelSlideIn 0.25s cubic-bezier(.16,1,.3,1); }
        @keyframes panelSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

      `}</style>

      {/* ── Header ── */}
      <header className="h-12 border-b border-zinc-800/70 flex items-center justify-between px-3 md:px-4 lg:px-6 bg-[#0C0C0F]/95 backdrop-blur-sm sticky top-0 z-30 builder-header">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (isMobile) { setMobileView('editor'); return; }
            }}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300"
            aria-label="Toggle editor"
          >
            {mobileView === 'editor' ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <Logo isCompact />
          <div className="text-xs text-zinc-400 hidden sm:block tracking-wide">Editor</div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={templateId}
            onChange={(event) => void handleTemplateChange(event.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs text-zinc-100 max-w-[120px] sm:max-w-none"
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

      {/* ── Status Bar ── */}
      <div className="text-[11px] text-zinc-500 border-b border-zinc-800/70 px-3 md:px-4 lg:px-6 py-1.5 min-h-7 bg-[#0B0B0D] builder-status">
        {statusMessage || ui.saveError || (ui.isDirty ? 'Unsaved changes' : 'All changes saved')}
      </div>

      {/* ── Main Content ── */}
      <div className="flex h-[calc(100vh-76px)] overflow-hidden builder-layout relative">

        {/* ── Desktop / Tablet: Sidebar Editor ── */}
        {!isMobile && (
          <aside
            className={`shrink-0 border-r border-zinc-800/70 bg-[#0D0D10] flex-col overflow-hidden themed-scrollbar builder-aside ${isTablet ? 'w-[380px]' : 'w-[420px]'} hidden md:flex`}
          >
            {renderEditorSidebar()}
          </aside>
        )}

        {/* ── Desktop / Tablet: Preview ── */}
        {!isMobile && (
          <main className="flex-1 min-w-0 bg-[#0A0A0D] overflow-hidden">
            <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-[#0A0A0D] border-b border-[#1A1A1D]" />
            {renderPreview(previewScale)}
          </main>
        )}

        {/* ── Mobile: Panel Content ── */}
        {isMobile && (
          <main ref={mobileMainRef} className="flex-1 min-w-0 bg-[#0A0A0D] overflow-hidden relative"
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {/* Editor Panel */}
            <div
              style={{
                position: 'absolute', inset: 0,
                visibility: mobileView === 'editor' ? 'visible' : 'hidden',
                transform: mobileView === 'editor' ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.25s cubic-bezier(.16,1,.3,1), visibility 0.25s',
                display: 'flex', flexDirection: 'column',
                background: '#0D0D10', zIndex: 2, overflow: 'hidden',
              }}
            >
              <div className="p-3 border-b border-zinc-800/70 flex items-center gap-2">
                {([
                  ['content', 'Content'],
                  ['style', 'Style'],
                  ['sections', 'Sections'],
                ] as Array<[LeftTab, string]>).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors border ${leftTab === tab ? 'bg-[#08100A] text-[#C8F55A] border-zinc-700' : 'text-zinc-300 hover:bg-zinc-800 border-transparent'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div ref={editorPaneRef} className="flex-1 overflow-y-auto themed-scrollbar">
                {leftTab === 'content' && <EditorPanel />}
                {leftTab === 'style' && <StylePanel />}
                {leftTab === 'sections' && <SectionsTab />}
              </div>
            </div>

            {/* Preview Panel */}
            <div
              style={{
                position: 'absolute', inset: 0,
                visibility: mobileView === 'preview' ? 'visible' : 'hidden',
                transform: mobileView === 'preview' ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.25s cubic-bezier(.16,1,.3,1), visibility 0.25s',
                background: '#0A0A0D', zIndex: 2, overflow: 'hidden',
              }}
            >
              {renderPreview(isMobile ? previewScale : previewScale * mobilePreviewZoom)}
            </div>

            {/* AI Panel (mobile fullscreen) */}
            <div
              style={{
                position: 'absolute', inset: 0,
                visibility: mobileView === 'ai' && assistantOpen ? 'visible' : 'hidden',
                transform: mobileView === 'ai' && assistantOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.25s cubic-bezier(.16,1,.3,1), visibility 0.25s',
                background: '#0C0D11', zIndex: 3, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div className="p-3 border-b border-zinc-800/70 flex items-center justify-between">
                <div className="text-sm font-semibold">AI Assistant</div>
                <button
                  onClick={() => { setAssistantOpen(false); setMobileView('preview'); }}
                  className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center"
                  aria-label="Close assistant"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-3 border-b border-zinc-800/70">
                <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/70">
                  {([
                    ['ai', 'AI'],
                    ['ats', 'ATS'],
                  ] as Array<[AssistantTab, string]>).map(([tab, label]) => (
                    <button
                      key={tab}
                      onClick={() => setAssistantTab(tab)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${assistantTab === tab ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-300'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto themed-scrollbar p-4" style={{ paddingBottom: TAB_BAR_HEIGHT + 16 }}>
                {assistantTab === 'ai' && <AIAssistantPanel />}
                {assistantTab === 'ats' && <ATSAnalysisPanel />}
              </div>
            </div>
          </main>
        )}

        {/* ── AI Assistant Panel (Tablet / Desktop) ── */}
        {!isMobile && assistantOpen && (
          <aside
            className={`${isTablet ? 'fixed inset-x-0 bottom-0 z-50 h-[60vh] bg-[#0C0D11] border-t border-zinc-700 rounded-t-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)]' : 'w-90 border-l border-zinc-700/80 bg-[#0C0D11]'} flex flex-col`}
          >
            {isTablet ? (
              <>
                <div className="p-3 border-b border-zinc-800/70 flex items-center justify-between flex-shrink-0">
                  <div className="text-sm font-semibold">AI Assistant</div>
                  <button onClick={() => setAssistantOpen(false)} className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center" aria-label="Close assistant"><X size={16} /></button>
                </div>
                <div className="p-3 border-b border-zinc-800/70 flex-shrink-0">
                  <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/70">
                    {([
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
                  {assistantTab === 'ai' && <AIAssistantPanel />}
                  {assistantTab === 'ats' && <ATSAnalysisPanel />}
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 border-b border-zinc-800/70 flex items-center justify-between flex-shrink-0">
                  <div className="text-sm font-semibold">AI Assistant</div>
                  <button onClick={() => setAssistantOpen(false)} className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center" aria-label="Close assistant"><X size={16} /></button>
                </div>
                <div className="p-3 border-b border-zinc-800/70 flex-shrink-0">
                  <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/70">
                    {([
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
                  {assistantTab === 'ai' && <AIAssistantPanel />}
                  {assistantTab === 'ats' && <ATSAnalysisPanel />}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* ── Mobile: Bottom Tab Bar ── */}
      {isMobile && (
        <MobileTabBar
          active={mobileView}
          onChange={handleMobileViewChange}
          assistantOpen={assistantOpen}
          onToggleAssistant={handleAssistantToggle}
        />
      )}

      {/* ── Desktop AI Assistant FAB ── */}
      {!isMobile && !assistantOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#C8F55A] text-[#0A0A0A] text-sm font-semibold shadow-[0_10px_32px_rgba(200,245,90,0.35)] hover:-translate-y-px transition-transform"
          aria-label="Open AI Assistant"
        >
          <Bot size={16} /> AI Assistant
        </button>
      )}

      {/* ── AI Assistant bottom sheet (mobile, when triggered from preview) ── */}
      {isMobile && assistantOpen && mobileView !== 'ai' && (
        <div className={`fixed inset-x-0 bottom-0 z-50 h-[60vh] bg-[#0C0D11] border-t border-zinc-700 rounded-t-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] flex flex-col transition-transform duration-250 ${assistantOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ bottom: TAB_BAR_HEIGHT }}
        >
          <div className="p-3 border-b border-zinc-800/70 flex items-center justify-between flex-shrink-0">
            <div className="text-sm font-semibold">AI Assistant</div>
            <button onClick={() => setAssistantOpen(false)} className="h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 inline-flex items-center justify-center" aria-label="Close assistant"><X size={16} /></button>
          </div>
          <div className="p-3 border-b border-zinc-800/70 flex-shrink-0">
            <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800/70">
              {([
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
            {assistantTab === 'ai' && <AIAssistantPanel />}
            {assistantTab === 'ats' && <ATSAnalysisPanel />}
          </div>
        </div>
      )}

      {/* ── Error Toast ── */}
      {apiError && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-70 bg-red-950/95 border border-red-700 text-red-100 px-4 py-2.5 rounded-xl text-sm">
          {apiError}
        </div>
      )}
    </div>
  );
};

const zoomBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30,
  borderRadius: 8, border: '1px solid rgba(63,63,70,0.6)',
  background: 'transparent', color: '#a1a1aa',
  cursor: 'pointer', fontFamily: 'inherit',
};

export default ResumeStudioWorkExperienceEditor;

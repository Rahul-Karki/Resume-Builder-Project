import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useResumeBuilderStore } from '@/store/useResumeBuilderStore';
import type { ResumeDocument, SectionVisibility, WorkEntry } from '@/types/resume-types';
import { api, enhanceResumeBullet, getResumeDownloadJobStatus, improveResumeText, queueResumeDownload } from '@/services/api';
import { StylePanel } from '@/components/builder/stylePanel';
import { AIAssistantPanel } from '@/components/builder/AIAssistantPanel';
import { ATSAnalysisPanel } from '@/components/builder/ATSAnalysisPanel';

type LeftTab = 'content' | 'style' | 'sections';
type RightTab = 'tips' | 'ai' | 'ats';

const RESUME_DOWNLOAD_POLL_INTERVAL_MS = 5000;
const RESUME_DOWNLOAD_MAX_POLLS = 60;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const normalizeDownloadUrl = (downloadUrl: string) => {
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;

  if (downloadUrl.startsWith('/api/')) {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const backendBase = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${backendBase}${downloadUrl}`;
  }

  return downloadUrl;
};

const openPdfInNewTab = (downloadUrl: string) => {
  window.open(normalizeDownloadUrl(downloadUrl), '_blank');
};

const waitForResumeDownload = async (jobId: string, onStatus?: (status: string) => void) => {
  for (let attempt = 1; attempt <= RESUME_DOWNLOAD_MAX_POLLS; attempt += 1) {
    const status = await getResumeDownloadJobStatus(jobId);

    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error(status.lastError || 'Resume download failed');

    onStatus?.(`Generating PDF... (${attempt}/${RESUME_DOWNLOAD_MAX_POLLS})`);
    await sleep(RESUME_DOWNLOAD_POLL_INTERVAL_MS);
  }

  throw new Error('Resume download is taking longer than expected. Please try again later.');
};

const downloadResume = async (resume: ResumeDocument, resumeId?: string, onStatus?: (status: string) => void) => {
  onStatus?.('Queuing PDF export...');

  const queueResponse = await queueResumeDownload(
    resumeId
      ? { resumeId, preset: 'standard' }
      : { resume, preset: 'standard' },
  );

  const initialDownloadUrl = queueResponse.resultUrl || queueResponse.downloadUrl;

  if (queueResponse.status === 'failed') {
    throw new Error(queueResponse.message || 'Resume download failed');
  }

  if (queueResponse.status === 'completed' && initialDownloadUrl) {
    onStatus?.('Opening PDF...');
    openPdfInNewTab(initialDownloadUrl);
    return;
  }

  onStatus?.('Generating PDF...');
  const completedJob = await waitForResumeDownload(queueResponse.jobId, onStatus);
  const downloadUrl = completedJob.resultUrl || initialDownloadUrl;

  if (!downloadUrl) throw new Error('Resume download finished without a download URL.');

  onStatus?.('Opening PDF...');
  openPdfInNewTab(downloadUrl);
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
    <div className="p-4 space-y-2">
      {resume.sectionOrder.map((sectionKey, idx) => {
        const visible = resume.sectionVisibility[sectionKey as keyof SectionVisibility];
        return (
          <div
            key={sectionKey}
            draggable
            onDragStart={() => setDragging(idx)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragging !== null && dragging !== idx) {
                reorderSections(dragging, idx);
              }
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3"
          >
            <GripVertical size={16} className="text-zinc-500" />
            <div className="flex-1 text-sm text-zinc-100 font-medium">{labels[sectionKey] ?? sectionKey}</div>
            <button
              onClick={() => toggleSectionVisibility(sectionKey as keyof SectionVisibility)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white"
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
    addExperience,
    updateExperience,
    removeExperience,
    reorderExperience,
    updatePersonalInfo,
  } = useResumeBuilderStore();

  const location = useLocation();

  const [leftTab, setLeftTab] = useState<LeftTab>('content');
  const [rightTab, setRightTab] = useState<RightTab>('tips');
  const [zoom, setZoom] = useState(1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [isAiLoadingById, setIsAiLoadingById] = useState<Record<string, boolean>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationReport, setOptimizationReport] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [template, setTemplate] = useState<'modern' | 'classic'>('modern');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 1024);
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
    setTemplate(resume.templateId === 'classic' ? 'classic' : 'modern');
  }, [resume.templateId]);

  useEffect(() => {
    setExpandedById((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const entry of resume.sections.experience) {
        if (!(entry.id in next)) {
          next[entry.id] = true;
          changed = true;
        }
      }

      for (const id of Object.keys(next)) {
        if (!resume.sections.experience.some((entry) => entry.id === id)) {
          delete next[id];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [resume.sections.experience]);

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

  const setEntryDescription = (id: string, value: string) => {
    updateExperience(id, 'description', value);
    updateExperience(id, 'contentMode', 'paragraph');
    updateExperience(id, 'bullets', [value]);
  };

  const handleEnhanceDescription = async (entry: WorkEntry) => {
    const text = getEntryDescription(entry).trim();
    if (!text) {
      setApiError('Please add a description first before AI enhancement.');
      return;
    }

    setApiError(null);
    setIsAiLoadingById((prev) => ({ ...prev, [entry.id]: true }));

    try {
      const aiResult = await enhanceResumeBullet({
        text,
        section: 'experience',
        tone: 'professional',
      });

      const improved = aiResult.variations.find((variation) => variation.trim().length > 0)
        || aiResult.suggestions[0]?.suggestionText
        || text;

      setEntryDescription(entry.id, improved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enhance description.';
      setApiError(message);
    } finally {
      setIsAiLoadingById((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleFinalizeAndOptimize = async () => {
    const descriptions = resume.sections.experience.map((entry) => getEntryDescription(entry).trim()).filter(Boolean);
    if (descriptions.length === 0) {
      setApiError('Add at least one work experience description before optimization.');
      return;
    }

    setApiError(null);
    setIsOptimizing(true);

    try {
      const aiResult = await improveResumeText({
        text: descriptions.join('\n'),
        section: 'experience',
        tone: 'leadership-focused',
      });

      const reportLines = [
        'Optimization Report',
        '',
        aiResult.summary || 'No summary returned.',
        '',
        ...(aiResult.suggestions.length
          ? [
              'Top Suggestions:',
              ...aiResult.suggestions.slice(0, 5).map((suggestion, idx) => `${idx + 1}. ${suggestion.reason} -> ${suggestion.suggestionText}`),
              '',
            ]
          : []),
      ];

      setOptimizationReport(reportLines.join('\n'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate optimization report.';
      setApiError(message);
    } finally {
      setIsOptimizing(false);
    }
  };

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
    try {
      await downloadResume(resume, resume.id, setStatusMessage);
      setStatusMessage('PDF opened in a new tab.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export PDF.';
      setApiError(message);
      setStatusMessage(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTemplateChange = async (value: 'modern' | 'classic') => {
    setTemplate(value);
    await applyTemplateUpgrade(value === 'classic' ? 'classic' : 'modern');
  };

  const handleDragOver = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorderExperience(draggedIndex, targetIndex);
    setDraggedIndex(targetIndex);
  };

  const templateStyles = template === 'modern'
    ? {
        name: 'font-serif text-4xl font-bold text-zinc-900',
        role: 'text-[#84cc16] text-lg font-medium',
        section: 'text-xs uppercase tracking-widest text-zinc-700 font-bold mb-3 border-b border-[#84cc16] pb-2',
        bullet: 'list-disc list-inside text-zinc-700 text-sm leading-relaxed',
      }
    : {
        name: 'font-serif text-3xl font-semibold text-zinc-900',
        role: 'text-zinc-700 text-base font-semibold',
        section: 'text-sm text-zinc-800 font-semibold mb-3 border-b border-zinc-300 pb-2',
        bullet: 'list-none text-zinc-700 text-sm leading-relaxed pl-4 border-l-2 border-zinc-300',
      };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F0EFE8] font-['Outfit']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap');
      `}</style>

      <div className="h-14 border-b border-[#1E1E1E] flex items-center justify-between px-3 lg:px-6 bg-[#0F0F0F]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#d4fa6e] text-[#0A0A0A] flex items-center justify-center font-bold">R</div>
          <div className="text-xs text-zinc-400 hidden sm:block">Resume Builder</div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden md:flex items-center bg-[#171717] rounded-lg p-1 border border-[#27272a]">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="h-7 w-7 rounded text-zinc-300 hover:bg-zinc-800">-</button>
            <span className="text-xs text-zinc-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))} className="h-7 w-7 rounded text-zinc-300 hover:bg-zinc-800">+</button>
          </div>

          <select
            value={template}
            onChange={(event) => void handleTemplateChange(event.target.value as 'modern' | 'classic')}
            className="bg-[#171717] border border-[#27272a] rounded-lg px-2 lg:px-3 py-1.5 text-xs lg:text-sm text-zinc-100"
          >
            <option value="modern">Template: Modern Executive</option>
            <option value="classic">Template: Classic Professional</option>
          </select>

          <button
            onClick={() => void handleSave()}
            disabled={ui.isSaving}
            className="px-2.5 lg:px-3 py-1.5 text-xs rounded-lg border border-[#27272a] bg-[#171717] hover:border-[#d4fa6e] disabled:opacity-50"
          >
            {ui.isSaving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => void handleDownload()}
            disabled={isExporting || (!resume.id && !ui.isSaved)}
            className="px-2.5 lg:px-3 py-1.5 text-xs rounded-lg bg-[#d4fa6e] text-[#0A0A0A] font-semibold disabled:opacity-50"
          >
            {isExporting ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="text-xs text-zinc-500 border-b border-[#1E1E1E] px-3 lg:px-6 py-2 min-h-8 bg-[#0B0B0B]">
        {statusMessage || ui.saveError || (ui.isDirty ? 'Unsaved changes' : 'All changes saved')}
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-88px)]">
        <aside className="w-full lg:w-90 shrink-0 border-r border-[#1E1E1E] bg-[#0D0D0D]">
          <div className="border-b border-[#1E1E1E] p-3">
            <div className="flex gap-1 bg-[#171717] p-1 rounded-xl border border-[#27272a]">
              {([
                ['content', 'Content'],
                ['style', 'Style'],
                ['sections', 'Sections'],
              ] as Array<[LeftTab, string]>).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${leftTab === tab ? 'bg-[#d4fa6e] text-[#0A0A0A]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {leftTab === 'content' && (
            <div className="p-4 space-y-4 max-h-[70vh] lg:max-h-[calc(100vh-160px)] overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold text-zinc-100 mb-1">Work Experience</h2>
                <p className="text-xs text-zinc-500">Detail your professional journey. Focus on achievements and measurable outcomes.</p>
              </div>

              {resume.sections.experience.map((entry, index) => {
                const isExpanded = expandedById[entry.id] ?? true;
                const isEnhancing = isAiLoadingById[entry.id] ?? false;
                const description = getEntryDescription(entry);

                return (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(event) => handleDragOver(event, index)}
                    onDragEnd={() => setDraggedIndex(null)}
                    className="rounded-xl border border-zinc-800 bg-[#141414] overflow-hidden"
                  >
                    <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setExpandedById((prev) => ({ ...prev, [entry.id]: !isExpanded }))}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-500">≡</span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-zinc-100 truncate">{entry.role || 'New Position'}</div>
                          <div className="text-xs text-zinc-500 truncate">{entry.company || 'Company'} • {entry.start || 'Start'} - {entry.current ? 'Present' : entry.end || 'End'}</div>
                        </div>
                      </div>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          removeExperience(entry.id);
                        }}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>

                    <div className={`${isExpanded ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-300`}>
                      <div className="px-3 pb-3 space-y-2.5">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Job Title</label>
                          <input
                            value={entry.role}
                            onChange={(event) => updateExperience(entry.id, 'role', event.target.value)}
                            className="w-full rounded-lg bg-[#0F0F0F] border border-zinc-800 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Company</label>
                          <input
                            value={entry.company}
                            onChange={(event) => updateExperience(entry.id, 'company', event.target.value)}
                            className="w-full rounded-lg bg-[#0F0F0F] border border-zinc-800 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Start</label>
                            <input
                              type="month"
                              value={entry.start}
                              onChange={(event) => updateExperience(entry.id, 'start', event.target.value)}
                              className="w-full rounded-lg bg-[#0F0F0F] border border-zinc-800 px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">End</label>
                            <input
                              value={entry.current ? 'Present' : entry.end}
                              onChange={(event) => updateExperience(entry.id, 'end', event.target.value)}
                              className="w-full rounded-lg bg-[#0F0F0F] border border-zinc-800 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Description</label>
                          <textarea
                            rows={4}
                            value={description}
                            onChange={(event) => setEntryDescription(entry.id, event.target.value)}
                            className="w-full rounded-lg bg-[#0F0F0F] border border-zinc-800 px-3 py-2 text-sm resize-none"
                          />
                        </div>
                        <button
                          onClick={() => void handleEnhanceDescription(entry)}
                          disabled={isEnhancing}
                          className="w-full rounded-lg py-2 text-sm font-medium border border-[#d4fa6e]/30 text-[#d4fa6e] bg-[#d4fa6e]/5 hover:bg-[#d4fa6e]/10 disabled:opacity-50"
                        >
                          {isEnhancing ? 'Enhancing...' : '⚡ AI Enhance Description'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addExperience}
                className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-zinc-400 hover:text-zinc-100 hover:border-[#d4fa6e]"
              >
                + Add Work Experience
              </button>
            </div>
          )}

          {leftTab === 'style' && (
            <div className="max-h-[70vh] lg:max-h-[calc(100vh-160px)] overflow-y-auto">
              <StylePanel />
            </div>
          )}

          {leftTab === 'sections' && (
            <div className="max-h-[70vh] lg:max-h-[calc(100vh-160px)] overflow-y-auto">
              <SectionsTab />
            </div>
          )}
        </aside>

        <main className="flex-1 bg-[#0A0A0A] border-t lg:border-t-0 border-[#1E1E1E]">
          <div className="h-full overflow-auto p-4 lg:p-8 flex items-start justify-center">
            <div className="bg-white shadow-[0_20px_80px_rgba(0,0,0,0.65)] relative transition-transform duration-300 rounded-sm" style={{ width: isMobile ? '100%' : '210mm', minHeight: '297mm', transform: isMobile ? 'none' : `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%' }}>
              <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none opacity-[0.04]">
                <span className="text-5xl lg:text-6xl font-['Playfair_Display'] text-zinc-900">Draft Preview</span>
              </div>

              <div className="p-6 lg:p-12">
                <div className="mb-7">
                  <h1 className={templateStyles.name}>{resume.personalInfo.name || 'Your Name'}</h1>
                  <p className={templateStyles.role}>{resume.personalInfo.title || 'Software Engineer'}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-zinc-500">
                    <span>{resume.personalInfo.email || 'email@example.com'}</span>
                    <span>•</span>
                    <span>{resume.personalInfo.phone || '(555) 123-4567'}</span>
                    <span>•</span>
                    <span>{resume.personalInfo.location || 'City, Country'}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className={templateStyles.section}>Work Experience</h2>
                  <div className="space-y-5">
                    {resume.sections.experience.map((entry) => (
                      <div key={entry.id}>
                        <div className="flex justify-between items-baseline mb-1 gap-4">
                          <h3 className="font-bold text-zinc-900">{entry.company || 'Company Name'}</h3>
                          <span className="text-sm text-zinc-500">{entry.start || 'Start'} - {entry.current ? 'Present' : entry.end || 'End'}</span>
                        </div>
                        <p className="text-zinc-700 italic mb-2">{entry.role || 'Role'}</p>
                        <ul className={templateStyles.bullet}>
                          <li>{getEntryDescription(entry) || 'Describe your impact...'}</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className={templateStyles.section}>Education</h2>
                  {resume.sections.education.length > 0 ? (
                    resume.sections.education.map((entry) => (
                      <div key={entry.id} className="mb-3 last:mb-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-zinc-900">{entry.institution || 'Institution'}</h3>
                          <span className="text-sm text-zinc-500">{entry.year || 'Year'}</span>
                        </div>
                        <p className="text-zinc-700 italic">{[entry.degree, entry.field].filter(Boolean).join(' in ') || 'Degree'}</p>
                      </div>
                    ))
                  ) : (
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-zinc-900">University of Technology</h3>
                        <span className="text-sm text-zinc-500">2014 - 2018</span>
                      </div>
                      <p className="text-zinc-700 italic">Bachelor of Science in Computer Science</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="w-full lg:w-[320px] shrink-0 border-l border-[#1E1E1E] bg-[#0D0D0D]">
          <div className="border-b border-[#1E1E1E] p-3">
            <div className="flex gap-1 bg-[#171717] p-1 rounded-xl border border-[#27272a]">
              {([
                ['tips', 'Tips'],
                ['ai', 'AI'],
                ['ats', 'ATS'],
              ] as Array<[RightTab, string]>).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${rightTab === tab ? 'bg-[#d4fa6e] text-[#0A0A0A]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 max-h-[70vh] lg:max-h-[calc(100vh-160px)] overflow-y-auto">
            {rightTab === 'tips' && (
              <>
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#141414] mb-4">
                  <h3 className="text-sm font-bold mb-3">Resume Strength</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#d4fa6e" strokeWidth="3" strokeDasharray={`${resumeStrength}, 100`} className="transition-all duration-700" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">{resumeStrength}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{resumeStrength > 75 ? 'Strong' : 'Moderate'}</div>
                      <div className="text-xs text-zinc-500">Stronger than 78% of applicants</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-emerald-900/40 bg-emerald-900/10">
                    <div className="text-sm font-medium">✅ Quantify your impact</div>
                    <div className="text-xs text-zinc-400 mt-1">Great job including measurable outcomes.</div>
                  </div>
                  <div className="p-3 rounded-lg border border-blue-900/40 bg-blue-900/10">
                    <div className="text-sm font-medium">🔵 Add relevant skills</div>
                    <div className="text-xs text-zinc-400 mt-1">Consider adding React, Node.js, and TypeScript.</div>
                    <button className="text-xs text-[#d4fa6e] mt-2">Apply Suggested Skills</button>
                  </div>
                  <div className={`p-3 rounded-lg border ${weakVerbUsage ? 'border-yellow-900/40 bg-yellow-900/10' : 'border-zinc-800 bg-[#141414]'}`}>
                    <div className="text-sm font-medium">⚠️ Weak Verb Usage</div>
                    <div className="text-xs text-zinc-400 mt-1">Repeated "Led" detected. Try "Orchestrated" or "Directed".</div>
                  </div>
                </div>

                <button
                  onClick={() => void handleFinalizeAndOptimize()}
                  disabled={isOptimizing}
                  className="w-full mt-4 py-2.5 rounded-xl bg-[#d4fa6e] text-[#0A0A0A] font-semibold disabled:opacity-50"
                >
                  {isOptimizing ? 'Optimizing...' : '✏️ Finalize & Optimize'}
                </button>
              </>
            )}

            {rightTab === 'ai' && <AIAssistantPanel />}
            {rightTab === 'ats' && <ATSAnalysisPanel />}
          </div>
        </aside>
      </div>

      {optimizationReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-[#27272a] rounded-2xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Optimization Report</h3>
              <button onClick={() => setOptimizationReport(null)} className="text-zinc-500 hover:text-zinc-100">✕</button>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-4 border border-[#27272a] mb-5">
              <pre className="text-sm text-zinc-100 whitespace-pre-wrap font-['Outfit'] leading-relaxed">{optimizationReport}</pre>
            </div>
            <button onClick={() => setOptimizationReport(null)} className="w-full py-2.5 rounded-xl bg-[#d4fa6e] text-[#0A0A0A] font-semibold">Got it</button>
          </div>
        </div>
      )}

      {apiError && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-red-950/95 border border-red-700 text-red-100 px-4 py-2.5 rounded-xl text-sm">
          {apiError}
        </div>
      )}
    </div>
  );
};

export default ResumeStudioWorkExperienceEditor;

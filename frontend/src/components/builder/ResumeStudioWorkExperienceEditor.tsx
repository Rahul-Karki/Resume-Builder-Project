import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { useResumeBuilderStore } from '@/store/useResumeBuilderStore';
import type { ResumeDocument, SectionVisibility, WorkEntry } from '@/types/resume-types';
import { api, getResumeDownloadJobStatus, improveResumeText, queueResumeDownload } from '@/services/api';
import { ResumeRenderer } from '@/templates/ResumeRenderer';
import { EditorPanel } from '@/components/builder/editorPanel';
import { StylePanel } from '@/components/builder/stylePanel';
import { AIAssistantPanel } from '@/components/builder/AIAssistantPanel';
import { ATSAnalysisPanel } from '@/components/builder/ATSAnalysisPanel';

type LeftTab = 'content' | 'style' | 'sections';
type RightTab = 'tips' | 'ai' | 'ats';

const RESUME_DOWNLOAD_POLL_INTERVAL_MS = 5000;
const RESUME_DOWNLOAD_MAX_POLLS = 60;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

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
    updatePersonalInfo,
  } = useResumeBuilderStore();

  const location = useLocation();

  const [leftTab, setLeftTab] = useState<LeftTab>('content');
  const [rightTab, setRightTab] = useState<RightTab>('tips');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationReport, setOptimizationReport] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [template, setTemplate] = useState<'modern' | 'classic'>('modern');
  const [isMobile, setIsMobile] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewHostRef = useRef<HTMLDivElement | null>(null);

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
    const computeScale = () => {
      const host = previewHostRef.current;
      if (!host) return;

      const maxW = host.clientWidth - 24;
      const maxH = host.clientHeight - 24;
      if (maxW <= 0 || maxH <= 0) return;

      const fitScale = Math.min(maxW / A4_WIDTH_PX, maxH / A4_HEIGHT_PX, 1);
      setPreviewScale(Math.max(0.3, fitScale));
    };

    computeScale();

    const host = previewHostRef.current;
    const observer = host ? new ResizeObserver(() => computeScale()) : null;
    if (host && observer) observer.observe(host);

    window.addEventListener('resize', computeScale);

    return () => {
      window.removeEventListener('resize', computeScale);
      if (observer) observer.disconnect();
    };
  }, [isMobile, leftTab, rightTab]);

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

  return (
    <div className="h-screen overflow-hidden bg-[#080808] text-[#F0EFE8] font-['Outfit']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap');
      `}</style>

      <div className="h-14 border-b border-[#1E1E1E] flex items-center justify-between px-3 lg:px-6 bg-[#0F0F0F]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#d4fa6e] text-[#0A0A0A] flex items-center justify-center font-bold">R</div>
          <div className="text-xs text-zinc-400 hidden sm:block">Resume Builder</div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
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

      <div className="flex flex-col lg:flex-row h-[calc(100vh-88px)] overflow-hidden">
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
            <div className="max-h-[70vh] lg:max-h-[calc(100vh-160px)] overflow-y-auto">
              <EditorPanel />
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

        <main className="flex-1 bg-[#0A0A0A] border-t lg:border-t-0 border-[#1E1E1E] overflow-hidden">
          <div ref={previewHostRef} className="h-full overflow-hidden p-3 lg:p-6 flex items-center justify-center">
            <div
              className="bg-white shadow-[0_20px_80px_rgba(0,0,0,0.65)] relative rounded-sm transition-transform duration-200"
              style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: 'center center',
              }}
            >
              <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                <ResumeRenderer resume={resume} />
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

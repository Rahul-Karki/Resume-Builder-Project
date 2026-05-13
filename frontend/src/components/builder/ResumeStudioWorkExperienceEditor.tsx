import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useResumeBuilderStore } from '@/store/useResumeBuilderStore';
import type { ResumeDocument, WorkEntry } from '@/types/resume-types';
import {
  api,
  enhanceResumeBullet,
  improveResumeText,
  queueResumeDownload,
  getResumeDownloadJobStatus,
} from '@/services/api';

const RESUME_DOWNLOAD_POLL_INTERVAL_MS = 5000;
const RESUME_DOWNLOAD_MAX_POLLS = 60;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getEntryDescription = (entry: WorkEntry): string => {
  if (entry.description.trim()) return entry.description;
  return entry.bullets.find((bullet) => bullet.trim()) || '';
};

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
  const url = normalizeDownloadUrl(downloadUrl);
  window.open(url, '_blank');
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

const downloadResume = async (
  resume: ResumeDocument,
  resumeId?: string,
  onStatus?: (status: string) => void,
) => {
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

  if (!downloadUrl) {
    throw new Error('Resume download finished without a download URL.');
  }

  onStatus?.('Opening PDF...');
  openPdfInNewTab(downloadUrl);
};

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

  const [template, setTemplate] = useState<'modern' | 'classic'>('modern');
  const [zoom, setZoom] = useState(1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [isAiLoadingById, setIsAiLoadingById] = useState<Record<string, boolean>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationReport, setOptimizationReport] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
    const currentTemplate = resume.templateId;
    if (currentTemplate === 'classic') {
      setTemplate('classic');
    } else {
      setTemplate('modern');
    }
  }, [resume.templateId]);

  useEffect(() => {
    setExpandedById((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const exp of resume.sections.experience) {
        if (!(exp.id in next)) {
          next[exp.id] = true;
          changed = true;
        }
      }

      for (const id of Object.keys(next)) {
        if (!resume.sections.experience.some((exp) => exp.id === id)) {
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

        if (!resume.personalInfo.name?.trim() && nextName) {
          updatePersonalInfo('name', nextName);
        }
        if (!resume.personalInfo.email?.trim() && nextEmail) {
          updatePersonalInfo('email', nextEmail);
        }
      } catch {
        // Keep UI functional even if prefill fails.
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

  const resumeStrength = useCallback(() => {
    const entries = resume.sections.experience;
    const totalWords = entries.reduce((acc, curr) => acc + getEntryDescription(curr).split(/\s+/).filter(Boolean).length, 0);
    const metrics = entries.reduce((acc, curr) => acc + (getEntryDescription(curr).match(/\d+/g) || []).length, 0);

    let score = 40;
    if (totalWords > 50) score += 12;
    if (totalWords > 120) score += 12;
    score += Math.min(24, metrics * 4);
    score += Math.min(10, entries.length * 2);

    return Math.max(10, Math.min(95, Math.round(score)));
  }, [resume.sections.experience]);

  const weakVerbUsage = useCallback(() => {
    const ledCount = resume.sections.experience.reduce(
      (acc, entry) => acc + ((getEntryDescription(entry).match(/\bled\b/gi) || []).length),
      0,
    );
    return ledCount > 1;
  }, [resume.sections.experience]);

  const setExperienceDescription = (id: string, nextDescription: string) => {
    updateExperience(id, 'description', nextDescription);
    updateExperience(id, 'contentMode', 'paragraph');
    updateExperience(id, 'bullets', [nextDescription]);
  };

  const handleEnhanceDescription = async (entry: WorkEntry) => {
    const rawDescription = getEntryDescription(entry).trim();
    if (!rawDescription) {
      setApiError('Please add a description first before using AI Enhance.');
      return;
    }

    setApiError(null);
    setIsAiLoadingById((prev) => ({ ...prev, [entry.id]: true }));

    try {
      const aiResult = await enhanceResumeBullet({
        text: rawDescription,
        section: 'experience',
        tone: 'professional',
      });

      const improvedText =
        aiResult.variations.find((value) => value.trim().length > 0) ||
        aiResult.suggestions[0]?.suggestionText ||
        rawDescription;

      setExperienceDescription(entry.id, improvedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enhance description.';
      setApiError(message);
    } finally {
      setIsAiLoadingById((prev) => ({ ...prev, [entry.id]: false }));
    }
  };

  const handleFinalizeAndOptimize = async () => {
    const allDescriptions = resume.sections.experience.map((entry) => getEntryDescription(entry).trim()).filter(Boolean);

    if (allDescriptions.length === 0) {
      setApiError('Add at least one work experience description before optimization.');
      return;
    }

    setApiError(null);
    setIsOptimizing(true);

    try {
      const aiResult = await improveResumeText({
        text: allDescriptions.join('\n'),
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
              ...aiResult.suggestions.slice(0, 5).map((suggestion, index) => `${index + 1}. ${suggestion.reason} -> ${suggestion.suggestionText}`),
              '',
            ]
          : []),
        ...(aiResult.variations.length
          ? [
              'Optional Variations:',
              ...aiResult.variations.slice(0, 3).map((variation, index) => `${index + 1}. ${variation}`),
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

  const handleTemplateChange = async (nextTemplate: 'modern' | 'classic') => {
    setTemplate(nextTemplate);
    const mappedTemplateId = nextTemplate === 'classic' ? 'classic' : 'modern';
    await applyTemplateUpgrade(mappedTemplateId);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorderExperience(draggedIndex, targetIndex);
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const templateStyles =
    template === 'modern'
      ? {
          name: 'font-playfair text-4xl font-bold text-gray-900',
          role: 'text-[#e8622a] text-lg font-medium',
          section: 'text-xs uppercase tracking-widest text-gray-700 font-bold mb-3 border-b border-[#e8622a] pb-2',
          bullet: 'list-disc list-inside text-gray-700 text-sm leading-relaxed',
        }
      : {
          name: 'font-playfair text-3xl font-semibold text-gray-900',
          role: 'text-[#e8622a] text-base font-semibold',
          section: 'text-sm text-gray-800 font-semibold mb-3 border-b border-gray-300 pb-2',
          bullet: 'list-none text-gray-700 text-sm leading-relaxed pl-4 border-l-2 border-[#f0847a]',
        };

  return (
    <div className="flex h-screen w-full bg-[#1a1014] text-[#f5f0f2] font-sans overflow-hidden" style={{ minWidth: 1200 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@400;700&display=swap');
        .font-sans { font-family: 'DM Sans', sans-serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
      `}</style>

      <aside className="w-15 shrink-0 bg-[#231820] flex flex-col items-center py-4 border-r border-[#2e1f28]">
        <div className="mb-7 flex flex-col items-center">
          <div className="w-10 h-10 bg-[#e8622a] rounded-lg flex items-center justify-center shadow-[0_8px_24px_rgba(232,98,42,0.35)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7S4.99 16.2 3.5 16.2H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z" /></svg>
          </div>
          <span className="text-[10px] mt-2">ResumeStudio</span>
          <span className="text-[9px] mt-1 bg-[#f0847a] text-[#231820] px-1.5 py-0.5 rounded-full font-semibold">V3.0 Beta</span>
        </div>

        <nav className="flex flex-col gap-5 w-full items-center">
          {[
            'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z',
            'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4v2h16V6z',
            'M12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
            'M19.43 12.98c.04-.32.07-.66.07-1.02 0-3.86-3.14-7-7-7-2.75 0-5.18 1.59-6.32 4.06',
            'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58',
          ].map((path, index) => (
            <button
              key={path}
              className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                index === 1 ? 'text-[#e8622a] bg-[#2e1f28]' : 'text-[#a08090] hover:text-[#f5f0f2]'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
            </button>
          ))}
        </nav>
      </aside>

      <section className="w-95 shrink-0 bg-[#231820] border-r border-[#2e1f28] flex flex-col">
        <div className="p-6 border-b border-[#2e1f28]">
          <h2 className="text-xl font-bold mb-1">Work Experience</h2>
          <p className="text-xs text-[#a08090] leading-relaxed">
            Detail your professional journey. Focus on achievements rather than just duties.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {resume.sections.experience.map((entry, index) => {
            const entryDescription = getEntryDescription(entry);
            const isExpanded = expandedById[entry.id] ?? true;
            const isEnhancing = isAiLoadingById[entry.id] ?? false;

            return (
              <div
                key={entry.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
                className="bg-[#2e1f28] rounded-xl border border-[#3a2a33] overflow-hidden transition-all duration-300 hover:border-[#e8622a]/30"
              >
                <div
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedById((prev) => ({ ...prev, [entry.id]: !isExpanded }))}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#a08090]">≡</span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#f5f0f2]">{entry.role || 'New Position'}</h3>
                      <p className="text-xs text-[#a08090]">
                        {entry.company || 'Company Name'} • {entry.start || 'Start'} - {entry.current ? 'Present' : entry.end || 'End'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        removeExperience(entry.id);
                      }}
                      className="text-[#a08090] hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                    <span className={`text-[#a08090] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>⌄</span>
                  </div>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-4 pt-0 space-y-3">
                    <div>
                      <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Job Title</label>
                      <input
                        type="text"
                        value={entry.role}
                        onChange={(event) => updateExperience(entry.id, 'role', event.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Company</label>
                      <input
                        type="text"
                        value={entry.company}
                        onChange={(event) => updateExperience(entry.id, 'company', event.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Start Date</label>
                        <input
                          type="month"
                          value={entry.start}
                          onChange={(event) => updateExperience(entry.id, 'start', event.target.value)}
                          className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">End Date</label>
                        <input
                          type="text"
                          value={entry.current ? 'Present' : entry.end}
                          onChange={(event) => updateExperience(entry.id, 'end', event.target.value)}
                          className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                          placeholder="Present"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Description</label>
                      <textarea
                        rows={4}
                        value={entryDescription}
                        onChange={(event) => setExperienceDescription(entry.id, event.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] resize-none"
                      />
                    </div>
                    <button
                      onClick={() => void handleEnhanceDescription(entry)}
                      disabled={isEnhancing}
                      className="w-full py-2 px-4 bg-[#e8622a]/10 border border-[#e8622a]/30 text-[#e8622a] rounded-lg text-sm font-medium hover:bg-[#e8622a]/20 transition-all disabled:opacity-50"
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
            className="w-full py-3 border-2 border-dashed border-[#3a2a33] rounded-xl text-[#a08090] hover:text-[#f5f0f2] hover:border-[#e8622a]/50 transition-all text-sm font-medium"
          >
            + Add Work Experience
          </button>
        </div>
      </section>

      <section className="flex-1 bg-[#1a1014] flex flex-col min-w-0">
        <div className="h-14 border-b border-[#2e1f28] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#231820] rounded-lg p-1 border border-[#2e1f28]">
              <button onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))} className="p-1.5 text-[#a08090]">-</button>
              <span className="text-xs text-[#a08090] w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))} className="p-1.5 text-[#a08090]">+</button>
            </div>

            <button
              onClick={() => void handleSave()}
              disabled={ui.isSaving}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#2e1f28] bg-[#231820] hover:border-[#e8622a] disabled:opacity-50"
            >
              {ui.isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={() => void handleDownload()}
              disabled={isExporting || (!resume.id && !ui.isSaved)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#2e1f28] bg-[#231820] hover:border-[#e8622a] disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>

          <select
            value={template}
            onChange={(event) => void handleTemplateChange(event.target.value as 'modern' | 'classic')}
            className="bg-[#231820] border border-[#2e1f28] rounded-lg px-3 py-1.5 text-sm text-[#f5f0f2]"
          >
            <option value="modern">Template: Modern Executive</option>
            <option value="classic">Template: Classic Professional</option>
          </select>
        </div>

        <div className="px-6 py-2 text-xs text-[#a08090] border-b border-[#2e1f28] min-h-8">
          {statusMessage || ui.saveError || (ui.isDirty ? 'Unsaved changes' : 'All changes saved')}
        </div>

        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <div
            className="bg-white shadow-2xl relative transition-transform duration-300"
            style={{ width: '210mm', minHeight: '297mm', transform: `scale(${zoom})`, transformOrigin: 'top center' }}
          >
            <div className="absolute inset-0 flex items-end justify-center pb-12 pointer-events-none z-10 opacity-[0.05]">
              <span className="text-6xl font-playfair text-gray-900">Draft Preview</span>
            </div>

            <div className="p-12">
              <div className="mb-8">
                <h1 className={templateStyles.name}>{resume.personalInfo.name || 'Your Name'}</h1>
                <p className={templateStyles.role}>{resume.personalInfo.title || 'Software Engineer'}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                  <span>{resume.personalInfo.email || 'email@example.com'}</span>
                  <span>•</span>
                  <span>{resume.personalInfo.phone || '(555) 123-4567'}</span>
                  <span>•</span>
                  <span>{resume.personalInfo.location || 'City, Country'}</span>
                  <span>•</span>
                  <span>{resume.personalInfo.linkedin || 'linkedin.com/in/username'}</span>
                </div>
              </div>

              <div className="mb-8">
                <h2 className={templateStyles.section}>Work Experience</h2>
                <div className="space-y-6">
                  {resume.sections.experience.map((entry) => (
                    <div key={entry.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-gray-900">{entry.company || 'Company Name'}</h3>
                        <span className="text-sm text-gray-500">
                          {entry.start || 'Start'} - {entry.current ? 'Present' : entry.end || 'End'}
                        </span>
                      </div>
                      <p className="text-gray-700 italic mb-2">{entry.role || 'Role'}</p>
                      <ul className={templateStyles.bullet}>
                        <li>{getEntryDescription(entry) || 'Describe achievements and impact...'}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className={templateStyles.section}>Education</h2>
                <div>
                  {resume.sections.education.length > 0 ? (
                    resume.sections.education.map((entry) => (
                      <div key={entry.id} className="mb-3 last:mb-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900">{entry.institution || 'Institution'}</h3>
                          <span className="text-sm text-gray-500">{entry.year || 'Year'}</span>
                        </div>
                        <p className="text-gray-700 italic">{[entry.degree, entry.field].filter(Boolean).join(' in ') || 'Degree'}</p>
                      </div>
                    ))
                  ) : (
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-gray-900">University of Technology</h3>
                        <span className="text-sm text-gray-500">2014 - 2018</span>
                      </div>
                      <p className="text-gray-700 italic">Bachelor of Science in Computer Science</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="w-75 shrink-0 bg-[#231820] border-l border-[#2e1f28] flex flex-col">
        <div className="p-6 border-b border-[#2e1f28]">
          <h3 className="text-sm font-bold mb-4">Resume Strength</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2e1f28" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e8622a" strokeWidth="3" strokeDasharray={`${resumeStrength()}, 100`} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{resumeStrength()}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{resumeStrength() > 75 ? 'Strong' : 'Moderate'}</p>
              <p className="text-xs text-[#a08090]">Stronger than 78% of applicants</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-bold mb-4">Actionable Tips</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg border bg-green-900/20 border-green-800/30">
              <div className="flex items-start gap-2">
                <span className="text-lg">✅</span>
                <div>
                  <h4 className="text-sm font-medium">Quantify your impact</h4>
                  <p className="text-xs text-[#a08090] mt-1">Great job including metrics! Keep outcomes visible in each bullet.</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-blue-900/20 border-blue-800/30">
              <div className="flex items-start gap-2">
                <span className="text-lg">🔵</span>
                <div>
                  <h4 className="text-sm font-medium">Add relevant skills</h4>
                  <p className="text-xs text-[#a08090] mt-1">Consider adding React, Node.js, and TypeScript.</p>
                  <button className="text-xs text-[#e8622a] mt-2 font-medium">Apply Suggested Skills</button>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${weakVerbUsage() ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-[#2e1f28] border-[#3a2a33]'}`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="text-sm font-medium">Weak Verb Usage</h4>
                  <p className="text-xs text-[#a08090] mt-1">Repeated "Led" found. Consider "Orchestrated", "Directed", or "Spearheaded".</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#2e1f28] rounded-xl border border-[#3a2a33]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">Template Insights</h3>
              <span className="text-xs bg-[#e8622a] text-white px-2 py-0.5 rounded-full">Pro Template</span>
            </div>
            <div className="h-24 bg-[#1a1014] rounded-lg flex items-center justify-center border border-[#3a2a33]">
              <span className="text-xs text-[#a08090]">Template Preview</span>
            </div>
            <p className="text-xs text-[#a08090] mt-2">Modern Executive is optimized for ATS.</p>
          </div>
        </div>

        <div className="p-4 border-t border-[#2e1f28]">
          <button
            onClick={() => void handleFinalizeAndOptimize()}
            disabled={isOptimizing}
            className="w-full py-3 bg-[#e8622a] hover:bg-[#d55524] text-white rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {isOptimizing ? 'Optimizing...' : '✏️ Finalize & Optimize'}
          </button>
        </div>
      </aside>

      {optimizationReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#231820] border border-[#2e1f28] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Optimization Report</h3>
              <button onClick={() => setOptimizationReport(null)} className="text-[#a08090] hover:text-[#f5f0f2]">✕</button>
            </div>
            <div className="bg-[#1a1014] rounded-xl p-4 border border-[#2e1f28] mb-6">
              <pre className="text-sm text-[#f5f0f2] whitespace-pre-wrap font-sans leading-relaxed">{optimizationReport}</pre>
            </div>
            <button onClick={() => setOptimizationReport(null)} className="w-full py-2.5 bg-[#e8622a] text-white rounded-xl">Got it</button>
          </div>
        </div>
      )}

      {apiError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-3 rounded-xl shadow-lg z-50 border border-red-700 text-sm">
          {apiError}
        </div>
      )}
    </div>
  );
};

export default ResumeStudioWorkExperienceEditor;

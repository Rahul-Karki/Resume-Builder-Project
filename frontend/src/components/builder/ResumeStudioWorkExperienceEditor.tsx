import React, { useState, useEffect, useCallback, useRef } from 'react';

type WorkExperience = {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
  isExpanded: boolean;
};

type AnthropicResponse = {
  completion?: string;
  output?: string;
  text?: string;
};

declare global {
  interface Window {
    __ANTHROPIC_API_KEY__?: string;
  }
}

const AnthropicConfig = {
  endpoint: 'https://api.anthropic.com/v1/complete',
  model: 'claude-2.1',
  getKey: (): string | undefined => (typeof window !== 'undefined' ? window.__ANTHROPIC_API_KEY__ : undefined),
};

const defaultExperiences: WorkExperience[] = [
  {
    id: '1',
    jobTitle: 'Senior Software Engineer',
    company: 'Tech Solutions Inc.',
    startDate: '2021-01',
    endDate: 'Present',
    description:
      'Led a team of 5 engineers to build a customer portal. Managed migration to cloud infrastructure and improved performance by 30%.',
    isExpanded: true,
  },
  {
    id: '2',
    jobTitle: 'Software Engineer',
    company: 'Innovate LLC',
    startDate: '2018-06',
    endDate: '2020-12',
    description: 'Worked on building REST APIs and frontend components using React and Node.js.',
    isExpanded: false,
  },
];

async function callAnthropic(prompt: string, signal?: AbortSignal): Promise<string> {
  const key = AnthropicConfig.getKey();
  if (!key) {
    throw new Error('Anthropic API key missing. Set window.__ANTHROPIC_API_KEY__.');
  }

  const response = await fetch(AnthropicConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: AnthropicConfig.model,
      prompt,
      max_tokens: 500,
      temperature: 0.2,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  const json = (await response.json()) as AnthropicResponse;
  return (json.completion || json.output || json.text || '').trim();
}

const ResumeStudioWorkExperienceEditor: React.FC = () => {
  const [experiences, setExperiences] = useState<WorkExperience[]>(defaultExperiences);
  const [zoom, setZoom] = useState<number>(1);
  const [template, setTemplate] = useState<'modern' | 'classic'>('modern');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationReport, setOptimizationReport] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const resumeStrength = useCallback(() => {
    const totalWords = experiences.reduce((acc, e) => acc + e.description.split(/\s+/).filter(Boolean).length, 0);
    const metrics = experiences.reduce((acc, e) => acc + (e.description.match(/\d+/g) || []).length, 0);

    let score = 45;
    if (totalWords > 100) score += 18;
    if (totalWords > 200) score += 12;
    score += Math.min(20, metrics * 4);
    score += Math.min(10, experiences.length * 2);

    return Math.max(20, Math.min(95, Math.round(score)));
  }, [experiences]);

  const weakVerbUsage = useCallback(() => {
    const ledCount = experiences.reduce((acc, e) => acc + ((e.description.match(/\bled\b/gi) || []).length), 0);
    return ledCount > 1;
  }, [experiences]);

  const updateExperience = (id: string, field: keyof WorkExperience, value: string | boolean) => {
    setExperiences((prev) => prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)));
  };

  const addExperience = () => {
    const id = Date.now().toString();
    setExperiences((prev) => [
      ...prev,
      {
        id,
        jobTitle: '',
        company: '',
        startDate: '',
        endDate: '',
        description: '',
        isExpanded: true,
      },
    ]);
  };

  const removeExperience = (id: string) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExperiences((prev) => prev.map((exp) => (exp.id === id ? { ...exp, isExpanded: !exp.isExpanded } : exp)));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === id) return;

    setExperiences((prev) => {
      const from = prev.findIndex((x) => x.id === draggedId);
      const to = prev.findIndex((x) => x.id === id);
      if (from === -1 || to === -1) return prev;
      const reordered = [...prev];
      const [item] = reordered.splice(from, 1);
      reordered.splice(to, 0, item);
      return reordered;
    });
  };

  const handleDragEnd = () => setDraggedId(null);

  const enhanceDescription = async (id: string) => {
    setApiError(null);
    const exp = experiences.find((e) => e.id === id);
    if (!exp) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const prompt = `Rewrite the following work experience description to be achievement-focused. Use stronger action verbs and add measurable impact where reasonable. Keep it concise and professional (1-2 lines).\n\nOriginal:\n${exp.description}`;

    try {
      const improved = await callAnthropic(prompt, abortRef.current.signal);
      if (!improved) throw new Error('AI response was empty.');
      updateExperience(id, 'description', improved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to enhance description.';
      setApiError(message);
    }
  };

  const finalizeAndOptimize = async () => {
    setApiError(null);
    setIsOptimizing(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const payload = experiences
      .map((exp, i) => `${i + 1}. ${exp.jobTitle || 'Role'} at ${exp.company || 'Company'}: ${exp.description}`)
      .join('\n\n');

    const prompt = `Analyze the following work experience content for a resume. Return an optimization report with:\n1) Overall impact\n2) Verb usage quality\n3) Missing metrics/opportunities\n4) ATS keyword suggestions\n5) Top 3 prioritized edits\n\nContent:\n${payload}`;

    try {
      const report = await callAnthropic(prompt, abortRef.current.signal);
      if (!report) throw new Error('Optimization report was empty.');
      setOptimizationReport(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate optimization report.';
      setApiError(message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const templateStyles =
    template === 'modern'
      ? {
          name: 'font-playfair text-4xl font-bold text-gray-900',
          role: 'text-orange-500 text-lg font-medium',
          section: 'text-xs uppercase tracking-widest text-gray-700 font-bold mb-3 border-b border-orange-400 pb-2',
          bullet: 'list-disc list-inside text-gray-700 text-sm',
        }
      : {
          name: 'font-playfair text-3xl font-semibold text-gray-900',
          role: 'text-orange-500 text-base font-semibold',
          section: 'text-sm text-gray-800 font-semibold mb-3 border-b border-gray-300 pb-2',
          bullet: 'list-none text-gray-700 text-sm pl-4 border-l-2 border-orange-300',
        };

  return (
    <div className="min-h-screen w-full bg-[#1a1014] text-[#f5f0f2] flex font-sans overflow-hidden" style={{ minWidth: 1200 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@400;700&display=swap');
        .font-sans { font-family: 'DM Sans', sans-serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
      `}</style>

      <aside className="w-15 shrink-0 bg-[#231820] border-r border-[#2e1f28] flex flex-col items-center py-4">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-10 h-10 bg-[#e8622a] rounded-lg flex items-center justify-center shadow-[0_8px_20px_rgba(232,98,42,0.35)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7S4.99 16.2 3.5 16.2H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>
          </div>
          <span className="text-[10px] text-[#f5f0f2] mt-2 text-center leading-tight">ResumeStudio</span>
          <span className="text-[9px] mt-1 bg-[#f0847a] text-[#231820] px-1.5 py-0.5 rounded-full font-semibold">V3.0 Beta</span>
        </div>

        <div className="flex flex-col gap-5 w-full items-center mt-3">
          {[
            'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z',
            'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4v2h16V6z',
            'M12 3L1 9l11 6 9-4.91V17h2V9L12 3z',
            'M19.43 12.98c.04-.32.07-.66.07-1.02 0-3.86-3.14-7-7-7-2.75 0-5.18 1.59-6.32 4.06',
            'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58',
          ].map((path, idx) => (
            <button
              key={idx}
              className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${idx === 1 ? 'text-[#e8622a] bg-[#2e1f28]' : 'text-[#a08090] hover:text-[#f5f0f2]'}`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d={path} /></svg>
            </button>
          ))}
        </div>
      </aside>

      <section className="w-95 shrink-0 bg-[#231820] border-r border-[#2e1f28] flex flex-col">
        <div className="p-6 border-b border-[#2e1f28]">
          <h2 className="text-xl font-bold mb-1">Work Experience</h2>
          <p className="text-xs text-[#a08090] leading-relaxed">
            Detail your professional journey. Focus on achievements rather than just duties.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, exp.id)}
              onDragOver={(e) => handleDragOver(e, exp.id)}
              onDragEnd={handleDragEnd}
              className="bg-[#2e1f28] rounded-xl border border-[#3a2a33] overflow-hidden transition-all duration-300 hover:border-[#e8622a]/30"
            >
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(exp.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-[#a08090]">≡</span>
                  <div>
                    <h3 className="text-sm font-semibold">{exp.jobTitle || 'New Position'}</h3>
                    <p className="text-xs text-[#a08090]">
                      {exp.company || 'Company Name'} • {exp.startDate || 'Start'} - {exp.endDate || 'End'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeExperience(exp.id);
                    }}
                    className="text-[#a08090] hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                  <span className={`text-[#a08090] transition-transform duration-300 ${exp.isExpanded ? 'rotate-180' : ''}`}>⌄</span>
                </div>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${exp.isExpanded ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0 space-y-3">
                  <div>
                    <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Job Title</label>
                    <input
                      value={exp.jobTitle}
                      onChange={(e) => updateExperience(exp.id, 'jobTitle', e.target.value)}
                      className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Company</label>
                    <input
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                      className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Start Date</label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">End Date</label>
                      <input
                        value={exp.endDate}
                        onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2]"
                        placeholder="Present"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#a08090] mb-1 uppercase tracking-wider">Description</label>
                    <textarea
                      rows={4}
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                      className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] resize-none"
                    />
                  </div>
                  <button
                    onClick={() => enhanceDescription(exp.id)}
                    className="w-full py-2 px-4 bg-[#e8622a]/10 border border-[#e8622a]/30 text-[#e8622a] rounded-lg text-sm font-medium hover:bg-[#e8622a]/20 transition-all"
                  >
                    ⚡ AI Enhance Description
                  </button>
                </div>
              </div>
            </div>
          ))}

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
          <div className="flex items-center bg-[#231820] rounded-lg p-1 border border-[#2e1f28]">
            <button onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} className="p-1.5 text-[#a08090]">-</button>
            <span className="text-xs text-[#a08090] w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))} className="p-1.5 text-[#a08090]">+</button>
          </div>

          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as 'modern' | 'classic')}
            className="bg-[#231820] border border-[#2e1f28] rounded-lg px-3 py-1.5 text-sm text-[#f5f0f2]"
          >
            <option value="modern">Template: Modern Executive</option>
            <option value="classic">Template: Classic Professional</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <div
            className="bg-white shadow-2xl relative transition-transform duration-300"
            style={{
              width: '210mm',
              minHeight: '297mm',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="absolute inset-0 flex items-end justify-center pb-12 pointer-events-none z-10 opacity-[0.05]">
              <span className="text-6xl font-playfair text-gray-900">Draft Preview</span>
            </div>

            <div className="p-12">
              <div className="mb-8">
                <h1 className={templateStyles.name}>John Doe</h1>
                <p className={templateStyles.role}>Software Engineer</p>
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                  <span>john.doe@example.com</span>
                  <span>•</span>
                  <span>(555) 123-4567</span>
                  <span>•</span>
                  <span>San Francisco, CA</span>
                  <span>•</span>
                  <span>linkedin.com/in/johndoe</span>
                </div>
              </div>

              <div className="mb-8">
                <h2 className={templateStyles.section}>Work Experience</h2>
                <div className="space-y-6">
                  {experiences.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-gray-900">{exp.company || 'Company Name'}</h3>
                        <span className="text-sm text-gray-500">
                          {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Start Date'} - {exp.endDate || 'Present'}
                        </span>
                      </div>
                      <p className="text-gray-700 italic mb-2">{exp.jobTitle || 'Job Title'}</p>
                      <ul className={templateStyles.bullet}>
                        <li>{exp.description || 'Job description...'}</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className={templateStyles.section}>Education</h2>
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-gray-900">University of Technology</h3>
                    <span className="text-sm text-gray-500">2014 - 2018</span>
                  </div>
                  <p className="text-gray-700 italic">Bachelor of Science in Computer Science</p>
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
                  <p className="text-xs text-[#a08090] mt-1">Great job including metrics in your bullets.</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-blue-900/20 border-blue-800/30">
              <div className="flex items-start gap-2">
                <span className="text-lg">🔵</span>
                <div>
                  <h4 className="text-sm font-medium">Add relevant skills</h4>
                  <p className="text-xs text-[#a08090] mt-1">Consider adding React, Node.js, and TypeScript.</p>
                  <button className="text-xs text-[#e8622a] mt-2">Apply Suggested Skills</button>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${weakVerbUsage() ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-[#2e1f28] border-[#3a2a33]'}`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div>
                  <h4 className="text-sm font-medium">Weak Verb Usage</h4>
                  <p className="text-xs text-[#a08090] mt-1">Repeated "Led" found. Try alternatives like "Orchestrated" or "Directed".</p>
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
          </div>
        </div>

        <div className="p-4 border-t border-[#2e1f28]">
          <button
            onClick={finalizeAndOptimize}
            disabled={isOptimizing}
            className="w-full py-3 bg-[#e8622a] hover:bg-[#d55524] text-white rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {isOptimizing ? 'Optimizing...' : '✏️ Finalize & Optimize'}
          </button>
          {apiError && <p className="text-xs text-red-300 mt-2">{apiError}</p>}
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
    </div>
  );
};

export default ResumeStudioWorkExperienceEditor;

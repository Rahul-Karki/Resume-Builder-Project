import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
  isExpanded: boolean;
}

interface Tip {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
  action?: string;
}

// --- Mock AI Service ---
const mockEnhanceDescription = async (description: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        description
          .replace(/led/gi, 'Orchestrated')
          .replace(/managed/gi, 'Directed')
          .replace(/worked on/gi, 'Spearheaded')
          .replace(/helped/gi, 'Facilitated') +
        ' Resulting in a 25% increase in efficiency and a 15% reduction in costs.'
      );
    }, 1500);
  });
};

const mockFinalizeOptimize = async (experiences: WorkExperience[]): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const totalWords = experiences.reduce((acc, curr) => acc + curr.description.split(' ').length, 0);
      resolve(
        `Optimization Report:\n\n` +
        `1. Overall Impact: Your resume demonstrates strong technical skills, but could benefit from more quantifiable achievements.\n` +
        `2. Verb Usage: Consider varying your action verbs to avoid repetition.\n` +
        `3. Length: Your total experience description is ${totalWords} words. Aim for 300-500 words for optimal ATS parsing.\n` +
        `4. Keywords: Ensure you include relevant keywords from the job description.\n\n` +
        `Recommendation: Focus on metrics and outcomes in your most recent role.`
      );
    }, 2000);
  });
};

// --- Components ---

const ResumeStudioWorkExperienceEditor: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState('briefcase');
  const [experiences, setExperiences] = useState<WorkExperience[]>([
    {
      id: '1',
      jobTitle: 'Senior Software Engineer',
      company: 'Tech Solutions Inc.',
      startDate: '2021-01',
      endDate: 'Present',
      description: 'Led a team of 5 developers in building a new customer portal. Managed the migration from legacy systems to modern cloud infrastructure.',
      isExpanded: true,
    },
    {
      id: '2',
      jobTitle: 'Software Engineer',
      company: 'Innovate LLC',
      startDate: '2018-06',
      endDate: '2020-12',
      description: 'Worked on developing RESTful APIs and frontend components using React and Node.js.',
      isExpanded: false,
    },
  ]);

  const [zoom, setZoom] = useState(1);
  const [template, setTemplate] = useState('modern-executive');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationReport, setOptimizationReport] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // --- Derived State ---
  const resumeStrength = useCallback(() => {
    let score = 50;
    const totalWords = experiences.reduce((acc, curr) => acc + curr.description.split(' ').length, 0);
    const hasNumbers = experiences.some((exp) => /\d/.test(exp.description));
    
    if (totalWords > 50) score += 15;
    if (totalWords > 150) score += 10;
    if (hasNumbers) score += 10;
    if (experiences.length >= 2) score += 10;
    if (experiences.every(e => e.jobTitle && e.company)) score += 5;

    return Math.min(100, score);
  }, [experiences]);

  const tips: Tip[] = [
    {
      id: 'quantify',
      type: 'success',
      title: 'Quantify your impact',
      message: 'Great job including metrics!',
    },
    {
      id: 'skills',
      type: 'info',
      title: 'Add relevant skills',
      message: 'Consider adding React, Node.js, and TypeScript.',
      action: 'Apply Suggested Skills',
    },
    {
      id: 'verbs',
      type: 'warning',
      title: 'Weak Verb Usage',
      message: 'You used "Led" multiple times. Try "Orchestrated" or "Directed".',
    },
  ];

  // --- Handlers ---
  const handleAddExperience = () => {
    const newExp: WorkExperience = {
      id: Date.now().toString(),
      jobTitle: '',
      company: '',
      startDate: '',
      endDate: '',
      description: '',
      isExpanded: true,
    };
    setExperiences([...experiences, newExp]);
  };

  const handleUpdateExperience = (id: string, field: keyof WorkExperience, value: any) => {
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const handleRemoveExperience = (id: string) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  };

  const handleToggleExpand = (id: string) => {
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, isExpanded: !exp.isExpanded } : exp))
    );
  };

  const handleEnhanceDescription = async (id: string) => {
    setApiError(null);
    const exp = experiences.find((e) => e.id === id);
    if (!exp) return;

    try {
      const enhanced = await mockEnhanceDescription(exp.description);
      handleUpdateExperience(id, 'description', enhanced);
    } catch (error) {
      setApiError('Failed to enhance description. Please try again.');
    }
  };

  const handleFinalizeOptimize = async () => {
    setIsOptimizing(true);
    setApiError(null);
    try {
      const report = await mockFinalizeOptimize(experiences);
      setOptimizationReport(report);
    } catch (error) {
      setApiError('Failed to generate optimization report.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === id) return;

    const draggedIndex = experiences.findIndex((exp) => exp.id === draggedId);
    const targetIndex = experiences.findIndex((exp) => exp.id === id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newExperiences = [...experiences];
    const [removed] = newExperiences.splice(draggedIndex, 1);
    newExperiences.splice(targetIndex, 0, removed);

    setExperiences(newExperiences);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  // --- Render Helpers ---
  const getTemplateStyles = () => {
    if (template === 'modern-executive') {
      return {
        nameFont: 'font-serif text-4xl font-bold text-gray-900',
        titleFont: 'text-lg font-medium text-orange-600',
        sectionTitle: 'text-sm font-bold tracking-widest text-gray-500 uppercase border-b-2 border-orange-500 pb-1 mb-3',
        bullet: 'list-disc list-inside text-gray-700 text-sm leading-relaxed',
      };
    }
    return {
      nameFont: 'font-sans text-3xl font-light text-gray-800',
      titleFont: 'text-base font-bold text-blue-600 uppercase tracking-wide',
      sectionTitle: 'text-lg font-serif font-bold text-gray-800 border-b border-gray-300 pb-1 mb-3',
      bullet: 'list-none text-gray-600 text-sm leading-relaxed pl-4 border-l-2 border-blue-500',
    };
  };

  const templateStyles = getTemplateStyles();

  return (
    <div className="flex h-screen w-full bg-[#1a1014] text-[#f5f0f2] font-sans overflow-hidden selection:bg-[#e8622a] selection:text-white">
      {/* Inject Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@400;700&display=swap');
        .font-sans { font-family: 'DM Sans', sans-serif; }
        .font-serif { font-family: 'Playfair Display', serif; }
      `}</style>

      {/* LEFT SIDEBAR */}
      <aside className="w-15 shrink-0 bg-[#231820] flex flex-col items-center py-4 border-r border-[#2e1f28]">
        <div className="mb-8">
          <div className="w-8 h-8 bg-[#e8622a] rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(232,98,42,0.4)]">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5z"/></svg>
          </div>
        </div>
        
        <nav className="flex flex-col gap-6 w-full">
          {[
            { id: 'profile', icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
            { id: 'briefcase', icon: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z' },
            { id: 'education', icon: 'M12 3L1 9l4 2.18v6.64L12 21l7-3.18V11.1l2-1.09V17h2V9L12 3zm6.82 6.09L12 12.72 5.18 9.09 12 5.56l6.82 3.53zM12 19.36l-5-2.27v-3.18L12 17.9l5-2.99v3.18L12 19.36z' },
            { id: 'skills', icon: 'M19.43 12.98c.04-.32.07-.66.07-1.02 0-3.86-3.14-7-7-7-2.75 0-5.18 1.59-6.32 4.06C5.93 9.04 5.47 9 5 9c-2.21 0-4 1.79-4 4s1.79 4 4 4h14c1.66 0 3-1.34 3-3 0-1.6-1.26-2.88-2.79-2.96-.1-.02-.2-.03-.31-.04-.15-.01-.3-.02-.47-.02z' },
            { id: 'settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.49-.41h-3.84c-.24 0-.43.17-.49.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.49.41h3.84c.24 0 .44-.17.49-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full h-10 flex items-center justify-center transition-colors duration-200 relative ${
                activeTab === item.id ? 'text-[#e8622a]' : 'text-[#a08090] hover:text-[#f5f0f2]'
              }`}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e8622a] rounded-r-full shadow-[0_0_8px_rgba(232,98,42,0.6)]" />
              )}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d={item.icon} /></svg>
            </button>
          ))}
        </nav>
      </aside>

      {/* CENTER-LEFT PANEL (Editor) */}
      <div className="w-95 shrink-0 bg-[#231820] border-r border-[#2e1f28] flex flex-col">
        <div className="p-6 border-b border-[#2e1f28]">
          <h2 className="text-xl font-bold text-[#f5f0f2] mb-1">Work Experience</h2>
          <p className="text-xs text-[#a08090] leading-relaxed">
            Detail your professional journey. Focus on achievements rather than just duties.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {experiences.map((exp, index) => (
            <div
              key={exp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, exp.id)}
              onDragOver={(e) => handleDragOver(e, exp.id)}
              onDragEnd={handleDragEnd}
              className="bg-[#2e1f28] rounded-xl border border-[#3a2a33] overflow-hidden transition-all duration-300 hover:border-[#e8622a]/30"
            >
              {/* Card Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => handleToggleExpand(exp.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#a08090] hover:text-[#f5f0f2] cursor-grab active:cursor-grabbing">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 8h4v-4h-4v4zm6 0h4v-4h-4v4zm6-4v4h4v-4h-4zm-12 10h4v-4h-4v4zm6 0h4v-4h-4v4zm6 0h4v-4h-4v4z"/></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#f5f0f2]">
                      {exp.jobTitle || 'New Position'}
                    </h3>
                    <p className="text-xs text-[#a08090]">
                      {exp.company || 'Company Name'} • {exp.startDate || 'Start'} - {exp.endDate || 'End'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveExperience(exp.id);
                    }}
                    className="text-[#a08090] hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                  <svg
                    className={`w-4 h-4 text-[#a08090] transition-transform duration-300 ${exp.isExpanded ? 'rotate-180' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  exp.isExpanded ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 pt-0 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a08090] mb-1 uppercase tracking-wider">Job Title</label>
                    <input
                      type="text"
                      value={exp.jobTitle}
                      onChange={(e) => handleUpdateExperience(exp.id, 'jobTitle', e.target.value)}
                      className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] focus:outline-none focus:border-[#e8622a] focus:ring-1 focus:ring-[#e8622a] transition-all"
                      placeholder="e.g. Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#a08090] mb-1 uppercase tracking-wider">Company</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleUpdateExperience(exp.id, 'company', e.target.value)}
                      className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] focus:outline-none focus:border-[#e8622a] focus:ring-1 focus:ring-[#e8622a] transition-all"
                      placeholder="e.g. Tech Solutions Inc."
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[#a08090] mb-1 uppercase tracking-wider">Start Date</label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => handleUpdateExperience(exp.id, 'startDate', e.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] focus:outline-none focus:border-[#e8622a] focus:ring-1 focus:ring-[#e8622a] transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[#a08090] mb-1 uppercase tracking-wider">End Date</label>
                      <input
                        type="text"
                        value={exp.endDate}
                        onChange={(e) => handleUpdateExperience(exp.id, 'endDate', e.target.value)}
                        className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] focus:outline-none focus:border-[#e8622a] focus:ring-1 focus:ring-[#e8622a] transition-all"
                        placeholder="Present"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#a08090] mb-1 uppercase tracking-wider">Description</label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => handleUpdateExperience(exp.id, 'description', e.target.value)}
                      rows={4}
                      className="w-full bg-[#231820] border border-[#3a2a33] rounded-lg px-3 py-2 text-sm text-[#f5f0f2] focus:outline-none focus:border-[#e8622a] focus:ring-1 focus:ring-[#e8622a] transition-all resize-none"
                      placeholder="Describe your responsibilities and achievements..."
                    />
                  </div>
                  <button
                    onClick={() => handleEnhanceDescription(exp.id)}
                    className="w-full py-2 px-4 bg-[#e8622a]/10 border border-[#e8622a]/30 text-[#e8622a] rounded-lg text-sm font-medium hover:bg-[#e8622a]/20 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-3 8 11-12h-9l3-8z"/></svg>
                    AI Enhance Description
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddExperience}
            className="w-full py-3 border-2 border-dashed border-[#3a2a33] rounded-xl text-[#a08090] hover:text-[#f5f0f2] hover:border-[#e8622a]/50 transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add Work Experience
          </button>
        </div>
      </div>

      {/* CENTER PANEL (Preview) */}
      <div className="flex-1 bg-[#1a1014] flex flex-col min-w-0">
        <div className="h-14 border-b border-[#2e1f28] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[#231820] rounded-lg p-1 border border-[#2e1f28]">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-[#2e1f28] rounded-md transition-colors text-[#a08090]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>
              </button>
              <span className="text-xs text-[#a08090] w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 hover:bg-[#2e1f28] rounded-md transition-colors text-[#a08090]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              </button>
            </div>
          </div>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="bg-[#231820] border border-[#2e1f28] rounded-lg px-3 py-1.5 text-sm text-[#f5f0f2] focus:outline-none focus:border-[#e8622a]"
          >
            <option value="modern-executive">Template: Modern Executive</option>
            <option value="classic-professional">Template: Classic Professional</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto p-8 flex items-start justify-center custom-scrollbar">
          <div
            className="bg-white shadow-2xl relative transition-transform duration-300"
            style={{
              width: '210mm',
              minHeight: '297mm',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-[0.03]">
              <span className="text-6xl font-bold text-gray-900 rotate-[-30deg]">DRAFT PREVIEW</span>
            </div>

            {/* Resume Content */}
            <div className="p-12">
              {/* Header */}
              <div className="mb-8">
                <h1 className={templateStyles.nameFont}>John Doe</h1>
                <p className={templateStyles.titleFont}>Software Engineer</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                  <span>john.doe@example.com</span>
                  <span>•</span>
                  <span>(555) 123-4567</span>
                  <span>•</span>
                  <span>San Francisco, CA</span>
                  <span>•</span>
                  <span>linkedin.com/in/johndoe</span>
                </div>
              </div>

              {/* Work Experience */}
              <div className="mb-8">
                <h2 className={templateStyles.sectionTitle}>Work Experience</h2>
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

              {/* Education */}
              <div>
                <h2 className={templateStyles.sectionTitle}>Education</h2>
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
      </div>

      {/* RIGHT PANEL (Tips) */}
      <div className="w-75 shrink-0 bg-[#231820] border-l border-[#2e1f28] flex flex-col">
        <div className="p-6 border-b border-[#2e1f28]">
          <h3 className="text-sm font-bold text-[#f5f0f2] mb-4">Resume Strength</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#2e1f28"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e8622a"
                  strokeWidth="3"
                  strokeDasharray={`${resumeStrength()}, 100`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-[#f5f0f2]">{resumeStrength()}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[#f5f0f2]">{resumeStrength() > 75 ? 'Strong' : 'Moderate'}</p>
              <p className="text-xs text-[#a08090]">Stronger than 78% of applicants</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <h3 className="text-sm font-bold text-[#f5f0f2] mb-4">Actionable Tips</h3>
          <div className="space-y-3">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className={`p-3 rounded-lg border ${
                  tip.type === 'success'
                    ? 'bg-green-900/20 border-green-800/30'
                    : tip.type === 'info'
                    ? 'bg-blue-900/20 border-blue-800/30'
                    : 'bg-yellow-900/20 border-yellow-800/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">
                    {tip.type === 'success' && '✅'}
                    {tip.type === 'info' && '🔵'}
                    {tip.type === 'warning' && '⚠️'}
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-[#f5f0f2]">{tip.title}</h4>
                    <p className="text-xs text-[#a08090] mt-1">{tip.message}</p>
                    {tip.action && (
                      <button className="text-xs text-[#e8622a] hover:text-[#f0847a] mt-2 font-medium transition-colors">
                        {tip.action}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-[#2e1f28] rounded-xl border border-[#3a2a33]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#f5f0f2]">Template Insights</h3>
              <span className="text-xs bg-[#e8622a] text-white px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <div className="h-24 bg-[#1a1014] rounded-lg flex items-center justify-center border border-[#3a2a33]">
              <span className="text-xs text-[#a08090]">Preview Image</span>
            </div>
            <p className="text-xs text-[#a08090] mt-2">Modern Executive is optimized for ATS.</p>
          </div>
        </div>

        <div className="p-4 border-t border-[#2e1f28]">
          <button
            onClick={handleFinalizeOptimize}
            disabled={isOptimizing}
            className="w-full py-3 bg-[#e8622a] hover:bg-[#d55524] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(232,98,42,0.3)]"
          >
            {isOptimizing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Optimizing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Finalize & Optimize
              </>
            )}
          </button>
        </div>
      </div>

      {/* Optimization Modal */}
      {optimizationReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#231820] border border-[#2e1f28] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#f5f0f2]">Optimization Report</h3>
              <button
                onClick={() => setOptimizationReport(null)}
                className="text-[#a08090] hover:text-[#f5f0f2] transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </div>
            <div className="bg-[#1a1014] rounded-xl p-4 border border-[#2e1f28] mb-6">
              <pre className="text-sm text-[#f5f0f2] whitespace-pre-wrap font-sans leading-relaxed">
                {optimizationReport}
              </pre>
            </div>
            <button
              onClick={() => setOptimizationReport(null)}
              className="w-full py-2.5 bg-[#e8622a] hover:bg-[#d55524] text-white rounded-xl font-medium transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {apiError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3 border border-red-700">
          <svg className="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span className="text-sm">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-300 hover:text-white ml-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      )}

      {/* Global Styles for Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3a2a33;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4a3a43;
        }
      `}</style>
    </div>
  );
};

export default ResumeStudioWorkExperienceEditor;

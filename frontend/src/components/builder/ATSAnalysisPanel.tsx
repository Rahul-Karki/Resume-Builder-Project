import React, { useEffect, useMemo, useState } from "react";
import { queueAtsAnalysis, getAtsAnalysis, getLatestAtsAnalysis } from "@/services/api";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import type { AtsAnalysisReport, AiTone } from "@/types/resume-types";
import { BarChart2, Key, CheckSquare, Edit3, ClipboardList, AlertTriangle, Activity, Loader2, Play, ChevronDown, TrendingUp, FileSearch } from "lucide-react";

const TONES: AiTone[] = ["professional", "concise", "technical", "leadership-focused"];
const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const buildSkillKeywords = (resume = useResumeBuilderStore.getState().resume) => {
  const skills = resume.sections.skills.flatMap((group) => [group.category, ...group.items]);
  return Array.from(new Set(skills.map((item) => compact(item).toLowerCase()).filter(Boolean))).slice(0, 20);
};

type Props = { expanded?: boolean };

const css = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes progress { from { width: 0; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 800px; } }
  
  .ats-container { font-family: 'Outfit', system-ui, sans-serif; }
  
  /* Collapsed Header */
  .ats-header-collapsed { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    padding: 10px 16px; 
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .ats-header-collapsed:hover { background: rgba(255, 255, 255, 0.04); }
  
  .ats-header-left { display: flex; align-items: center; gap: 10px; }
  .ats-header-icon { 
    width: 26px; height: 26px; 
    background: rgba(200, 245, 90, 0.12); 
    border-radius: 6px; 
    display: flex; align-items: center; justify-content: center;
    color: #C8F55A;
  }
  .ats-header-text { display: flex; flex-direction: column; }
  .ats-header-title { font-size: 12px; font-weight: 600; color: #C8C7C0; }
  .ats-header-subtitle { font-size: 10px; color: #666; }
  .ats-header-right { display: flex; align-items: center; gap: 8px; }
  .ats-chevron { color: #666; transition: transform 0.2s ease; }
  .ats-chevron.open { transform: rotate(180deg); }
  
  /* Expanded Panel */
  .ats-panel { 
    background: #0F0F0F; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.06); 
    color: #e4e4e7; 
    animation: slideDown 0.3s ease-out;
    max-height: 350px;
    overflow-y: auto;
  }
  .ats-panel::-webkit-scrollbar { width: 4px; }
  .ats-panel::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
  
  .ats-panel-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between;
    padding: 12px 16px; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    position: sticky;
    top: 0;
    background: #0F0F0F;
    z-index: 10;
  }
  .ats-panel-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #C8F55A; }
  .ats-close-btn { 
    width: 24px; height: 24px; 
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px; color: #666; cursor: pointer;
    transition: all 0.15s ease;
  }
  .ats-close-btn:hover { background: rgba(255,255,255,0.05); color: #C8C7C0; }
  
  .ats-body { padding: 16px; display: grid; gap: 16px; }
  .ats-input { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.08); 
    border-radius: 6px; 
    color: #e4e4e7; 
    padding: 10px 12px; 
    font-size: 12px; 
    font-family: inherit; 
    transition: all 0.2s ease; 
    width: 100%; 
  }
  .ats-input:focus { border-color: rgba(200, 245, 90, 0.4); outline: none; background: rgba(255, 255, 255, 0.04); }
  .ats-textarea { resize: vertical; min-height: 60px; line-height: 1.5; font-size: 12px; }
  
  .ats-btn-analyze { 
    display: flex; align-items: center; justify-content: center; gap: 6px; 
    background: #C8F55A; 
    color: #0A0A0A; 
    border: none; 
    border-radius: 6px; 
    padding: 8px 14px; 
    font-size: 12px; 
    font-weight: 600; 
    cursor: pointer; 
    transition: all 0.2s ease;
  }
  .ats-btn-analyze:hover:not(:disabled) { background: #d4fa6e; }
  .ats-btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .ats-score-mini { 
    display: flex; align-items: center; gap: 8px; 
    padding: 8px 12px; 
    background: rgba(255, 255, 255, 0.02); 
    border-radius: 6px; 
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .ats-score-mini-value { font-size: 18px; font-weight: 700; }
  .ats-score-mini-label { font-size: 10px; color: #666; text-transform: uppercase; }
  
  .ats-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ats-score-card { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 8px; 
    padding: 14px; 
    text-align: center; 
  }
  .ats-score-label { font-size: 10px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .ats-score-value { font-size: 22px; font-weight: 700; line-height: 1; }
  .ats-score-sub { font-size: 12px; color: #666; margin-left: 2px; }
  
  .ats-progress-bar { height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .ats-progress-fill { height: 100%; border-radius: 2px; animation: progress 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
  
  .ats-section-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .ats-section-card { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 6px; 
    padding: 10px; 
  }
  .ats-section-name { font-size: 10px; color: #666; font-weight: 600; text-transform: capitalize; margin-bottom: 4px; }
  .ats-section-score { font-size: 14px; font-weight: 700; }
  
  .ats-block { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 8px; 
    padding: 14px; 
  }
  .ats-block-title { 
    font-size: 12px; 
    color: #aaa; 
    font-weight: 600; 
    display: flex; align-items: center; gap: 6px; 
    margin-bottom: 12px; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.04); 
    padding-bottom: 10px; 
  }
  
  .ats-tag { 
    display: inline-block; 
    padding: 4px 8px; 
    border-radius: 4px; 
    font-size: 11px; 
    font-weight: 500; 
    margin: 2px 4px 2px 0; 
    border: 1px solid; 
  }
  .ats-tag-good { background: rgba(22, 163, 74, 0.1); border-color: rgba(22, 163, 74, 0.15); color: #86efac; }
  .ats-tag-warn { background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.15); color: #fcd34d; }
  .ats-tag-neutral { background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); color: #888; }
  
  .ats-check-row { 
    display: flex; justify-content: space-between; align-items: center; 
    padding: 8px 10px; 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 6px; 
    margin-bottom: 6px; 
  }
  .ats-check-label { font-size: 11px; font-weight: 500; color: #aaa; }
  .ats-check-pass { font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.3px; }
  .ats-check-pass.pass { background: rgba(22, 163, 74, 0.15); color: #86efac; border: 1px solid rgba(22, 163, 74, 0.2); }
  .ats-check-pass.fail { background: rgba(220, 38, 38, 0.15); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.2); }
  
  .ats-issue-card { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 6px; 
    padding: 10px; 
    margin-bottom: 8px; 
  }
  .ats-issue-reason { font-size: 11px; font-weight: 600; color: #aaa; margin-bottom: 4px; }
  .ats-issue-text { font-size: 11px; color: #888; line-height: 1.5; }
  
  .ats-summary-text { font-size: 12px; color: #888; line-height: 1.5; }
  
  .ats-error { 
    padding: 10px 12px; 
    border-radius: 6px; 
    background: rgba(220, 38, 38, 0.08); 
    border: 1px solid rgba(220, 38, 38, 0.2); 
    color: #fca5a5; 
    font-size: 12px; 
    display: flex; align-items: center; gap: 8px; 
  }
  
  .ats-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px; font-size: 12px; color: #666; }
  .ats-spin { animation: spin 1s linear infinite; }
  
  .ats-select { 
    background: rgba(255, 255, 255, 0.02); 
    border: 1px solid rgba(255, 255, 255, 0.08); 
    border-radius: 6px; 
    color: #e4e4e7; 
    padding: 10px 12px; 
    font-size: 12px; 
    font-family: inherit; 
    cursor: pointer; 
    width: 100%;
  }
  .ats-select:focus { border-color: rgba(200, 245, 90, 0.4); outline: none; }
  
  .ats-empty { 
    padding: 32px 16px; 
    text-align: center; 
    color: #666; 
    display: flex; flex-direction: column; align-items: center; gap: 12px; 
  }
  .ats-empty-icon { 
    width: 40px; height: 40px; 
    background: rgba(255, 255, 255, 0.03); 
    border-radius: 10px; 
    display: flex; align-items: center; justify-content: center;
    color: #555;
  }
  .ats-empty-text { font-size: 12px; line-height: 1.5; max-width: 240px; }
`;

const getScoreColor = (score: number) => score >= 75 ? "#86EFAC" : score >= 50 ? "#FBBF24" : "#FCA5A5";

export function ATSAnalysisPanel({ expanded = true }: Props) {
  const { resume } = useResumeBuilderStore();
  const resumeId = resume.id ?? resume._id;
  const [jobTitle, setJobTitle] = useState(resume.personalInfo.title || resume.title);
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState<AiTone>("professional");
  const [analysis, setAnalysis] = useState<AtsAnalysisReport | null>(null);
  const [queuedJobId, setQueuedJobId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fallbackKeywords = useMemo(() => buildSkillKeywords(resume), [resume]);

  useEffect(() => { setJobTitle(resume.personalInfo.title || resume.title); }, [resume.personalInfo.title, resume.title]);

  useEffect(() => {
    if (!resumeId) return;
    getLatestAtsAnalysis(resumeId)
      .then((response) => { setAnalysis(response.analysis); setLastUpdatedAt(response.analysis.analyzedAt ?? null); })
      .catch(() => { /* no previous analysis */ });
  }, [resumeId]);

  useEffect(() => {
    if (!queuedJobId || !resumeId) return undefined;
    let active = true;
    const interval = window.setInterval(async () => {
      try {
        const response = await getAtsAnalysis(resumeId, queuedJobId);
        if (!active) return;
        setAnalysis(response.analysis);
        setLastUpdatedAt(response.analysis.analyzedAt ?? null);
        if (response.analysis.status === "completed" || response.analysis.status === "failed") {
          setIsRunning(false); setQueuedJobId(null); window.clearInterval(interval);
        }
      } catch (pollError) {
        if (!active) return;
        setError(pollError instanceof Error ? pollError.message : "ATS analysis polling failed");
        setIsRunning(false); setQueuedJobId(null); window.clearInterval(interval);
      }
    }, 2000);
    return () => { active = false; window.clearInterval(interval); };
  }, [queuedJobId, resumeId]);

  const handleAnalyze = async () => {
    if (!resumeId) { setError("Save the resume before running ATS analysis."); return; }
    setIsRunning(true); setError(null);
    try {
      const response = await queueAtsAnalysis(resumeId, {
        jobTitle, jobDescription, keywords: fallbackKeywords, tone,
        reportType: jobDescription.trim().length > 0 ? "job-description-match" : "resume-analysis",
      });
      setQueuedJobId(response.jobId);
      setLastUpdatedAt(new Date().toISOString());
    } catch (queueError) {
      setIsRunning(false);
      setError(queueError instanceof Error ? queueError.message : "Failed to queue ATS analysis");
    }
  };

  if (!expanded) return null;

  // Get score for display in collapsed header
  const scoreDisplay = analysis ? `${analysis.overallScore}/100` : null;

  // Collapsed state
  if (!isExpanded) {
    return (
      <div className="ats-container">
        <style>{css}</style>
        <div className="ats-header-collapsed" onClick={() => setIsExpanded(true)}>
          <div className="ats-header-left">
            <div className="ats-header-icon">
              <FileSearch size={13} />
            </div>
            <div className="ats-header-text">
              <span className="ats-header-title">ATS Resume Analysis</span>
              <span className="ats-header-subtitle">
                {scoreDisplay ? `Score: ${scoreDisplay}` : "Check how well your resume performs"}
              </span>
            </div>
          </div>
          <div className="ats-header-right">
            {scoreDisplay && (
              <span style={{ 
                fontSize: 14, fontWeight: 700, 
                color: analysis && analysis.overallScore >= 75 ? "#86efac" : analysis && analysis.overallScore >= 50 ? "#fcd34d" : "#fca5a5" 
              }}>
                {analysis?.overallScore}
              </span>
            )}
            <ChevronDown size={16} className="ats-chevron" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ats-container">
      <style>{css}</style>
      <div className="ats-panel">
        {/* Compact Header */}
        <div className="ats-panel-header">
          <div className="ats-panel-title">
            <Activity size={14} /> ATS Analysis
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {scoreDisplay && (
              <span style={{ fontSize: 13, color: "#888" }}>
                Last: {new Date(lastUpdatedAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
            <div className="ats-close-btn" onClick={() => setIsExpanded(false)} title="Collapse">
              <ChevronDown size={16} className="ats-chevron open" />
            </div>
          </div>
        </div>

        <div className="ats-body">
          {/* Job Title & Tone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <input 
              className="ats-input" 
              value={jobTitle} 
              onChange={(e) => setJobTitle(e.target.value)} 
              placeholder="Target job title or role" 
            />
            <select 
              className="ats-select" 
              value={tone} 
              onChange={(e) => setTone(e.target.value as AiTone)}
            >
              {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          {/* Job Description */}
          <textarea 
            className="ats-input ats-textarea" 
            value={jobDescription} 
            onChange={(e) => setJobDescription(e.target.value)} 
            placeholder="Paste job description for match score..." 
          />

          {/* Analyze Button */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="ats-btn-analyze" onClick={() => void handleAnalyze()} disabled={isRunning}>
              {isRunning ? <Loader2 size={12} className="ats-spin" /> : <Play size={12} />} 
              {isRunning ? "Analyzing..." : "Analyze"}
            </button>
            <span style={{ fontSize: 11, color: "#666" }}>
              {isRunning ? "This may take a moment..." : analysis ? "Click to refresh analysis" : "Run your first analysis"}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="ats-error">
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {/* Loading */}
          {isRunning && !analysis && (
            <div className="ats-loading">
              <Loader2 size={20} className="ats-spin" />
              <span>Analyzing your resume...</span>
            </div>
          )}

          {/* Empty State */}
          {!analysis && !isRunning && (
            <div className="ats-empty">
              <div className="ats-empty-icon">
                <TrendingUp size={18} />
              </div>
              <div className="ats-empty-text">
                Run an ATS analysis to see how well your resume matches job requirements and get suggestions for improvement.
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <>
              {/* Score cards */}
              <div className="ats-score-grid">
                <div className="ats-score-card">
                  <div className="ats-score-label">Overall</div>
                  <div className="ats-score-value" style={{ color: getScoreColor(analysis.overallScore) }}>
                    {analysis.overallScore}<span className="ats-score-sub">/100</span>
                  </div>
                  <div className="ats-progress-bar">
                    <div className="ats-progress-fill" style={{ width: `${analysis.overallScore}%`, background: getScoreColor(analysis.overallScore) }} />
                  </div>
                </div>
                <div className="ats-score-card">
                  <div className="ats-score-label">Match</div>
                  <div className="ats-score-value" style={{ color: getScoreColor(analysis.matchScore) }}>
                    {analysis.matchScore}<span className="ats-score-sub">%</span>
                  </div>
                  <div className="ats-progress-bar">
                    <div className="ats-progress-fill" style={{ width: `${analysis.matchScore}%`, background: getScoreColor(analysis.matchScore) }} />
                  </div>
                </div>
                <div className="ats-score-card">
                  <div className="ats-score-label">Status</div>
                  <div className="ats-score-value" style={{ fontSize: 14, marginTop: 2, color: analysis.status === "completed" ? "#86efac" : "#aaa" }}>
                    {analysis.status === "completed" ? "Done" : analysis.status}
                  </div>
                </div>
              </div>

              {/* Section scores */}
              <div className="ats-block">
                <div className="ats-block-title"><BarChart2 size={12} /> Sections</div>
                <div className="ats-section-grid">
                  {Object.entries(analysis.sectionScores).map(([label, value]) => (
                    <div key={label} className="ats-section-card">
                      <div className="ats-section-name">{label}</div>
                      <div className="ats-section-score" style={{ color: getScoreColor(value as number) }}>{String(value)}</div>
                      <div className="ats-progress-bar">
                        <div className="ats-progress-fill" style={{ width: `${value}%`, background: getScoreColor(value as number) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div className="ats-block">
                <div className="ats-block-title"><Key size={12} /> Keywords</div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase" }}>Matched</span>
                  <div style={{ marginTop: 4 }}>
                    {analysis.keywordAnalysis.matchedKeywords.length > 0 
                      ? analysis.keywordAnalysis.matchedKeywords.map((v) => <span key={v} className="ats-tag ats-tag-good">{v}</span>)
                      : <span style={{ color: "#555", fontSize: 11 }}>None yet</span>
                    }
                  </div>
                </div>
                {analysis.keywordAnalysis.missingKeywords.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase" }}>Missing</span>
                    <div style={{ marginTop: 4 }}>
                      {analysis.keywordAnalysis.missingKeywords.slice(0, 6).map((v) => <span key={v} className="ats-tag ats-tag-warn">{v}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Formatting Checks */}
              <div className="ats-block">
                <div className="ats-block-title"><CheckSquare size={12} /> Checks</div>
                {analysis.formattingChecks.map((check) => (
                  <div key={check.id} className="ats-check-row">
                    <span className="ats-check-label">{check.label}</span>
                    <span className={`ats-check-pass ${check.passed ? "pass" : "fail"}`}>{check.passed ? "PASS" : "FIX"}</span>
                  </div>
                ))}
              </div>

              {/* Suggestions */}
              {(analysis.grammarIssues.length > 0 || analysis.rewriteSuggestions.length > 0) && (
                <div className="ats-block">
                  <div className="ats-block-title"><Edit3 size={12} /> Suggestions ({analysis.grammarIssues.length + analysis.rewriteSuggestions.length})</div>
                  {[...analysis.grammarIssues, ...analysis.rewriteSuggestions].slice(0, 3).map((item) => (
                    <div key={item.id} className="ats-issue-card">
                      <div className="ats-issue-reason">{item.reason}</div>
                      <div className="ats-issue-text">{item.suggestionText}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="ats-block">
                <div className="ats-block-title"><ClipboardList size={12} /> Summary</div>
                <div className="ats-summary-text">{analysis.summary}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useEffect, useMemo, useState } from "react";
import { queueAtsAnalysis, getAtsAnalysis, getLatestAtsAnalysis } from "@/services/api";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import type { AtsAnalysisReport, AiTone } from "@/types/resume-types";
import { Target, BarChart2, Key, CheckSquare, Edit3, ClipboardList, AlertTriangle, Activity, Loader2, Play } from "lucide-react";

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
  .ats-panel { background-color: #09090b; border-bottom: 1px solid #27272a; color: #e4e4e7; font-family: ui-sans-serif, system-ui, sans-serif; }
  .ats-header { padding: 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-bottom: 1px solid #27272a; }
  .ats-title-wrap { display: flex; flex-direction: column; gap: 4px; }
  .ats-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #f4f4f5; }
  .ats-subtitle { font-size: 12px; color: #71717a; }
  .ats-body { padding: 16px; display: grid; gap: 16px; }
  .ats-input { background: #09090b; border: 1px solid #27272a; border-radius: 6px; color: #e4e4e7; padding: 10px 12px; font-size: 12px; font-family: inherit; transition: border-color 0.15s; width: 100%; }
  .ats-input:focus { border-color: #3f3f46; outline: none; }
  .ats-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
  
  .ats-btn-analyze { display: flex; align-items: center; justify-content: center; gap: 6px; background: #2563eb; color: #ffffff; border: 1px solid #1d4ed8; border-radius: 6px; padding: 10px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; outline: none; }
  .ats-btn-analyze:hover:not(:disabled) { background: #1d4ed8; border-color: #1e40af; }
  .ats-btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }
  
  .ats-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ats-score-card { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; text-align: center; position: relative; overflow: hidden; }
  .ats-score-label { font-size: 11px; color: #a1a1aa; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .ats-score-value { font-size: 24px; font-weight: 700; color: #e4e4e7; }
  .ats-score-sub { font-size: 12px; color: #71717a; font-weight: 400; }
  
  .ats-section-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ats-section-card { background: #09090b; border: 1px solid #27272a; border-radius: 6px; padding: 12px; }
  .ats-section-name { font-size: 11px; color: #a1a1aa; font-weight: 500; text-transform: capitalize; margin-bottom: 6px; }
  .ats-section-score { font-size: 16px; font-weight: 600; color: #e4e4e7; }
  .ats-progress-bar { height: 4px; background: #27272a; border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .ats-progress-fill { height: 100%; border-radius: 2px; animation: progress 0.8s ease-out; }
  
  .ats-block { background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; }
  .ats-block-title { font-size: 12px; color: #f4f4f5; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  
  .ats-tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin: 2px 4px 2px 0; border: 1px solid; }
  .ats-tag-good { background: #14532d1a; border-color: #14532d; color: #86efac; }
  .ats-tag-warn { background: #78350f1a; border-color: #78350f; color: #fcd34d; }
  .ats-tag-neutral { background: #27272a66; border-color: #3f3f46; color: #a1a1aa; }
  
  .ats-check-row { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #18181b; border: 1px solid #27272a; border-radius: 6px; margin-bottom: 8px; }
  .ats-check-label { font-size: 12px; font-weight: 500; color: #e4e4e7; }
  .ats-check-pass { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.5px; }
  .ats-check-pass.pass { background: #14532d33; color: #86efac; }
  .ats-check-pass.fail { background: #7f1d1d33; color: #fca5a5; }
  
  .ats-issue-card { background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 12px; margin-bottom: 8px; }
  .ats-issue-reason { font-size: 12px; font-weight: 600; color: #e4e4e7; margin-bottom: 6px; }
  .ats-issue-text { font-size: 12px; color: #a1a1aa; line-height: 1.5; }
  
  .ats-summary-text { font-size: 13px; color: #a1a1aa; line-height: 1.6; }
  
  .ats-error { padding: 12px; border-radius: 6px; background: #7f1d1d1a; border: 1px solid #7f1d1d; color: #fca5a5; font-size: 12px; display: flex; align-items: center; gap: 8px; }
  
  .ats-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px; justify-content: center; font-size: 13px; color: #71717a; }
  .ats-spin { animation: spin 1s linear infinite; }
  
  .ats-toggle { display: flex; align-items: center; gap: 6px; background: #18181b; border: 1px solid #27272a; color: #a1a1aa; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .ats-toggle:hover { border-color: #3f3f46; color: #e4e4e7; }
  
  .ats-select { background: #09090b; border: 1px solid #27272a; border-radius: 6px; color: #a1a1aa; padding: 10px 12px; font-size: 12px; font-family: inherit; cursor: pointer; width: 100%; transition: border-color 0.15s; }
  .ats-select:focus { border-color: #3f3f46; outline: none; }
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
  const [showDetails, setShowDetails] = useState(true);

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

  return (
    <div className="ats-panel">
      <style>{css}</style>

      <div className="ats-header">
        <div className="ats-title-wrap">
          <div className="ats-title">
            <Activity size={14} /> ATS Analysis
          </div>
          <div className="ats-subtitle">Evaluate keyword match and readability</div>
        </div>
        <button className="ats-toggle" onClick={() => setShowDetails((v) => !v)}>{showDetails ? "Collapse" : "Expand"}</button>
      </div>

      {showDetails && (
        <div className="ats-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
            <input className="ats-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Target job title or role" />
            <select className="ats-select" value={tone} onChange={(e) => setTone(e.target.value as AiTone)}>
              {TONES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>

          <textarea className="ats-input ats-textarea" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the target job description to compute a match score..." />

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="ats-btn-analyze" onClick={() => void handleAnalyze()} disabled={isRunning}>
              {isRunning ? <Loader2 size={14} className="ats-spin" /> : <Play size={14} />} 
              {isRunning ? "Analyzing..." : "Analyze Resume"}
            </button>
            <span style={{ fontSize: 12, color: "#71717a" }}>
              {queuedJobId ? `Job ID: ${queuedJobId.slice(0, 8)}...` : lastUpdatedAt ? `Last run ${new Date(lastUpdatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "No analysis yet"}
            </span>
          </div>

          {error && (
            <div className="ats-error">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {isRunning && !analysis && (
            <div className="ats-loading">
              <Loader2 size={24} className="ats-spin" />
              <span>Running background analysis...</span>
            </div>
          )}

          {analysis && (
            <>
              {/* Score cards */}
              <div className="ats-score-grid">
                <div className="ats-score-card">
                  <div className="ats-score-label">Overall Score</div>
                  <div className="ats-score-value" style={{ color: getScoreColor(analysis.overallScore) }}>{analysis.overallScore}<span className="ats-score-sub">/100</span></div>
                  <div className="ats-progress-bar"><div className="ats-progress-fill" style={{ width: `${analysis.overallScore}%`, background: getScoreColor(analysis.overallScore) }} /></div>
                </div>
                <div className="ats-score-card">
                  <div className="ats-score-label">Role Match</div>
                  <div className="ats-score-value" style={{ color: getScoreColor(analysis.matchScore) }}>{analysis.matchScore}<span className="ats-score-sub">%</span></div>
                  <div className="ats-progress-bar"><div className="ats-progress-fill" style={{ width: `${analysis.matchScore}%`, background: getScoreColor(analysis.matchScore) }} /></div>
                </div>
                <div className="ats-score-card">
                  <div className="ats-score-label">Status</div>
                  <div className="ats-score-value" style={{ fontSize: 16, marginTop: 4, color: analysis.status === "completed" ? "#e4e4e7" : "#a1a1aa" }}>{analysis.status.toUpperCase()}</div>
                </div>
              </div>

              {/* Section scores */}
              <div className="ats-block">
                <div className="ats-block-title"><BarChart2 size={14} /> Section Analysis</div>
                <div className="ats-section-grid">
                  {Object.entries(analysis.sectionScores).map(([label, value]) => (
                    <div key={label} className="ats-section-card">
                      <div className="ats-section-name">{label}</div>
                      <div className="ats-section-score" style={{ color: getScoreColor(value as number) }}>{String(value)}</div>
                      <div className="ats-progress-bar"><div className="ats-progress-fill" style={{ width: `${value}%`, background: getScoreColor(value as number) }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
                <div className="ats-block">
                  <div className="ats-block-title"><Key size={14} /> Keyword Alignment</div>
                  <TagGroup label="Matched Keywords" values={analysis.keywordAnalysis.matchedKeywords} cls="ats-tag-good" />
                  <TagGroup label="Missing Keywords" values={analysis.keywordAnalysis.missingKeywords} cls="ats-tag-warn" />
                  <TagGroup label="Overused Keywords" values={analysis.keywordAnalysis.repeatedKeywords} cls="ats-tag-neutral" />
                  <TagGroup label="ATS Optimizations" values={analysis.keywordAnalysis.atsFriendlyKeywords} cls="ats-tag-good" />
                </div>

                <div className="ats-block">
                  <div className="ats-block-title"><CheckSquare size={14} /> Formatting Checks</div>
                  {analysis.formattingChecks.map((check) => (
                    <div key={check.id} className="ats-check-row">
                      <span className="ats-check-label">{check.label}</span>
                      <span className={`ats-check-pass ${check.passed ? "pass" : "fail"}`}>{check.passed ? "PASS" : "FIX"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grammar + rewrite */}
              {(analysis.grammarIssues.length > 0 || analysis.rewriteSuggestions.length > 0) && (
                <div className="ats-block">
                  <div className="ats-block-title"><Edit3 size={14} /> Writing Suggestions</div>
                  {analysis.grammarIssues.slice(0, 4).map((issue) => (
                    <div key={issue.id} className="ats-issue-card">
                      <div className="ats-issue-reason">{issue.reason}</div>
                      <div className="ats-issue-text">{issue.suggestionText}</div>
                    </div>
                  ))}
                  {analysis.rewriteSuggestions.slice(0, 4).map((s) => (
                    <div key={s.id} className="ats-issue-card">
                      <div className="ats-issue-reason">{s.reason}</div>
                      <div className="ats-issue-text">{s.suggestionText}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="ats-block">
                <div className="ats-block-title"><ClipboardList size={14} /> Executive Summary</div>
                <div className="ats-summary-text">{analysis.summary}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TagGroup({ label, values, cls }: { label: string; values: string[]; cls: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {values.length > 0
          ? values.map((v) => <span key={v} className={`ats-tag ${cls}`}>{v}</span>)
          : <span style={{ color: "#71717a", fontSize: 12 }}>None</span>}
      </div>
    </div>
  );
}

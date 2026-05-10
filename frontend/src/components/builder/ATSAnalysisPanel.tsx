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
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  
  .ats-panel { background: linear-gradient(180deg, #09090b 0%, #0c0c0e 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.06); color: #e4e4e7; font-family: 'Outfit', system-ui, sans-serif; animation: fadeIn 0.3s ease-out; }
  .ats-header { padding: 18px 20px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
  .ats-title-wrap { display: flex; flex-direction: column; gap: 6px; }
  .ats-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #f4f4f5; letter-spacing: 0.2px; }
  .ats-subtitle { font-size: 12px; color: #71717a; font-weight: 400; }
  
  .ats-body { padding: 20px; display: grid; gap: 20px; }
  .ats-input { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #e4e4e7; padding: 12px 14px; font-size: 13px; font-family: inherit; transition: all 0.2s ease; width: 100%; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
  .ats-input:focus { border-color: rgba(200, 245, 90, 0.4); outline: none; background: rgba(255, 255, 255, 0.04); box-shadow: 0 0 0 2px rgba(200, 245, 90, 0.1); }
  .ats-textarea { resize: vertical; min-height: 80px; line-height: 1.6; }
  
  .ats-btn-analyze { display: flex; align-items: center; justify-content: center; gap: 8px; background: #C8F55A; color: #0A0A0A; border: none; border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; outline: none; -webkit-tap-highlight-color: transparent; box-shadow: 0 4px 12px rgba(200, 245, 90, 0.15); }
  .ats-btn-analyze:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(200, 245, 90, 0.2); background: #d4fa6e; }
  .ats-btn-analyze:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
  
  .ats-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .ats-score-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 20px; text-align: center; position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); transition: transform 0.2s; }
  .ats-score-card:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.1); }
  .ats-score-label { font-size: 12px; color: #a1a1aa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
  .ats-score-value { font-size: 28px; font-weight: 700; color: #e4e4e7; line-height: 1; }
  .ats-score-sub { font-size: 14px; color: #71717a; font-weight: 500; margin-left: 2px; }
  
  .ats-section-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .ats-section-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 16px; transition: border-color 0.2s; }
  .ats-section-card:hover { border-color: rgba(255, 255, 255, 0.15); }
  .ats-section-name { font-size: 12px; color: #a1a1aa; font-weight: 600; text-transform: capitalize; margin-bottom: 8px; }
  .ats-section-score { font-size: 18px; font-weight: 700; color: #e4e4e7; }
  .ats-progress-bar { height: 6px; background: rgba(255, 255, 255, 0.05); border-radius: 3px; margin-top: 10px; overflow: hidden; }
  .ats-progress-fill { height: 100%; border-radius: 3px; animation: progress 1s cubic-bezier(0.4, 0, 0.2, 1); }
  
  .ats-block { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
  .ats-block-title { font-size: 14px; color: #f4f4f5; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); padding-bottom: 12px; }
  
  .ats-tag { display: inline-block; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; margin: 4px 6px 4px 0; border: 1px solid; transition: transform 0.15s; }
  .ats-tag:hover { transform: scale(1.02); }
  .ats-tag-good { background: rgba(22, 163, 74, 0.1); border-color: rgba(22, 163, 74, 0.2); color: #86efac; }
  .ats-tag-warn { background: rgba(217, 119, 6, 0.1); border-color: rgba(217, 119, 6, 0.2); color: #fcd34d; }
  .ats-tag-neutral { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.1); color: #a1a1aa; }
  
  .ats-check-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; margin-bottom: 10px; transition: background 0.2s; }
  .ats-check-row:hover { background: rgba(255, 255, 255, 0.04); }
  .ats-check-label { font-size: 13px; font-weight: 500; color: #e4e4e7; }
  .ats-check-pass { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px; }
  .ats-check-pass.pass { background: rgba(22, 163, 74, 0.15); color: #86efac; border: 1px solid rgba(22, 163, 74, 0.2); }
  .ats-check-pass.fail { background: rgba(220, 38, 38, 0.15); color: #fca5a5; border: 1px solid rgba(220, 38, 38, 0.2); }
  
  .ats-issue-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 14px; margin-bottom: 10px; transition: border-color 0.2s; }
  .ats-issue-card:hover { border-color: rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.03); }
  .ats-issue-reason { font-size: 13px; font-weight: 600; color: #e4e4e7; margin-bottom: 8px; }
  .ats-issue-text { font-size: 13px; color: #a1a1aa; line-height: 1.6; }
  
  .ats-summary-text { font-size: 14px; color: #a1a1aa; line-height: 1.6; }
  
  .ats-error { padding: 14px; border-radius: 8px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); color: #fca5a5; font-size: 13px; display: flex; align-items: center; gap: 10px; font-weight: 500; }
  
  .ats-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px; justify-content: center; font-size: 14px; color: #71717a; }
  .ats-spin { animation: spin 1s linear infinite; }
  
  .ats-toggle { display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: #e4e4e7; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; font-family: inherit; }
  .ats-toggle:hover { border-color: rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.06); }
  
  .ats-select { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #e4e4e7; padding: 12px 14px; font-size: 13px; font-family: inherit; cursor: pointer; width: 100%; transition: all 0.2s ease; }
  .ats-select:focus { border-color: rgba(200, 245, 90, 0.4); outline: none; box-shadow: 0 0 0 2px rgba(200, 245, 90, 0.1); }
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

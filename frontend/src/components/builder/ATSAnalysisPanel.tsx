import React, { useEffect, useMemo, useState } from "react";
import { queueAtsAnalysis, getAtsAnalysis, getLatestAtsAnalysis } from "@/services/api";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import type { AtsAnalysisReport, AiTone } from "@/types/resume-types";

const TONES: AiTone[] = ["professional", "concise", "technical", "leadership-focused"];
const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const buildSkillKeywords = (resume = useResumeBuilderStore.getState().resume) => {
  const skills = resume.sections.skills.flatMap((group) => [group.category, ...group.items]);
  return Array.from(new Set(skills.map((item) => compact(item).toLowerCase()).filter(Boolean))).slice(0, 20);
};

type Props = { expanded?: boolean };

const css = `
  @keyframes ats-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes ats-scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  @keyframes ats-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
  @keyframes ats-progress { from { width: 0; } }
  .ats-panel { background: linear-gradient(180deg, rgba(245,158,11,0.04) 0%, rgba(245,158,11,0.01) 100%); border-bottom: 1px solid #1E1E1E; }
  .ats-header { padding: 14px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #1A1A1A; }
  .ats-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 7px; background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15)); border: 1px solid rgba(245,158,11,0.3); border-radius: 20px; font-size: 11px; font-weight: 700; color: #FCD34D; letter-spacing: 0.3px; }
  .ats-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #F59E0B; box-shadow: 0 0 8px rgba(245,158,11,0.6); }
  .ats-body { padding: 14px 16px; display: grid; gap: 14px; }
  .ats-input { background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 10px; color: #E5E5E5; padding: 10px 14px; font-size: 12px; font-family: inherit; transition: border-color 0.2s; width: 100%; }
  .ats-input:focus { border-color: rgba(245,158,11,0.4); outline: none; }
  .ats-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }
  .ats-btn-analyze { background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15)); border: 1px solid rgba(245,158,11,0.35); color: #FCD34D; border-radius: 10px; padding: 10px 16px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; font-family: inherit; }
  .ats-btn-analyze:hover:not(:disabled) { background: linear-gradient(135deg, rgba(245,158,11,0.3), rgba(234,88,12,0.25)); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,158,11,0.2); }
  .ats-btn-analyze:disabled { opacity: 0.6; cursor: not-allowed; }
  .ats-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .ats-score-card { background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 12px; padding: 14px; text-align: center; animation: ats-scaleIn 0.3s ease-out; transition: border-color 0.2s; position: relative; overflow: hidden; }
  .ats-score-card:hover { border-color: rgba(245,158,11,0.25); }
  .ats-score-label { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .ats-score-value { font-size: 24px; font-weight: 800; color: #E5E5E5; }
  .ats-section-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .ats-section-card { background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 10px; padding: 10px 12px; animation: ats-fadeIn 0.3s ease-out; }
  .ats-section-name { font-size: 10px; color: #555; text-transform: capitalize; margin-bottom: 4px; }
  .ats-section-score { font-size: 16px; font-weight: 800; color: #E5E5E5; }
  .ats-progress-bar { height: 3px; background: #1A1A1A; border-radius: 2px; margin-top: 6px; overflow: hidden; }
  .ats-progress-fill { height: 100%; border-radius: 2px; animation: ats-progress 0.8s ease-out; }
  .ats-block { background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 12px; padding: 14px; animation: ats-fadeIn 0.3s ease-out; }
  .ats-block-title { font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .ats-tag { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; margin: 2px 4px 2px 0; }
  .ats-tag-good { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); color: #86EFAC; }
  .ats-tag-warn { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); color: #FBBF24; }
  .ats-tag-neutral { background: rgba(148,163,184,0.08); border: 1px solid rgba(148,163,184,0.15); color: #CBD5E1; }
  .ats-check-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #0A0A0A; border: 1px solid #1A1A1A; border-radius: 8px; margin-bottom: 6px; }
  .ats-check-label { font-size: 12px; font-weight: 600; color: #E5E5E5; }
  .ats-check-pass { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .ats-check-pass.pass { background: rgba(34,197,94,0.12); color: #86EFAC; }
  .ats-check-pass.fail { background: rgba(239,68,68,0.12); color: #FCA5A5; }
  .ats-issue-card { background: #0A0A0A; border: 1px solid #1A1A1A; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
  .ats-issue-reason { font-size: 12px; font-weight: 700; color: #E5E5E5; margin-bottom: 4px; }
  .ats-issue-text { font-size: 11px; color: #888; line-height: 1.5; }
  .ats-summary-text { font-size: 12px; color: #bbb; line-height: 1.7; }
  .ats-error { padding: 10px 14px; border-radius: 10px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #FCA5A5; font-size: 12px; display: flex; align-items: center; gap: 8px; }
  .ats-loading { display: flex; align-items: center; gap: 8px; padding: 20px; justify-content: center; font-size: 12px; color: #555; }
  .ats-loading-dot { width: 5px; height: 5px; border-radius: 50%; background: #F59E0B; animation: ats-pulse 1.2s ease-in-out infinite; }
  .ats-toggle { background: #111; border: 1px solid #252525; color: #888; border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .ats-toggle:hover { border-color: #3a3a3a; color: #bbb; }
  .ats-select { background: #0D0D0D; border: 1px solid #1E1E1E; border-radius: 10px; color: #bbb; padding: 10px 14px; font-size: 12px; font-family: inherit; cursor: pointer; }
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
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <span className="ats-badge"><span className="ats-badge-dot" />ATS Analysis</span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Deep resume scoring with keyword matching · Powered by BullMQ</div>
        </div>
        <button className="ats-toggle" onClick={() => setShowDetails((v) => !v)}>{showDetails ? "Collapse" : "Expand"}</button>
      </div>

      {showDetails && (
        <div className="ats-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <input className="ats-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Target job title or role" />
            <select className="ats-select" value={tone} onChange={(e) => setTone(e.target.value as AiTone)}>
              {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <textarea className="ats-input ats-textarea" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description to calculate match % and missing skills..." />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="ats-btn-analyze" onClick={() => void handleAnalyze()} disabled={isRunning}>
              {isRunning ? (<><span className="ats-loading-dot" /> Analyzing...</>) : (<><span style={{ fontSize: 14 }}>🎯</span> Analyze Resume</>)}
            </button>
            <span style={{ fontSize: 11, color: "#444" }}>
              {queuedJobId ? `Job ${queuedJobId.slice(0, 8)}...` : lastUpdatedAt ? `Last run ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "No analysis yet"}
            </span>
          </div>

          {error && <div className="ats-error"><span>⚠</span> {error}</div>}

          {isRunning && !analysis && (
            <div className="ats-loading">
              <span className="ats-loading-dot" /><span className="ats-loading-dot" style={{ animationDelay: "0.2s" }} /><span className="ats-loading-dot" style={{ animationDelay: "0.4s" }} />
              Processing in background...
            </div>
          )}

          {analysis && (
            <>
              {/* Score cards */}
              <div className="ats-score-grid">
                <div className="ats-score-card">
                  <div className="ats-score-label">ATS Score</div>
                  <div className="ats-score-value" style={{ color: getScoreColor(analysis.overallScore) }}>{analysis.overallScore}<span style={{ fontSize: 12, color: "#555" }}>/100</span></div>
                  <div className="ats-progress-bar"><div className="ats-progress-fill" style={{ width: `${analysis.overallScore}%`, background: getScoreColor(analysis.overallScore) }} /></div>
                </div>
                <div className="ats-score-card">
                  <div className="ats-score-label">Match</div>
                  <div className="ats-score-value" style={{ color: getScoreColor(analysis.matchScore) }}>{analysis.matchScore}<span style={{ fontSize: 12, color: "#555" }}>%</span></div>
                  <div className="ats-progress-bar"><div className="ats-progress-fill" style={{ width: `${analysis.matchScore}%`, background: getScoreColor(analysis.matchScore) }} /></div>
                </div>
                <div className="ats-score-card">
                  <div className="ats-score-label">Status</div>
                  <div className="ats-score-value" style={{ fontSize: 16, color: analysis.status === "completed" ? "#86EFAC" : "#FCA5A5" }}>{analysis.status.toUpperCase()}</div>
                </div>
              </div>

              {/* Section scores */}
              <div className="ats-block">
                <div className="ats-block-title"><span>📊</span> Section Scores</div>
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
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
                <div className="ats-block">
                  <div className="ats-block-title"><span>🔑</span> Keyword Analysis</div>
                  <TagGroup label="Matched" values={analysis.keywordAnalysis.matchedKeywords} cls="ats-tag-good" />
                  <TagGroup label="Missing" values={analysis.keywordAnalysis.missingKeywords} cls="ats-tag-warn" />
                  <TagGroup label="Repeated" values={analysis.keywordAnalysis.repeatedKeywords} cls="ats-tag-neutral" />
                  <TagGroup label="ATS-friendly" values={analysis.keywordAnalysis.atsFriendlyKeywords} cls="ats-tag-good" />
                </div>

                <div className="ats-block">
                  <div className="ats-block-title"><span>✅</span> Formatting</div>
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
                  <div className="ats-block-title"><span>✍️</span> Suggestions</div>
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
                <div className="ats-block-title"><span>📋</span> Report Summary</div>
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
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {values.length > 0
          ? values.map((v) => <span key={v} className={`ats-tag ${cls}`}>{v}</span>)
          : <span style={{ color: "#444", fontSize: 11 }}>None</span>}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { queueAtsAnalysis, getLatestAtsAnalysis } from "@/services/api";
import type { AtsAnalysisReport } from "../../../../shared/src/ai";
import { AlertCircle, BarChart3, ChevronDown, FileSearch, Lightbulb, Loader2, RefreshCw, Target } from "lucide-react";

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const css = `
  @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 1000px; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  .ats-container { font-family: 'Outfit', system-ui, sans-serif; }

  .ats-header-collapsed {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(200, 245, 90, 0.08) 0%, rgba(200, 245, 90, 0.02) 100%);
    border-bottom: 1px solid rgba(200, 245, 90, 0.1);
    cursor: pointer; transition: all 0.2s ease;
  }
  .ats-header-collapsed:hover { background: linear-gradient(135deg, rgba(200, 245, 90, 0.12) 0%, rgba(200, 245, 90, 0.04) 100%); }

  .ats-header-left { display: flex; align-items: center; gap: 10px; }
  .ats-header-icon {
    width: 28px; height: 28px;
    background: rgba(200, 245, 90, 0.15);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: #C8F55A;
  }
  .ats-header-text { display: flex; flex-direction: column; }
  .ats-header-title { font-size: 13px; font-weight: 600; color: #C8F55A; }
  .ats-header-subtitle { font-size: 11px; color: #888; }
  .ats-chevron { color: #666; transition: transform 0.2s ease; }
  .ats-chevron.open { transform: rotate(180deg); }

  .ats-panel {
    background: #0F0F0F;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: #e4e4e7;
    animation: slideDown 0.3s ease-out;
    max-height: 420px;
    overflow-y: auto;
  }
  .ats-panel::-webkit-scrollbar { width: 4px; }
  .ats-panel::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }

  .ats-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    position: sticky; top: 0; background: #0F0F0F; z-index: 10;
  }
  .ats-panel-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #C8F55A; }

  .ats-score-ring {
    width: 72px; height: 72px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    position: relative; flex-shrink: 0;
  }
  .ats-score-ring-inner {
    width: 58px; height: 58px; border-radius: 50%;
    background: #0F0F0F;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
  }
  .ats-score-value { font-size: 20px; font-weight: 800; line-height: 1; }
  .ats-score-label { font-size: 7px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }

  .ats-stat-box {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px; padding: 10px 12px; text-align: center;
  }
  .ats-stat-value { font-size: 18px; font-weight: 700; color: #F0EFE8; }
  .ats-stat-label { font-size: 9px; color: #666; font-weight: 500; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }

  .ats-section-label {
    font-size: 10px; font-weight: 600; color: #666;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 0 16px; margin: 12px 0 8px;
  }

  .ats-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px; padding: 12px;
    margin: 0 16px 8px;
  }
  .ats-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .ats-card-title { font-size: 12px; font-weight: 600; color: #C8C7C0; display: flex; align-items: center; gap: 6px; }
  .ats-card-detail { font-size: 11px; color: #888; line-height: 1.5; }

  .ats-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px;
    font-size: 10px; font-weight: 600;
  }
  .ats-tag-good { background: rgba(34, 197, 94, 0.1); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.15); }
  .ats-tag-warn { background: rgba(234, 179, 8, 0.1); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.15); }
  .ats-tag-bad { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.15); }

  .ats-empty {
    padding: 32px 16px; text-align: center; color: #666;
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

  .ats-btn-primary {
    display: flex; align-items: center; gap: 6px;
    background: #C8F55A; color: #0A0A0A;
    border: none; border-radius: 6px;
    padding: 8px 14px; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
  }
  .ats-btn-primary:hover:not(:disabled) { background: #d4fa6e; transform: translateY(-1px); }
  .ats-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .ats-btn-secondary {
    display: flex; align-items: center; gap: 6px;
    background: transparent; border: 1px solid rgba(255, 255, 255, 0.1);
    color: #888; border-radius: 6px;
    padding: 8px 12px; font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s ease;
  }
  .ats-btn-secondary:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.2); color: #aaa; }
  .ats-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

  .ats-loader-block { background: rgba(255, 255, 255, 0.03); border-radius: 4px; height: 12px; margin: 8px 0; position: relative; overflow: hidden; }
  .ats-loader-block::after {
    content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
    animation: shimmer 1.5s infinite;
  }

  .ats-progress-bar { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.05); overflow: hidden; margin: 8px 0; }
  .ats-progress-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
`;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const scoreColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
};

const scoreLabel = (score: number) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Poor";
};

/* ─── Component ──────────────────────────────────────────────────────────────── */
export function ATSAnalysisPanel() {
  const { resume } = useResumeBuilderStore();
  const [report, setReport] = useState<AtsAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAnalyze = async () => {
    if (!resume._id) {
      setError("Please save your resume first before running ATS analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await queueAtsAnalysis(resume._id, {
        jobTitle: resume.personalInfo.title || resume.title,
        reportType: "resume-analysis",
      });
      // Poll for results after a short delay
      setTimeout(async () => {
        try {
          const data = await getLatestAtsAnalysis(resume._id!);
          if (data?.analysis) {
            setReport(data.analysis);
          } else {
            setError("Analysis queued. Please try again in a moment.");
          }
        } catch {
          setError("Analysis queued. Please try again in a moment.");
        } finally {
          setLoading(false);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ATS analysis failed");
      setLoading(false);
    }
  };

  // Collapsed state
  if (!isExpanded) {
    return (
      <div className="ats-container">
        <style>{css}</style>
        <div className="ats-header-collapsed" onClick={() => setIsExpanded(true)}>
          <div className="ats-header-left">
            <div className="ats-header-icon">
              <FileSearch size={14} />
            </div>
            <div className="ats-header-text">
              <span className="ats-header-title">ATS Analysis</span>
              <span className="ats-header-subtitle">
                {report ? `Score: ${report.overallScore}/100` : "Check resume compatibility"}
              </span>
            </div>
          </div>
          <div className="ats-header-right">
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
        {/* Header */}
        <div className="ats-panel-header">
          <div className="ats-panel-title">
            <BarChart3 size={14} /> ATS Score
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="ats-chevron open" onClick={() => setIsExpanded(false)} style={{ cursor: "pointer" }}>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", flexWrap: "wrap", alignItems: "center" }}>
          <button className="ats-btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? <Loader2 size={12} className="ai-spin" /> : <Target size={12} />}
            {loading ? "Analyzing..." : "Run ATS Check"}
          </button>
          {report && (
            <button className="ats-btn-secondary" onClick={handleAnalyze} disabled={loading}>
              <RefreshCw size={12} /> Re-analyze
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && !report && (
          <div style={{ padding: "0 16px 12px" }}>
            <div className="ats-loader-block" style={{ width: "60%", height: 60, borderRadius: 8 }} />
            <div className="ats-loader-block" style={{ width: "90%" }} />
            <div className="ats-loader-block" style={{ width: "70%" }} />
            <div className="ats-loader-block" style={{ width: "80%" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: "0 16px 12px", padding: "10px 12px", borderRadius: 6, background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.2)", color: "#fca5a5", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {/* Results */}
        {report && (
          <>
            {/* Score + Stats */}
            <div style={{ display: "flex", gap: 12, padding: "12px 16px", alignItems: "center" }}>
              <div className="ats-score-ring" style={{ background: `conic-gradient(${scoreColor(report.overallScore)} 0% ${report.overallScore}%, rgba(255,255,255,0.05) ${report.overallScore}% 100%)` }}>
                <div className="ats-score-ring-inner">
                  <span className="ats-score-value" style={{ color: scoreColor(report.overallScore) }}>{report.overallScore}</span>
                  <span className="ats-score-label" style={{ color: scoreColor(report.overallScore) }}>{scoreLabel(report.overallScore)}</span>
                </div>
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{report.keywordAnalysis?.missingKeywords?.length ?? 0}</div>
                  <div className="ats-stat-label">Missing Keywords</div>
                </div>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{report.rewriteSuggestions?.length ?? 0}</div>
                  <div className="ats-stat-label">Suggestions</div>
                </div>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{report.sectionScores?.summary ?? 0}%</div>
                  <div className="ats-stat-label">Summary</div>
                </div>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{report.sectionScores?.formatting ?? 0}%</div>
                  <div className="ats-stat-label">Formatting</div>
                </div>
              </div>
            </div>

            {/* Score breakdown bar */}
            <div style={{ padding: "0 16px" }}>
              <div className="ats-progress-bar">
                <div className="ats-progress-fill" style={{ width: `${report.overallScore}%`, background: scoreColor(report.overallScore) }} />
              </div>
            </div>

            {/* Section Scores */}
            {report.sectionScores && (
              <>
                <div className="ats-section-label">
                  <BarChart3 size={11} style={{ marginRight: 4 }} /> Section Scores
                </div>
                <div style={{ padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {(Object.entries(report.sectionScores) as [string, number][]).map(([key, val]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#888", width: 80, textTransform: "capitalize" }}>{key}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                        <div style={{ width: `${val}%`, height: "100%", borderRadius: 2, background: scoreColor(val), transition: "width 0.8s ease" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#666", fontWeight: 600, width: 30, textAlign: "right" }}>{val}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Missing Keywords */}
            {report.keywordAnalysis?.missingKeywords && report.keywordAnalysis.missingKeywords.length > 0 && (
              <>
                <div className="ats-section-label">
                  <AlertCircle size={11} style={{ marginRight: 4 }} /> Missing Keywords
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 8px" }}>
                  {report.keywordAnalysis.missingKeywords.slice(0, 8).map((kw, i) => (
                    <span key={i} className="ats-tag ats-tag-bad">{kw}</span>
                  ))}
                  {report.keywordAnalysis.missingKeywords.length > 8 && (
                    <span className="ats-tag" style={{ background: "rgba(255,255,255,0.03)", color: "#555" }}>
                      +{report.keywordAnalysis.missingKeywords.length - 8} more
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Rewrite Suggestions */}
            {report.rewriteSuggestions && report.rewriteSuggestions.length > 0 && (
              <>
                <div className="ats-section-label">
                  <Lightbulb size={11} style={{ marginRight: 4 }} /> Suggestions
                </div>
                {report.rewriteSuggestions.slice(0, 3).map((s, i) => (
                  <div key={s.id || i} className="ats-card">
                    <div className="ats-card-header">
                      <div className="ats-card-title">
                        <Lightbulb size={12} style={{ color: "#eab308" }} /> {s.reason || "Suggestion"}
                      </div>
                      {s.impact && (
                        <span className={`ats-tag ${s.impact === "high" ? "ats-tag-bad" : s.impact === "medium" ? "ats-tag-warn" : "ats-tag-good"}`}>
                          {s.impact}
                        </span>
                      )}
                    </div>
                    <div className="ats-card-detail">{s.suggestionText || s.reason}</div>
                  </div>
                ))}
              </>
            )}

            {/* Bottom padding */}
            <div style={{ height: 12 }} />
          </>
        )}

        {/* Empty state */}
        {!report && !loading && (
          <div className="ats-empty">
            <div className="ats-empty-icon">
              <FileSearch size={20} />
            </div>
            <div className="ats-empty-text">
              Run an ATS analysis to see how your resume scores against applicant tracking systems.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
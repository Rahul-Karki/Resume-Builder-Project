import React, { useState, useCallback, useMemo } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { queueAtsAnalysis, getLatestAtsAnalysis, applyAtsSuggestion } from "@/services/api";
import type { AtsAnalysisReport, AtsSectionKey, AtsSectionSuggestions, AiSuggestion } from "../../../../shared/src/ai";
import type { ResumeDocument } from "@/types/resume-types";
import { AlertCircle, BarChart3, CheckCircle2, ChevronDown, FileSearch, Lightbulb, Loader2, RefreshCw, RotateCcw, Target, Wand2 } from "lucide-react";

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const css = `
  @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 1200px; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

  .ats-container { font-family: 'Outfit', system-ui, sans-serif; }

  .ats-header-collapsed {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(255,255,255, 0.08) 0%, rgba(255,255,255, 0.02) 100%);
    border-bottom: 1px solid rgba(255,255,255, 0.1);
    cursor: pointer; transition: all 0.25s ease;
  }
  .ats-header-collapsed:hover { background: linear-gradient(135deg, rgba(255,255,255, 0.12) 0%, rgba(255,255,255, 0.04) 100%); }

  .ats-header-left { display: flex; align-items: center; gap: 12px; }
  .ats-header-icon {
    width: 32px; height: 32px;
    background: rgba(255,255,255, 0.15);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: #FFFFFF;
  }
  .ats-header-text { display: flex; flex-direction: column; }
  .ats-header-title { font-size: 14px; font-weight: 600; color: #fafafa; }
  .ats-header-subtitle { font-size: 12px; color: #a1a1aa; }
  .ats-chevron { color: #a1a1aa; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .ats-chevron.open { transform: rotate(180deg); }

  .ats-panel {
    background: #18181b;
    border-bottom: 1px solid #3f3f46;
    color: #d4d4d8;
    animation: slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    max-height: min(85vh, 520px);
    overflow-y: auto;
  }
  .ats-panel::-webkit-scrollbar { width: 4px; }
  .ats-panel::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }

  .ats-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    position: sticky; top: 0; background: #18181b; z-index: 10;
  }
  .ats-panel-title { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; color: #fafafa; }

  .ats-score-ring {
    width: 80px; height: 80px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    position: relative; flex-shrink: 0;
  }
  .ats-score-ring-inner {
    width: 64px; height: 64px; border-radius: 50%;
    background: #18181b;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column;
  }
  .ats-score-value { font-size: 22px; font-weight: 800; line-height: 1; }
  .ats-score-label { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  .ats-stat-box {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid #3f3f46;
    border-radius: 10px; padding: 12px 14px; text-align: center;
    transition: all 0.2s ease;
  }
  .ats-stat-box:hover { background: rgba(255, 255, 255, 0.04); border-color: #71717a; }
  .ats-stat-value { font-size: 20px; font-weight: 700; color: #fafafa; }
  .ats-stat-label { font-size: 10px; color: #a1a1aa; font-weight: 500; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.3px; }

  .ats-section-label {
    font-size: 11px; font-weight: 600; color: #a1a1aa;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 0 18px; margin: 14px 0 10px;
  }

  .ats-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid #3f3f46;
    border-radius: 10px; padding: 14px;
    margin: 0 18px 10px;
    transition: all 0.2s ease;
  }
  .ats-card:hover { background: rgba(255, 255, 255, 0.03); border-color: #71717a; }
  .ats-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
  .ats-card-title { font-size: 13px; font-weight: 600; color: #fafafa; display: flex; align-items: center; gap: 8px; }
  .ats-card-detail { font-size: 12px; color: #d4d4d8; line-height: 1.6; }

  .ats-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 10px; border-radius: 6px;
    font-size: 11px; font-weight: 600;
    transition: all 0.15s ease;
  }
  .ats-tag-good { background: rgba(34, 197, 94, 0.1); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.15); }
  .ats-tag-warn { background: rgba(234, 179, 8, 0.1); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.15); }
  .ats-tag-bad { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.15); }

  .ats-empty {
    padding: 40px 18px; text-align: center; color: #a1a1aa;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .ats-empty-icon {
    width: 48px; height: 48px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    color: #71717a;
  }
  .ats-empty-text { font-size: 13px; line-height: 1.6; max-width: 260px; color: #a1a1aa; }

  .ats-btn-primary {
    display: flex; align-items: center; gap: 8px;
    background: #FFFFFF; color: #0A0A0A;
    border: none; border-radius: 8px;
    padding: 10px 16px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease;
  }
  .ats-btn-primary:hover:not(:disabled) { background: #d4fa6e; transform: translateY(-1px); }
  .ats-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .ats-btn-secondary {
    display: flex; align-items: center; gap: 8px;
    background: transparent; border: 1px solid #3f3f46;
    color: #a1a1aa; border-radius: 8px;
    padding: 10px 14px; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: all 0.2s ease;
  }
  .ats-btn-secondary:hover:not(:disabled) { border-color: #71717a; color: #d4d4d8; }
  .ats-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

  .ats-btn-apply {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 6px;
    font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease;
    border: none;
  }
  .ats-btn-apply-ready { background: #22c55e; color: #fff; }
  .ats-btn-apply-ready:hover { background: #16a34a; transform: translateY(-1px); }
  .ats-btn-apply-ready:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .ats-btn-apply-applied { background: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.3); cursor: default; }
  .ats-btn-apply-rollback {
    background: transparent; border: 1px solid #3f3f46; color: #a1a1aa;
  }
  .ats-btn-apply-rollback:hover { border-color: #ef4444; color: #fca5a5; }

  .ats-loader-block { background: rgba(255, 255, 255, 0.03); border-radius: 6px; height: 14px; margin: 10px 0; position: relative; overflow: hidden; }
  .ats-loader-block::after {
    content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
    animation: shimmer 1.5s infinite;
  }

  .ats-progress-bar { height: 8px; border-radius: 4px; background: #27272a; overflow: hidden; margin: 10px 0; }
  .ats-progress-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }

  .ats-score-delta { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
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

const sectionStarCount = (score: number) => Math.max(1, Math.min(5, Math.round(score / 20)));

const renderStars = (score: number) => {
  const filled = sectionStarCount(score);
  return Array.from({ length: 5 }, (_, index) => (
    <span key={index} style={{ color: index < filled ? "#fde047" : "#3f3f46", fontSize: 12 }}>★</span>
  ));
};

const SECTION_LABELS: Record<AtsSectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
};

const getSectionSuggestions = (report: AtsAnalysisReport | null): AtsSectionSuggestions => {
  const structured = report?.perSectionSuggestions ?? {};
  const hasStructured = Object.values(structured).some((items) => Array.isArray(items) && items.length > 0);
  if (hasStructured) return structured as AtsSectionSuggestions;

  const grouped: AtsSectionSuggestions = {};
  (report?.rewriteSuggestions ?? []).forEach((suggestion) => {
    const path = suggestion.path ?? "";
    const section: AtsSectionKey = path.startsWith("personalInfo.summary") ? "summary"
      : path.startsWith("sections.experience") ? "experience"
      : path.startsWith("sections.skills") ? "skills"
      : path.startsWith("sections.education") ? "education"
      : path.startsWith("sections.projects") ? "projects"
      : path.startsWith("sections.certifications") ? "certifications"
      : path.startsWith("sections.languages") ? "languages"
      : "experience";
    const next = grouped[section] ?? [];
    next.push({ ...suggestion, id: suggestion.id || `${section}-${next.length}` });
    grouped[section] = next;
  });
  return grouped;
};

/* ─── Component ──────────────────────────────────────────────────────────────── */
export function ATSAnalysisPanel() {
  const { resume } = useResumeBuilderStore();
  const [report, setReport] = useState<AtsAnalysisReport | null>(null);
  const [analysisDocId, setAnalysisDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<Record<string, "pending" | "applied">>({});

  const sectionSuggestions = getSectionSuggestions(report);
  const allSuggestions = useMemo(() => Object.values(sectionSuggestions).flat(), [sectionSuggestions]);
  const appliedCount = Object.values(suggestionStatus).filter((s) => s === "applied").length;
  const totalScoreDelta = useMemo(() =>
    allSuggestions
      .filter((s) => suggestionStatus[s.id] === "applied")
      .reduce((sum, s) => sum + (s.scoreDelta ?? 0), 0),
    [allSuggestions, suggestionStatus]
  );
  const adjustedScore = report ? Math.min(100, report.overallScore + totalScoreDelta) : 0;
  const pendingSuggestions = allSuggestions.filter((s) => suggestionStatus[s.id] !== "applied");

  const keywordGaps = (report?.keywordGaps ?? report?.keywordAnalysis?.missingKeywords?.map((k: any) => typeof k === "string" ? k : k.keyword) ?? []).slice(0, 3);
  const quickWins = report?.quickWins ?? [];
  const actionPlan = report?.actionPlan ?? [];
  const sectionAudit = report?.sectionAudit ?? [];
  const estimatedScoreAfterFixes = report?.estimatedScoreAfterFixes;
  const questionsForUser = report?.questionsForUser ?? [];

  const handleAnalyze = useCallback(async () => {
    if (!resume._id) { setError("Please save your resume first."); return; }
    setLoading(true); setError(null);
    try {
      await queueAtsAnalysis(resume._id, {
        jobTitle: resume.personalInfo.title || resume.title,
        reportType: "resume-analysis",
      });
      setTimeout(async () => {
        try {
          const data = await getLatestAtsAnalysis(resume._id!);
          const analysis = data?.analysis as any;
          if (analysis) {
            setReport(analysis);
            setAnalysisDocId(analysis._id ?? null);
            setSuggestionStatus({});
          } else setError("Analysis queued. Please try again.");
        } catch { setError("Analysis queued. Please try again."); }
        finally { setLoading(false); }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ATS analysis failed");
      setLoading(false);
    }
  }, [resume._id, resume.personalInfo.title, resume.title]);

  const handleApplySuggestion = useCallback(async (suggestion: AiSuggestion) => {
    if (!resume._id || !analysisDocId || !suggestion.id) return;
    setApplyingIds((prev) => new Set(prev).add(suggestion.id));
    try {
      const result = await applyAtsSuggestion(resume._id, analysisDocId, suggestion.id);
      if (result?.resume) useResumeBuilderStore.setState({ resume: result.resume as ResumeDocument });
      setSuggestionStatus((prev) => ({ ...prev, [suggestion.id]: "applied" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggestion");
    } finally {
      setApplyingIds((prev) => { const next = new Set(prev); next.delete(suggestion.id); return next; });
    }
  }, [resume._id, analysisDocId]);

  const handleApplyAll = useCallback(async () => {
    for (const s of pendingSuggestions) {
      if (suggestionStatus[s.id] === "applied") continue;
      await handleApplySuggestion(s);
    }
  }, [pendingSuggestions, suggestionStatus, handleApplySuggestion]);

  const savedAtsScore = report?.overallScore ?? resume.atsScore ?? null;

  // Collapsed state
  if (!isExpanded) {
    return (
      <div className="ats-container">
        <style>{css}</style>
        <div className="ats-header-collapsed" onClick={() => setIsExpanded(true)}>
          <div className="ats-header-left">
            <div className="ats-header-icon"><FileSearch size={16} /></div>
            <div className="ats-header-text">
              <span className="ats-header-title">ATS Analysis</span>
              <span className="ats-header-subtitle">
                {savedAtsScore !== null ? `Score: ${savedAtsScore}/100` : "Check resume compatibility"}
              </span>
            </div>
          </div>
          <div className="ats-header-right"><ChevronDown size={18} className="ats-chevron" /></div>
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
          <div className="ats-panel-title"><BarChart3 size={16} /> ATS Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="ats-chevron open" onClick={() => setIsExpanded(false)} style={{ cursor: "pointer" }}>
              <ChevronDown size={18} />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, padding: "14px 18px", flexWrap: "wrap", alignItems: "center" }}>
          <button className="ats-btn-primary" onClick={handleAnalyze} disabled={loading}>
            {loading ? <Loader2 size={14} className="ai-spin" /> : <Target size={14} />}
            {loading ? "Analyzing..." : "Run ATS Check"}
          </button>
          {report && <button className="ats-btn-secondary" onClick={handleAnalyze} disabled={loading}><RefreshCw size={14} /> Re-analyze</button>}
          {pendingSuggestions.length > 0 && (
            <button className="ats-btn-secondary" onClick={handleApplyAll} disabled={applyingIds.size > 0}
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac" }}>
              <Wand2 size={14} /> Apply All ({pendingSuggestions.length})
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && !report && (
          <div style={{ padding: "0 18px 14px" }}>
            <div className="ats-loader-block" style={{ width: "60%", height: 68, borderRadius: 10 }} />
            <div className="ats-loader-block" style={{ width: "90%" }} />
            <div className="ats-loader-block" style={{ width: "70%" }} />
            <div className="ats-loader-block" style={{ width: "80%" }} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: "0 18px 14px", padding: "12px 14px", borderRadius: 8, background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.2)", color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Results */}
        {report && (
          <>
            {/* Score + Stats */}
            <div style={{ display: "flex", gap: 16, padding: "14px 18px", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <div className="ats-score-ring" style={{ background: `conic-gradient(${scoreColor(adjustedScore)} 0% ${adjustedScore}%, rgba(255,255,255,0.05) ${adjustedScore}% 100%)` }}>
                  <div className="ats-score-ring-inner">
                    <span className="ats-score-value" style={{ color: scoreColor(adjustedScore) }}>{adjustedScore}</span>
                    <span className="ats-score-label" style={{ color: scoreColor(adjustedScore) }}>{scoreLabel(adjustedScore)}</span>
                  </div>
                </div>
                {totalScoreDelta > 0 && (
                  <div style={{ position: "absolute", top: -6, right: -6, background: "#22c55e", color: "#fff", borderRadius: 10, padding: "2px 6px", fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>
                    +{totalScoreDelta}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {typeof report.previousOverallScore === 'number' && (
                  <div style={{ color: '#a1a1aa', fontSize: 11 }}>
                    Previous: <span style={{ color: '#fafafa', fontWeight: 700 }}>{report.previousOverallScore}</span>
                  </div>
                )}
                <div style={{ color: report.overallScore >= (report.previousOverallScore ?? 0) ? '#86efac' : '#fca5a5', fontSize: 11 }}>
                  {report.previousOverallScore !== undefined ? `${report.overallScore - report.previousOverallScore >= 0 ? '+' : ''}${report.overallScore - report.previousOverallScore}` : ''} from base
                </div>
                {appliedCount > 0 && (
                  <div style={{ color: "#86efac", fontSize: 11, fontWeight: 600 }}>{appliedCount} suggestions applied</div>
                )}
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{report.keywordAnalysis?.missingKeywords?.length ?? 0}</div>
                  <div className="ats-stat-label">Missing Keywords</div>
                </div>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{allSuggestions.length}</div>
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

            {/* Projected Score */}
            {estimatedScoreAfterFixes && (
              <div style={{ padding: "0 18px 10px", display: "flex", justifyContent: "space-between", gap: 12, color: "#a1a1aa", fontSize: 12 }}>
                <div>Projected after fixes: <span style={{ color: scoreColor(estimatedScoreAfterFixes), fontWeight: 700 }}>{estimatedScoreAfterFixes}</span></div>
                <div>Grade: <span style={{ color: "#fafafa", fontWeight: 700 }}>{report.grade ?? scoreLabel(report.overallScore).toLowerCase()}</span></div>
              </div>
            )}

            {/* Quick Wins */}
            {quickWins.length > 0 && (
              <>
                <div className="ats-section-label"><Lightbulb size={13} style={{ marginRight: 6 }} /> Quick Wins</div>
                <div style={{ padding: "0 18px 8px", display: "grid", gap: 8 }}>
                  {quickWins.slice(0, 3).map((item, index) => (
                    <div key={`qw-${index}`} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #eab308" }}>
                      <div className="ats-card-detail" style={{ color: "#fafafa" }}>{item}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Action Plan */}
            {actionPlan.length > 0 && (
              <>
                <div className="ats-section-label"><Target size={13} style={{ marginRight: 6 }} /> Action Plan</div>
                <div style={{ padding: "0 18px 8px", display: "grid", gap: 8 }}>
                  {actionPlan.slice(0, 3).map((item, index) => (
                    <div key={`ap-${index}`} className="ats-card" style={{ margin: 0 }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title">{item.priority} {item.action}</div>
                        <span className={`ats-tag ${item.priority === "P0" ? "ats-tag-bad" : item.priority === "P1" ? "ats-tag-warn" : "ats-tag-good"}`}>
                          {item.expectedScoreGain > 0 ? `+${item.expectedScoreGain}` : "Fix"}
                        </span>
                      </div>
                      <div className="ats-card-detail">{item.whyItIncreasesScore}</div>
                      {item.howToDo.length > 0 && (
                        <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#a1a1aa", fontSize: 12, lineHeight: 1.6 }}>
                          {item.howToDo.slice(0, 3).map((step, si) => <li key={`${index}-${si}`}>{step}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Suggestions with Apply buttons */}
            {Object.entries(sectionSuggestions).filter(([, s]) => s?.length > 0).map(([section, suggestions]) => (
              <div key={section}>
                <div className="ats-section-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{SECTION_LABELS[section as AtsSectionKey] ?? section}</span>
                  <span style={{ fontSize: 10, color: "#71717a", fontWeight: 400 }}>
                    {suggestions.filter((s) => suggestionStatus[s.id] === "applied").length}/{suggestions.length} applied
                  </span>
                </div>
                {suggestions.map((s) => {
                  const status = suggestionStatus[s.id] ?? "pending";
                  const isApplying = applyingIds.has(s.id);
                  const scoreDelta = s.scoreDelta ?? (
                    s.atsImpact ? parseInt(s.atsImpact) || 0 : s.impact === "high" ? 8 : s.impact === "medium" ? 4 : 2
                  );
                  return (
                    <div key={s.id} className="ats-card" style={{
                      margin: "0 18px 10px",
                      borderColor: status === "applied" ? "rgba(34,197,94,0.3)" : "#3f3f46",
                      opacity: isApplying ? 0.6 : 1,
                    }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ flex: 1 }}>
                          <Lightbulb size={14} style={{ color: status === "applied" ? "#22c55e" : "#eab308" }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: status === "applied" ? "#86efac" : "#d4d4d8" }}>
                            {s.reason || "Improvement suggestion"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="ats-score-delta" style={{
                            background: status === "applied" ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)",
                            color: status === "applied" ? "#86efac" : "#4ade80",
                          }}>
                            +{scoreDelta} pts
                          </span>
                          {status === "applied" ? (
                            <button className="ats-btn-apply ats-btn-apply-applied" disabled>
                              <CheckCircle2 size={12} /> Applied
                            </button>
                          ) : (
                            <button
                              className="ats-btn-apply ats-btn-apply-ready"
                              onClick={() => handleApplySuggestion(s)}
                              disabled={isApplying}
                            >
                              {isApplying ? <Loader2 size={12} className="ai-spin" /> : <Wand2 size={12} />}
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                      {s.originalText && (
                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Before</div>
                            <div className="ats-card-detail" style={{ fontSize: 11, background: "rgba(239,68,68,0.04)", padding: 8, borderRadius: 6, border: "1px solid rgba(239,68,68,0.1)" }}>
                              {s.originalText}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>After</div>
                            <div className="ats-card-detail" style={{ fontSize: 11, color: "#fafafa", background: "rgba(34,197,94,0.04)", padding: 8, borderRadius: 6, border: "1px solid rgba(34,197,94,0.1)" }}>
                              {s.suggestionText}
                            </div>
                          </div>
                        </div>
                      )}
                      {!s.originalText && s.suggestionText && (
                        <div className="ats-card-detail" style={{ marginTop: 8 }}>{s.suggestionText}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Section Scores */}
            {report.sectionScores && (
              <>
                <div className="ats-section-label"><BarChart3 size={13} style={{ marginRight: 6 }} /> Section Scores</div>
                <div style={{ padding: "0 18px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {(Object.entries(report.sectionScores) as [string, number][]).map(([key, val]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "#a1a1aa", width: 90, textTransform: "capitalize", fontWeight: 500 }}>{key}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#27272a", overflow: "hidden" }}>
                        <div style={{ width: `${val}%`, height: "100%", borderRadius: 3, background: scoreColor(val), transition: "width 0.8s ease" }} />
                      </div>
                      <div style={{ width: 64, display: "flex", justifyContent: "flex-end", gap: 1 }}>{renderStars(val)}</div>
                      <span style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 600, width: 34, textAlign: "right" }}>{val}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Progress bar */}
            <div style={{ padding: "0 18px" }}>
              <div className="ats-progress-bar">
                <div className="ats-progress-fill" style={{ width: `${adjustedScore}%`, background: scoreColor(adjustedScore) }} />
              </div>
            </div>

            {/* Verdict */}
            <div className="ats-section-label"><Lightbulb size={13} style={{ marginRight: 6 }} /> Verdict</div>
            <div className="ats-card">
              <div className="ats-card-detail" style={{ color: "#fafafa" }}>{report.verdict || report.summary}</div>
            </div>

            {/* Missing Keywords */}
            {report.keywordAnalysis?.missingKeywords && report.keywordAnalysis.missingKeywords.length > 0 && (
              <>
                <div className="ats-section-label"><AlertCircle size={13} style={{ marginRight: 6 }} /> Missing Keywords</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 18px 10px" }}>
                  {report.keywordAnalysis.missingKeywords.slice(0, 8).map((kw, i) => (
                    <span key={i} className="ats-tag ats-tag-bad" title={typeof kw === "string" ? "" : kw.reason}>
                      {typeof kw === "string" ? kw : kw.keyword}
                    </span>
                  ))}
                  {report.keywordAnalysis.missingKeywords.length > 8 && (
                    <span className="ats-tag" style={{ background: "rgba(255,255,255,0.03)", color: "#555" }}>
                      +{report.keywordAnalysis.missingKeywords.length - 8} more
                    </span>
                  )}
                </div>
              </>
            )}

            <div style={{ height: 16 }} />
          </>
        )}

        {/* Empty state */}
        {!report && !loading && (
          <div className="ats-empty">
            <div className="ats-empty-icon"><FileSearch size={24} /></div>
            <div className="ats-empty-text">
              Run an ATS analysis to see how your resume scores against applicant tracking systems.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

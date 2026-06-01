import React, { useState, useCallback } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { queueAtsAnalysis, getLatestAtsAnalysis } from "@/services/api";
import type { AtsAnalysisReport, AtsSectionKey, AtsSectionSuggestions } from "../../../../shared/src/ai";
import { AlertCircle, BarChart3, ChevronDown, FileSearch, Lightbulb, Loader2, RefreshCw, Target, Bug, Activity, Award, BookOpen, Code2, Flag, Hash, MessageSquare, Shield, Sparkles, Star, TrendingUp, ListChecks, ThumbsUp } from "lucide-react";

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
  .ats-tag-info { background: rgba(59, 130, 246, 0.1); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.15); }

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

  .ats-loader-block { background: rgba(255, 255, 255, 0.05); border-radius: 6px; height: 14px; margin: 10px 0; position: relative; overflow: hidden; }
  .ats-loader-block::after {
    content: ""; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.09), transparent);
    animation: shimmer 1.4s ease-in-out infinite;
  }

  .ats-progress-bar { height: 8px; border-radius: 4px; background: #27272a; overflow: hidden; margin: 10px 0; }
  .ats-progress-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }

  .ats-mini-progress { height: 4px; border-radius: 2px; background: #27272a; overflow: hidden; margin: 4px 0; }
  .ats-mini-progress-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

  .ats-status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
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

/* ─── Severity/effort helpers ─────────────────────────────────────────────────── */
const severityColor = (sev: string) =>
  sev === "critical" ? "#ef4444" : sev === "warning" ? "#eab308" : "#3b82f6";
const severityTagClass = (sev: string) =>
  sev === "critical" ? "ats-tag-bad" : sev === "warning" ? "ats-tag-warn" : "ats-tag-info";
const effortTagClass = (effort: string) =>
  effort === "low" ? "ats-tag-good" : effort === "medium" ? "ats-tag-warn" : "ats-tag-bad";

/* ─── Component ──────────────────────────────────────────────────────────────── */
export function ATSAnalysisPanel() {
  const { resume } = useResumeBuilderStore();
  const [report, setReport] = useState<AtsAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const sectionSuggestions = getSectionSuggestions(report);
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
      const result = await queueAtsAnalysis(resume._id, {
        jobTitle: resume.personalInfo.title || resume.title,
        reportType: "resume-analysis",
      });
      const analysis = (result as any)?.analysis ?? null;
      if (analysis && analysis.overallScore != null) {
        setReport(analysis);
        setLoading(false);
        return;
      }
      let pollAttempts = 0;
      const poll = async (): Promise<void> => {
        if (pollAttempts >= 15) { setLoading(false); setError("Analysis timed out. Please try again."); return; }
        pollAttempts++;
        try {
          const data = await getLatestAtsAnalysis(resume._id!);
          const a = data?.analysis as any;
          if (a && a.overallScore != null && a.rewriteSuggestions?.length > 0) {
            setReport(a);
            setLoading(false);
            return;
          }
        } catch { /* continue polling */ }
        setTimeout(poll, 1500);
      };
      setTimeout(poll, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ATS analysis failed");
      setLoading(false);
    }
  }, [resume._id, resume.personalInfo.title, resume.title]);

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

  const os = report?.overallScore ?? 0;

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
        </div>

        {/* Loading skeleton — realistic preview of results */}
        {loading && !report && (
          <div style={{ padding: "0 18px 14px" }}>
            <div style={{ display: "flex", gap: 16, padding: "14px 0", alignItems: "center" }}>
              <div className="ats-loader-block" style={{ width: 80, height: 80, borderRadius: "50%" }} />
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="ats-loader-block" style={{ height: 48, borderRadius: 10 }} />
                <div className="ats-loader-block" style={{ height: 48, borderRadius: 10 }} />
                <div className="ats-loader-block" style={{ height: 48, borderRadius: 10 }} />
                <div className="ats-loader-block" style={{ height: 48, borderRadius: 10 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, margin: "6px 0 14px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="ats-loader-block" style={{ flex: 1, height: 44, borderRadius: 8 }} />
              ))}
            </div>
            <div className="ats-loader-block" style={{ width: "40%", height: 12, borderRadius: 6, marginBottom: 10 }} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="ats-card" style={{ margin: "0 0 10px" }}>
                <div className="ats-loader-block" style={{ width: "50%", height: 12, borderRadius: 6 }} />
                <div className="ats-loader-block" style={{ width: "90%", height: 10, borderRadius: 6, marginTop: 8 }} />
                <div className="ats-loader-block" style={{ width: "70%", height: 10, borderRadius: 6, marginTop: 6 }} />
              </div>
            ))}
            <div className="ats-loader-block" style={{ width: "100%", height: 8, borderRadius: 4, marginTop: 8 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <div className="ats-loader-block" style={{ width: 24, height: 24, borderRadius: "50%" }} />
              <div className="ats-loader-block" style={{ width: "60%", height: 12, borderRadius: 6 }} />
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <div className="ats-loader-block" style={{ width: "40%", height: 10, borderRadius: 6, margin: "0 auto" }} />
            </div>
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
                <div className="ats-score-ring" style={{ background: `conic-gradient(${scoreColor(os)} 0% ${os}%, rgba(255,255,255,0.05) ${os}% 100%)` }}>
                  <div className="ats-score-ring-inner">
                    <span className="ats-score-value" style={{ color: scoreColor(os) }}>{os}</span>
                    <span className="ats-score-label" style={{ color: scoreColor(os) }}>{scoreLabel(os)}</span>
                  </div>
                </div>
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
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{report.keywordAnalysis?.missingKeywords?.length ?? 0}</div>
                  <div className="ats-stat-label">Missing Keywords</div>
                </div>
                <div className="ats-stat-box">
                  <div className="ats-stat-value">{Object.values(sectionSuggestions).flat().length}</div>
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

            {/* AI Source Indicator */}
            <div style={{ padding: "0 18px 10px" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: report.aiUsed
                  ? (report.isOptimizedPrompt ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)")
                  : "rgba(113,113,122,0.1)",
                border: `1px solid ${report.aiUsed ? (report.isOptimizedPrompt ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)") : "rgba(113,113,122,0.2)"}`,
                color: report.aiUsed ? (report.isOptimizedPrompt ? "#86efac" : "#fde047") : "#a1a1aa",
              }}>
                {report.aiUsed ? (
                  report.isOptimizedPrompt ? (
                    <>AI-powered with optimized prompt · Best results</>
                  ) : (
                    <>AI-powered with generic prompt · Install optimized prompt file for better accuracy</>
                  )
                ) : (
                  report.isOptimizedPrompt ? (
                    <>Optimized prompt available but AI unavailable · Check API key configuration</>
                  ) : (
                    <>Rule-based analysis · No AI configured</>
                  )
                )}
              </div>
            </div>

            {/* Category Scores (v2 format) */}
            {report.categoryScores && (
              <div style={{ padding: "0 18px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Keywords", key: "keywordMatch" as const },
                  { label: "Parsing", key: "parsing" as const },
                  { label: "Content", key: "contentQuality" as const },
                  { label: "Relevance", key: "experienceRelevance" as const },
                  { label: "Format", key: "formatting" as const },
                ].map((cat) => {
                  const val = report.categoryScores![cat.key] ?? 0;
                  return (
                    <div key={cat.key} style={{ flex: 1, minWidth: 80, background: "rgba(255,255,255,0.02)", border: "1px solid #3f3f46", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(val) }}>{val}</div>
                      <div style={{ fontSize: 9, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.3px", marginTop: 2 }}>{cat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}

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

            {/* Priority Fixes (v2 object format) */}
            {Array.isArray(report.priorityFixes) && report.priorityFixes.length > 0 && typeof report.priorityFixes[0] === "object" && (
              <>
                <div className="ats-section-label"><Target size={13} style={{ marginRight: 6 }} /> Priority Fixes</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 10px" }}>
                  {(report.priorityFixes as any[]).slice(0, 5).map((fix, i) => (
                    <div key={`pf-${i}`} className="ats-card" style={{ margin: 0, borderLeft: `3px solid ${fix.priority <= 2 ? "#ef4444" : fix.priority <= 4 ? "#eab308" : "#3b82f6"}` }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>#{fix.priority}: {fix.issue}</div>
                        {fix.expectedScoreIncrease > 0 && (
                          <span className="ats-tag ats-tag-good" style={{ fontSize: 10 }}>+{fix.expectedScoreIncrease} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Suggestions (read-only) */}
            {Object.entries(sectionSuggestions).filter(([, s]) => s?.length > 0).map(([section, suggestions]) => (
              <div key={section}>
                <div className="ats-section-label">
                  <span>{SECTION_LABELS[section as AtsSectionKey] ?? section} ({suggestions.length})</span>
                </div>
                {suggestions.map((s) => (
                  <div key={s.id} className="ats-card" style={{ margin: "0 18px 10px" }}>
                    <div className="ats-card-header">
                      <div className="ats-card-title" style={{ flex: 1 }}>
                        <Lightbulb size={14} style={{ color: "#eab308" }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{s.reason || "Improvement suggestion"}</span>
                      </div>
                    </div>
                    {s.originalText && s.suggestionText && (
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
                ))}
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

            {/* Section Analysis (v2) */}
            {report.sectionAnalysis && report.sectionAnalysis.length > 0 && (
              <>
                <div className="ats-section-label"><BarChart3 size={13} style={{ marginRight: 6 }} /> Section Analysis</div>
                <div style={{ padding: "0 18px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {report.sectionAnalysis.slice(0, 6).map((sa, i) => (
                    <div key={i} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #3b82f6" }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12, textTransform: "capitalize" }}>{sa.section.replace("_", " ")}</div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(sa.score) }}>{sa.score}/100</span>
                      </div>
                      {sa.issues.length > 0 && (
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16, color: "#fca5a5", fontSize: 11, lineHeight: 1.6 }}>
                          {sa.issues.slice(0, 3).map((issue, ii) => <li key={ii}>{issue}</li>)}
                        </ul>
                      )}
                      {sa.recommendations.length > 0 && (
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16, color: "#86efac", fontSize: 11, lineHeight: 1.6 }}>
                          {sa.recommendations.slice(0, 3).map((rec, ri) => <li key={ri}>{rec}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Progress bar */}
            <div style={{ padding: "0 18px" }}>
              <div className="ats-progress-bar">
                <div className="ats-progress-fill" style={{ width: `${os}%`, background: scoreColor(os) }} />
              </div>
            </div>

            {/* Verdict */}
            <div className="ats-section-label"><Lightbulb size={13} style={{ marginRight: 6 }} /> Verdict</div>
            <div className="ats-card">
              <div className="ats-card-detail" style={{ color: "#fafafa" }}>{report.verdict || report.summary}</div>
            </div>

            {/* Missing Keywords (read-only) */}
            {report.keywordAnalysis?.missingKeywords && report.keywordAnalysis.missingKeywords.length > 0 && (
              <>
                <div className="ats-section-label"><AlertCircle size={13} style={{ marginRight: 6 }} /> Missing Keywords</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 18px 10px" }}>
                  {report.keywordAnalysis.missingKeywords.slice(0, 8).map((kw, i) => {
                    const keyword = typeof kw === "string" ? kw : kw.keyword;
                    const importance = typeof kw === "string" ? undefined : kw.importance;
                    const reason = typeof kw === "string" ? "" : kw.reason;
                    const placement = report.keywordPlacement?.find((kp) => kp.keyword.toLowerCase() === keyword.toLowerCase());
                    return (
                      <div key={i} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #ef4444" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span className="ats-card-title" style={{ fontSize: 13 }}>
                            <span className="ats-tag ats-tag-bad" style={{ fontSize: 12 }}>{keyword}</span>
                          </span>
                          {importance && (
                            <span className={`ats-tag ${importance === "critical" ? "ats-tag-bad" : importance === "important" ? "ats-tag-warn" : "ats-tag-info"}`} style={{ fontSize: 10 }}>
                              {importance}
                            </span>
                          )}
                        </div>
                        {reason && <div className="ats-card-detail" style={{ marginBottom: 6, color: "#a1a1aa" }}>{reason}</div>}
                        {placement && (
                          <>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                              {placement.placeIn.map((section) => (
                                <span key={section} className="ats-tag" style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.15)", fontSize: 10 }}>
                                  {section}
                                </span>
                              ))}
                            </div>
                            {placement.exampleUsage && (
                              <div style={{ fontSize: 11, color: "#d4d4d8", background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 6, border: "1px solid #3f3f46", fontStyle: "italic" }}>
                                "{placement.exampleUsage}"
                              </div>
                            )}
                          </>
                        )}
                        {!placement && (
                          <div className="ats-card-detail" style={{ color: "#71717a", fontSize: 11 }}>
                            Consider adding to skills or experience section
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {report.keywordAnalysis.missingKeywords.length > 8 && (
                    <div style={{ textAlign: "center", color: "#71717a", fontSize: 11, padding: 4 }}>
                      +{report.keywordAnalysis.missingKeywords.length - 8} more keywords
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Formatting Fixes */}
            {((report.formattingFixes && report.formattingFixes.length > 0) || (report.formattingChecks && report.formattingChecks.some((c) => !c.passed))) && (
              <>
                <div className="ats-section-label"><FileSearch size={13} style={{ marginRight: 6 }} /> Formatting Fixes</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 10px" }}>
                  {(report.formattingFixes ?? []).slice(0, 5).map((fix) => (
                    <div key={fix.id} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #eab308" }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>{fix.issue}</div>
                        {fix.expectedImpact && (
                          <span className="ats-tag ats-tag-warn" style={{ fontSize: 10 }}>{fix.expectedImpact}</span>
                        )}
                      </div>
                      <div className="ats-card-detail" style={{ color: "#fafafa", marginBottom: fix.codeExample ? 6 : 0 }}>{fix.fix}</div>
                      {fix.codeExample && (
                        <div style={{ fontSize: 11, color: "#d4d4d8", background: "rgba(0,0,0,0.2)", padding: "8px 10px", borderRadius: 6, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                          {fix.codeExample}
                        </div>
                      )}
                    </div>
                  ))}
                  {report.formattingChecks?.filter((c) => !c.passed).slice(0, 3).map((check) => (
                    <div key={check.id} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #eab308" }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>
                          <span className="ats-tag ats-tag-bad" style={{ fontSize: 10, marginRight: 6 }}>Fix</span>
                          {check.label}
                        </div>
                        <span style={{ fontSize: 11, color: "#fca5a5", fontWeight: 600 }}>{check.score}/100</span>
                      </div>
                      <div className="ats-card-detail" style={{ color: "#a1a1aa" }}>{check.fix || check.reason}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Format Issues (read-only) */}
            {report.formatIssues && report.formatIssues.length > 0 && (
              <>
                <div className="ats-section-label"><Bug size={13} style={{ marginRight: 6 }} /> Format Issues</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 10px" }}>
                  {report.formatIssues.slice(0, 5).map((fix) => (
                    <div key={fix.id} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #eab308" }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>{fix.section}: {fix.problem}</div>
                        <span className={`ats-tag ${fix.severity === "high" ? "ats-tag-bad" : fix.severity === "medium" ? "ats-tag-warn" : "ats-tag-good"}`} style={{ fontSize: 10 }}>{fix.severity}</span>
                      </div>
                      <div className="ats-card-detail" style={{ color: "#a1a1aa", marginBottom: 6 }}>{fix.reason}</div>
                      <div className="ats-card-detail" style={{ color: "#fafafa", fontSize: 12 }}>{fix.fixSuggestion}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Section Audit (read-only) */}
            {report.sectionAudit && report.sectionAudit.filter((a) => a.status !== "present").length > 0 && (
              <>
                <div className="ats-section-label"><Target size={13} style={{ marginRight: 6 }} /> Section Fixes</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 10px" }}>
                  {report.sectionAudit.filter((a) => a.status !== "present").slice(0, 5).map((audit, i) => (
                    <div key={`sa-${i}`} className="ats-card" style={{
                      margin: 0,
                      borderLeft: `3px solid ${audit.status === "missing" ? "#ef4444" : audit.status === "empty" ? "#eab308" : "#f97316"}`,
                    }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12, textTransform: "capitalize" }}>
                          <span className={`ats-tag ${audit.status === "missing" ? "ats-tag-bad" : "ats-tag-warn"}`} style={{ fontSize: 10, marginRight: 6 }}>
                            {audit.status}
                          </span>
                          {audit.section.replace("_", " ")}
                        </div>
                        <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>+{audit.fix.expectedScoreGain} pts</span>
                      </div>
                      <div className="ats-card-detail" style={{ color: "#a1a1aa", marginBottom: audit.fix.keywordsToInclude.length > 0 ? 6 : 0 }}>
                        {audit.fix.why}
                      </div>
                      {audit.fix.keywordsToInclude.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                          {audit.fix.keywordsToInclude.map((kw, ki) => (
                            <span key={ki} className="ats-tag ats-tag-good" style={{ fontSize: 10 }}>{kw}</span>
                          ))}
                        </div>
                      )}
                      {audit.fix.copyPasteTemplate && (
                        <div style={{ fontSize: 11, color: "#d4d4d8", background: "rgba(34,197,94,0.04)", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.1)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Template</div>
                          {audit.fix.copyPasteTemplate}
                        </div>
                      )}
                      {audit.fix.example && (
                        <div style={{ fontSize: 11, color: "#d4d4d8", background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 6, border: "1px solid #3f3f46", marginTop: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Example</div>
                          {audit.fix.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Section Wise Analysis ──────────────────────────────────────── */}
            {report.sectionWiseAnalysis && report.sectionWiseAnalysis.length > 0 && (
              <>
                <div className="ats-section-label"><BarChart3 size={13} style={{ marginRight: 6 }} /> Section Wise Analysis</div>
                <div style={{ padding: "0 18px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {report.sectionWiseAnalysis.map((sw, i) => (
                    <div key={i} className="ats-card" style={{ margin: 0 }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12, textTransform: "capitalize" }}>{sw.label}</div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(sw.scores.atsScore) }}>{sw.scores.atsScore}/100</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", margin: "6px 0" }}>
                        {([
                          ["ATS Score", sw.scores.atsScore],
                          ["Quality", sw.scores.qualityScore],
                          ["Completeness", sw.scores.completenessScore],
                          ["Keyword Relevance", sw.scores.keywordRelevanceScore],
                          ["Recruiter Effect.", sw.scores.recruiterEffectivenessScore],
                        ] as const).map(([label, val]) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, color: "#a1a1aa", width: 90 }}>{label}</span>
                            <div className="ats-mini-progress" style={{ flex: 1 }}>
                              <div className="ats-mini-progress-fill" style={{ width: `${val}%`, background: scoreColor(val) }} />
                            </div>
                            <span style={{ fontSize: 10, color: "#d4d4d8", width: 28, textAlign: "right" }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      {sw.wordCount > 0 && <div style={{ fontSize: 10, color: "#71717a", marginBottom: 4 }}>{sw.wordCount} words{sw.bulletCount ? ` · ${sw.bulletCount} bullets` : ""}</div>}
                      {sw.strengths.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#86efac", marginBottom: 2 }}>Strengths</div>
                          <ul style={{ margin: 0, paddingLeft: 14, color: "#86efac", fontSize: 11, lineHeight: 1.5 }}>
                            {sw.strengths.slice(0, 2).map((st, si) => <li key={si}>{st}</li>)}
                          </ul>
                        </div>
                      )}
                      {sw.weaknesses.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 2 }}>Weaknesses</div>
                          <ul style={{ margin: 0, paddingLeft: 14, color: "#fca5a5", fontSize: 11, lineHeight: 1.5 }}>
                            {sw.weaknesses.slice(0, 2).map((w, wi) => <li key={wi}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                      {sw.suggestions.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd", marginBottom: 2 }}>Suggestions</div>
                          <ul style={{ margin: 0, paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                            {sw.suggestions.slice(0, 2).map((sg, si) => <li key={si}>{sg}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Experience Analysis ────────────────────────────────────────── */}
            {report.experienceAnalysis && (
              <>
                <div className="ats-section-label"><Activity size={13} style={{ marginRight: 6 }} /> Experience Analysis</div>
                <div className="ats-card" style={{ margin: "0 18px 10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                    {[
                      { label: "Entries", value: report.experienceAnalysis.entryCount },
                      { label: "Total Bullets", value: report.experienceAnalysis.totalBullets },
                      { label: "Strong Verbs", value: `${Math.round(report.experienceAnalysis.strongVerbRatio * 100)}%` },
                      { label: "Quantified", value: `${Math.round(report.experienceAnalysis.quantifiedRatio * 100)}%` },
                      { label: "Leadership", value: `${Math.round(report.experienceAnalysis.leadershipRatio * 100)}%` },
                      { label: "Generic", value: report.experienceAnalysis.genericBulletCount, bad: true },
                      { label: "Passive Voice", value: report.experienceAnalysis.passiveVoiceCount, bad: true },
                      { label: "Avg Length", value: `${Math.round(report.experienceAnalysis.averageBulletLength)} chars` },
                    ].map((stat) => (
                      <div key={stat.label} className="ats-stat-box" style={{ padding: "8px 6px" }}>
                        <div className="ats-stat-value" style={{ fontSize: 16, color: stat.bad && (stat.value as number) > 0 ? "#fca5a5" : "#fafafa" }}>{stat.value}</div>
                        <div className="ats-stat-label" style={{ fontSize: 9 }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  {report.experienceAnalysis.topActionVerbs.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86efac", marginBottom: 4 }}>Top Action Verbs</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.experienceAnalysis.topActionVerbs.map((v) => (
                          <span key={v} className="ats-tag ats-tag-good" style={{ fontSize: 10 }}>{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.experienceAnalysis.weakVerbsDetected.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>Weak Verbs Detected</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.experienceAnalysis.weakVerbsDetected.map((v) => (
                          <span key={v} className="ats-tag ats-tag-bad" style={{ fontSize: 10 }}>{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.experienceAnalysis.bulletAnalyses && report.experienceAnalysis.bulletAnalyses.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>Bullet Analysis</div>
                      {report.experienceAnalysis.bulletAnalyses.slice(0, 5).map((ba, bi) => (
                        <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                            <span className="ats-status-dot" style={{ background: ba.isGeneric ? "#ef4444" : ba.isPassive ? "#eab308" : "#22c55e" }} />
                            {ba.hasStrongVerb && <span className="ats-status-dot" style={{ background: "#22c55e" }} title="strong verb" />}
                            {ba.hasMetric && <span className="ats-status-dot" style={{ background: "#22c55e" }} title="has metric" />}
                          </div>
                          <span style={{ fontSize: 11, color: "#d4d4d8", flex: 1 }}>{ba.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.experienceAnalysis.missingElements.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 2 }}>Missing Elements</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#fca5a5", fontSize: 11, lineHeight: 1.5 }}>
                        {report.experienceAnalysis.missingElements.map((m, mi) => <li key={mi}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.experienceAnalysis.suggestions.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd", marginBottom: 2 }}>Suggestions</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                        {report.experienceAnalysis.suggestions.map((s, si) => <li key={si}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Projects Analysis ──────────────────────────────────────────── */}
            {report.projectsAnalysis && (
              <>
                <div className="ats-section-label"><Code2 size={13} style={{ marginRight: 6 }} /> Projects Analysis</div>
                <div className="ats-card" style={{ margin: "0 18px 10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
                    <div className="ats-stat-box" style={{ padding: "8px 6px" }}>
                      <div className="ats-stat-value" style={{ fontSize: 16 }}>{report.projectsAnalysis.entryCount}</div>
                      <div className="ats-stat-label" style={{ fontSize: 9 }}>Projects</div>
                    </div>
                    <div className="ats-stat-box" style={{ padding: "8px 6px" }}>
                      <div className="ats-stat-value" style={{ fontSize: 16, color: scoreColor(report.projectsAnalysis.technicalDepthScore) }}>{report.projectsAnalysis.technicalDepthScore}</div>
                      <div className="ats-stat-label" style={{ fontSize: 9 }}>Tech Depth</div>
                    </div>
                    <div className="ats-stat-box" style={{ padding: "8px 6px" }}>
                      <div className="ats-stat-value" style={{ fontSize: 14, color: report.projectsAnalysis.hasLinks ? "#86efac" : "#fca5a5" }}>{report.projectsAnalysis.hasLinks ? "Yes" : "No"}</div>
                      <div className="ats-stat-label" style={{ fontSize: 9 }}>Has Links</div>
                    </div>
                    <div className="ats-stat-box" style={{ padding: "8px 6px" }}>
                      <div className="ats-stat-value" style={{ fontSize: 14, color: report.projectsAnalysis.hasDeploymentLinks ? "#86efac" : "#fca5a5" }}>{report.projectsAnalysis.hasDeploymentLinks ? "Yes" : "No"}</div>
                      <div className="ats-stat-label" style={{ fontSize: 9 }}>Deployed</div>
                    </div>
                  </div>
                  {report.projectsAnalysis.hasGithubLinks && <span className="ats-tag ats-tag-good" style={{ fontSize: 10, marginBottom: 6 }}>GitHub links present</span>}
                  {report.projectsAnalysis.isTutorialLevel && (
                    <div style={{ marginBottom: 6 }}>
                      <span className="ats-tag ats-tag-bad" style={{ fontSize: 10 }}>Tutorial-level projects detected</span>
                    </div>
                  )}
                  {report.projectsAnalysis.technologiesUsed.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>Technologies Used</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.projectsAnalysis.technologiesUsed.map((t) => (
                          <span key={t} className="ats-tag" style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.15)", fontSize: 10 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.projectsAnalysis.hasMeasurableImpact && <span className="ats-tag ats-tag-good" style={{ fontSize: 10, marginBottom: 6 }}>Measurable impact present</span>}
                  {report.projectsAnalysis.missingElements.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 2 }}>Missing Elements</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#fca5a5", fontSize: 11, lineHeight: 1.5 }}>
                        {report.projectsAnalysis.missingElements.map((m, mi) => <li key={mi}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.projectsAnalysis.suggestions.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd", marginBottom: 2 }}>Suggestions</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                        {report.projectsAnalysis.suggestions.map((s, si) => <li key={si}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Skills Analysis ────────────────────────────────────────────── */}
            {report.skillsAnalysis && (
              <>
                <div className="ats-section-label"><Star size={13} style={{ marginRight: 6 }} /> Skills Analysis</div>
                <div className="ats-card" style={{ margin: "0 18px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Total: <strong style={{ color: "#fafafa" }}>{report.skillsAnalysis.totalSkills}</strong></span>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Categorization Score: <strong style={{ color: scoreColor(report.skillsAnalysis.categorizationScore) }}>{report.skillsAnalysis.categorizationScore}</strong></span>
                  </div>
                  {report.skillsAnalysis.categorized.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      {report.skillsAnalysis.categorized.map((cat, ci) => (
                        <div key={ci} style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#d4d4d8" }}>{cat.category}</span>
                            <span className={`ats-tag ${cat.relevance === "high" ? "ats-tag-good" : cat.relevance === "medium" ? "ats-tag-warn" : "ats-tag-bad"}`} style={{ fontSize: 9 }}>{cat.relevance}</span>
                            {cat.isOutdated && <span className="ats-tag ats-tag-bad" style={{ fontSize: 9 }}>Outdated</span>}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {cat.skills.map((sk) => (
                              <span key={sk} className="ats-tag" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #3f3f46", fontSize: 10 }}>{sk}</span>
                            ))}
                          </div>
                          {cat.suggestions.length > 0 && (
                            <ul style={{ margin: "4px 0 0", paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                              {cat.suggestions.map((sg, si) => <li key={si}>{sg}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {report.skillsAnalysis.redundantSkills.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>Redundant Skills</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.skillsAnalysis.redundantSkills.map((sk) => (
                          <span key={sk} className="ats-tag ats-tag-bad" style={{ fontSize: 10 }}>{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.skillsAnalysis.outdatedTechnologies.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fde047", marginBottom: 4 }}>Outdated Technologies</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.skillsAnalysis.outdatedTechnologies.map((sk) => (
                          <span key={sk} className="ats-tag ats-tag-warn" style={{ fontSize: 10 }}>{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.skillsAnalysis.modernAlternatives.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86efac", marginBottom: 4 }}>Modern Alternatives</div>
                      {report.skillsAnalysis.modernAlternatives.map((alt, ai) => (
                        <div key={ai} style={{ fontSize: 11, color: "#d4d4d8", marginBottom: 2 }}>
                          <span className="ats-tag ats-tag-bad" style={{ fontSize: 10 }}>{alt.old}</span>
                          <span style={{ margin: "0 6px", color: "#71717a" }}>→</span>
                          <span className="ats-tag ats-tag-good" style={{ fontSize: 10 }}>{alt.modern}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.skillsAnalysis.missingCriticalSkills.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>Missing Critical Skills</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.skillsAnalysis.missingCriticalSkills.map((sk) => (
                          <span key={sk} className="ats-tag ats-tag-bad" style={{ fontSize: 10 }}>{sk}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.skillsAnalysis.suggestions.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd", marginBottom: 2 }}>Suggestions</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                        {report.skillsAnalysis.suggestions.map((s, si) => <li key={si}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Role Match Analysis ────────────────────────────────────────── */}
            {report.roleMatchAnalysis && (
              <>
                <div className="ats-section-label"><Award size={13} style={{ marginRight: 6 }} /> Role Match Analysis</div>
                <div className="ats-card" style={{ margin: "0 18px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div className="ats-score-ring" style={{ width: 56, height: 56, background: `conic-gradient(${scoreColor(report.roleMatchAnalysis.matchPercentage)} 0% ${report.roleMatchAnalysis.matchPercentage}%, rgba(255,255,255,0.05) ${report.roleMatchAnalysis.matchPercentage}% 100%)` }}>
                      <div className="ats-score-ring-inner" style={{ width: 44, height: 44 }}>
                        <span className="ats-score-value" style={{ fontSize: 16, color: scoreColor(report.roleMatchAnalysis.matchPercentage) }}>{report.roleMatchAnalysis.matchPercentage}%</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fafafa" }}>{report.roleMatchAnalysis.roleTitle}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <span className="ats-tag ats-tag-good" style={{ fontSize: 10 }}>{report.roleMatchAnalysis.experienceLevelMatch}</span>
                        <span className="ats-tag" style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.15)", fontSize: 10 }}>{report.roleMatchAnalysis.industryFit}</span>
                      </div>
                    </div>
                  </div>
                  {report.roleMatchAnalysis.suggestedRoles.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>Suggested Roles</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.roleMatchAnalysis.suggestedRoles.map((r) => (
                          <span key={r} className="ats-tag" style={{ background: "rgba(168,85,247,0.1)", color: "#d8b4fe", border: "1px solid rgba(168,85,247,0.15)", fontSize: 10 }}>{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86efac", marginBottom: 4 }}>Matched ({report.roleMatchAnalysis.matchedKeywords.length})</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.roleMatchAnalysis.matchedKeywords.slice(0, 6).map((k) => (
                          <span key={k} className="ats-tag ats-tag-good" style={{ fontSize: 9 }}>{k}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>Missing ({report.roleMatchAnalysis.missingKeywords.length})</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.roleMatchAnalysis.missingKeywords.slice(0, 6).map((k) => (
                          <span key={k} className="ats-tag ats-tag-bad" style={{ fontSize: 9 }}>{k}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fde047", marginBottom: 4 }}>Weak ({report.roleMatchAnalysis.weakKeywords.length})</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {report.roleMatchAnalysis.weakKeywords.slice(0, 6).map((k) => (
                          <span key={k} className="ats-tag ats-tag-warn" style={{ fontSize: 9 }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {report.roleMatchAnalysis.suggestions.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd", marginBottom: 2 }}>Suggestions</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                        {report.roleMatchAnalysis.suggestions.map((s, si) => <li key={si}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Keyword Density ────────────────────────────────────────────── */}
            {report.keywordDensity && report.keywordDensity.length > 0 && (
              <>
                <div className="ats-section-label"><Hash size={13} style={{ marginRight: 6 }} /> Keyword Density</div>
                <div style={{ padding: "0 18px 10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: "4px 8px", fontSize: 10, color: "#71717a", fontWeight: 600, textTransform: "uppercase", padding: "0 4px 6px" }}>
                    <span>Keyword</span>
                    <span style={{ textAlign: "right" }}>Count</span>
                    <span style={{ textAlign: "right" }}>Density</span>
                    <span style={{ textAlign: "right" }}>Min</span>
                    <span>Status</span>
                  </div>
                  {report.keywordDensity.map((kd, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: "4px 8px", alignItems: "center", padding: "6px 4px", borderBottom: i < report.keywordDensity!.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#d4d4d8" }}>{kd.keyword}</span>
                      <span style={{ fontSize: 11, color: "#fafafa", textAlign: "right" }}>{kd.count}</span>
                      <span style={{ fontSize: 11, color: "#a1a1aa", textAlign: "right" }}>{(kd.density * 100).toFixed(1)}%</span>
                      <span style={{ fontSize: 11, color: "#71717a", textAlign: "right" }}>{kd.suggestedMinCount}</span>
                      <span className={`ats-tag ${kd.status === "good" ? "ats-tag-good" : kd.status === "low" ? "ats-tag-bad" : "ats-tag-warn"}`} style={{ fontSize: 9, justifySelf: "start" }}>{kd.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Content Quality Analysis ───────────────────────────────────── */}
            {report.contentQualityAnalysis && (
              <>
                <div className="ats-section-label"><Sparkles size={13} style={{ marginRight: 6 }} /> Content Quality</div>
                <div className="ats-card" style={{ margin: "0 18px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className={`ats-tag ${report.contentQualityAnalysis.overallQuality === "excellent" || report.contentQualityAnalysis.overallQuality === "good" ? "ats-tag-good" : report.contentQualityAnalysis.overallQuality === "average" ? "ats-tag-warn" : "ats-tag-bad"}`}>
                      {report.contentQualityAnalysis.overallQuality}
                    </span>
                    <span style={{ fontSize: 11, color: "#a1a1aa" }}>Overall Quality</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                    {([
                      { label: "Clarity", value: report.contentQualityAnalysis.clarityScore },
                      { label: "Conciseness", value: report.contentQualityAnalysis.concisenessScore },
                      { label: "Impact", value: report.contentQualityAnalysis.impactScore },
                      { label: "Professionalism", value: report.contentQualityAnalysis.professionalismScore },
                      { label: "Grammar", value: report.contentQualityAnalysis.grammarQuality },
                    ] as const).map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "#a1a1aa", width: 80 }}>{label}</span>
                        <div className="ats-mini-progress" style={{ flex: 1 }}>
                          <div className="ats-mini-progress-fill" style={{ width: `${value}%`, background: scoreColor(value) }} />
                        </div>
                        <span style={{ fontSize: 10, color: "#d4d4d8", width: 28, textAlign: "right" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {report.contentQualityAnalysis.issues.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>Issues</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#fca5a5", fontSize: 11, lineHeight: 1.5 }}>
                        {report.contentQualityAnalysis.issues.map((iss, ii) => <li key={ii}>{iss}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.contentQualityAnalysis.suggestions.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#93c5fd", marginBottom: 2 }}>Suggestions</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#93c5fd", fontSize: 11, lineHeight: 1.5 }}>
                        {report.contentQualityAnalysis.suggestions.map((s, si) => <li key={si}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Recruiter Feedback ─────────────────────────────────────────── */}
            {report.recruiterFeedback && (
              <>
                <div className="ats-section-label"><ThumbsUp size={13} style={{ marginRight: 6 }} /> Recruiter Feedback</div>
                <div className="ats-card" style={{ margin: "0 18px 10px" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#d4d4d8", fontStyle: "italic", marginBottom: 6 }}>"{report.recruiterFeedback.firstImpression}"</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#a1a1aa" }}>Shortlisting Probability:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(report.recruiterFeedback.shortlistingProbability) }}>{report.recruiterFeedback.shortlistingProbability}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <span className={`ats-tag ${report.recruiterFeedback.technicalCredibility === "high" ? "ats-tag-good" : report.recruiterFeedback.technicalCredibility === "medium" ? "ats-tag-warn" : "ats-tag-bad"}`} style={{ fontSize: 10 }}>
                      Tech: {report.recruiterFeedback.technicalCredibility}
                    </span>
                    <span className={`ats-tag ${report.recruiterFeedback.leadershipImpression === "high" ? "ats-tag-good" : report.recruiterFeedback.leadershipImpression === "medium" ? "ats-tag-warn" : "ats-tag-bad"}`} style={{ fontSize: 10 }}>
                      Leadership: {report.recruiterFeedback.leadershipImpression}
                    </span>
                    <span className={`ats-tag ${report.recruiterFeedback.resumeProfessionalism === "high" ? "ats-tag-good" : report.recruiterFeedback.resumeProfessionalism === "medium" ? "ats-tag-warn" : "ats-tag-bad"}`} style={{ fontSize: 10 }}>
                      Professionalism: {report.recruiterFeedback.resumeProfessionalism}
                    </span>
                    <span className="ats-tag" style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.15)", fontSize: 10 }}>
                      Clarity: {report.recruiterFeedback.clarityScore}/100
                    </span>
                  </div>
                  <div className="ats-card-detail" style={{ color: "#d4d4d8", marginBottom: 8 }}>{report.recruiterFeedback.detailFeedback}</div>
                  {report.recruiterFeedback.strengths.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#86efac", marginBottom: 4 }}>Strengths</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#86efac", fontSize: 11, lineHeight: 1.5 }}>
                        {report.recruiterFeedback.strengths.map((st, si) => <li key={si}>{st}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.recruiterFeedback.concerns.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#fca5a5", marginBottom: 4 }}>Concerns</div>
                      <ul style={{ margin: 0, paddingLeft: 14, color: "#fca5a5", fontSize: 11, lineHeight: 1.5 }}>
                        {report.recruiterFeedback.concerns.map((c, ci) => <li key={ci}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Industry Checks ────────────────────────────────────────────── */}
            {report.industryChecks && report.industryChecks.length > 0 && (
              <>
                <div className="ats-section-label"><Flag size={13} style={{ marginRight: 6 }} /> Industry Checks</div>
                <div style={{ padding: "0 18px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {report.industryChecks.map((ic, ii) => (
                    <div key={ii} className="ats-card" style={{ margin: 0 }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>{ic.industry}</div>
                      </div>
                      {ic.checks.map((ch, ci) => (
                        <div key={ci} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: ci < ic.checks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <span className="ats-status-dot" style={{ background: ch.passed ? "#22c55e" : "#ef4444", marginTop: 4 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#d4d4d8" }}>{ch.name}</span>
                              <span className={`ats-tag ${ch.importance === "critical" ? "ats-tag-bad" : ch.importance === "important" ? "ats-tag-warn" : "ats-tag-info"}`} style={{ fontSize: 9 }}>{ch.importance}</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: ch.passed ? "#86efac" : "#fca5a5" }}>{ch.passed ? "Passed" : "Failed"}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>{ch.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Warnings ───────────────────────────────────────────────────── */}
            {report.warnings && report.warnings.length > 0 && (
              <>
                <div className="ats-section-label"><AlertCircle size={13} style={{ marginRight: 6 }} /> Warnings</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 10px" }}>
                  {report.warnings.map((w, i) => (
                    <div key={i} className="ats-card" style={{ margin: 0, borderLeft: `3px solid ${severityColor(w.severity)}` }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>
                          <span className={`ats-tag ${severityTagClass(w.severity)}`} style={{ fontSize: 10 }}>{w.severity}</span>
                          <span style={{ textTransform: "capitalize" }}>{w.section.replace("_", " ")}</span>
                        </div>
                      </div>
                      <div className="ats-card-detail" style={{ color: "#fafafa", marginBottom: 4 }}>{w.message}</div>
                      {w.suggestion && <div className="ats-card-detail" style={{ color: "#93c5fd" }}>{w.suggestion}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Recommendations ────────────────────────────────────────────── */}
            {report.recommendations && report.recommendations.length > 0 && (
              <>
                <div className="ats-section-label"><Lightbulb size={13} style={{ marginRight: 6 }} /> Recommendations</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 10px" }}>
                  {report.recommendations.map((rec, i) => (
                    <div key={i} className="ats-card" style={{ margin: 0, borderLeft: `3px solid ${rec.priority === "P0" ? "#ef4444" : rec.priority === "P1" ? "#eab308" : "#22c55e"}` }}>
                      <div className="ats-card-header">
                        <div className="ats-card-title" style={{ fontSize: 12 }}>
                          <span className={`ats-tag ${rec.priority === "P0" ? "ats-tag-bad" : rec.priority === "P1" ? "ats-tag-warn" : "ats-tag-good"}`} style={{ fontSize: 10 }}>{rec.priority}</span>
                          {rec.title}
                        </div>
                        <span className={`ats-tag ${effortTagClass(rec.effort)}`} style={{ fontSize: 10 }}>{rec.effort}</span>
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <span className="ats-tag" style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.15)", fontSize: 10 }}>{rec.category}</span>
                      </div>
                      <div className="ats-card-detail" style={{ color: "#d4d4d8", marginBottom: 4 }}>{rec.description}</div>
                      {rec.expectedImpact && (
                        <div className="ats-card-detail" style={{ color: "#86efac", fontSize: 11 }}>
                          Expected impact: {rec.expectedImpact}
                        </div>
                      )}
                    </div>
                  ))}
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

import React, { useState, useCallback, useMemo } from "react";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { queueAtsAnalysis, getLatestAtsAnalysis, applyAtsSuggestion, applyKeywordPlacement, createMissingSection } from "@/services/api";
import type { AtsAnalysisReport, AtsSectionKey, AtsSectionSuggestions, AiSuggestion, AtsFormatIssue, AtsPriorityFix } from "../../../../shared/src/ai";
import type { ResumeDocument } from "@/types/resume-types";
import { AlertCircle, BarChart3, CheckCircle2, ChevronDown, FileSearch, Lightbulb, Loader2, RefreshCw, RotateCcw, Target, Wand2, Bug } from "lucide-react";

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

  .ats-loader-block { background: rgba(255, 255, 255, 0.05); border-radius: 6px; height: 14px; margin: 10px 0; position: relative; overflow: hidden; }
  .ats-loader-block::after {
    content: ""; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.09), transparent);
    animation: shimmer 1.4s ease-in-out infinite;
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
  const [applyingKeywords, setApplyingKeywords] = useState<Set<string>>(new Set());
  const [applyingToAllKey, setApplyingToAllKey] = useState<string | null>(null);
  const [creatingSections, setCreatingSections] = useState<Set<string>>(new Set());
  const [applyingFormatFixes, setApplyingFormatFixes] = useState<Set<string>>(new Set());
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
      const result = await queueAtsAnalysis(resume._id, {
        jobTitle: resume.personalInfo.title || resume.title,
        reportType: "resume-analysis",
      });
      const analysis = (result as any)?.analysis ?? null;
      if (analysis && analysis.overallScore != null) {
        setReport(analysis);
        setAnalysisDocId(analysis._id ?? analysis.id ?? null);
        setSuggestionStatus({});
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
            setAnalysisDocId(a._id ?? a.id ?? null);
            setSuggestionStatus({});
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

  const handleApplySuggestion = useCallback(async (suggestion: AiSuggestion) => {
    if (!resume._id || !suggestion.id) return;
    setApplyingIds((prev) => new Set(prev).add(suggestion.id));
    try {
      const result = await applyAtsSuggestion(resume._id, analysisDocId ?? "", suggestion.id);
      if (result?.resume) useResumeBuilderStore.setState({ resume: result.resume as ResumeDocument });
      setSuggestionStatus((prev) => ({ ...prev, [suggestion.id]: "applied" }));
    } catch (err: any) {
      if (err?.response?.status === 404) {
        if (!report) { setError("No analysis available. Run ATS check first."); return; }
        const allSugs = Object.values(getSectionSuggestions(report)).flat();
        const match = allSugs.find((s) => s.id === suggestion.id);
        if (!match || !match.suggestionText || !match.path) {
          setError("Suggestion data incomplete. Please re-run analysis.");
          return;
        }
        try {
          const section = match.path.startsWith("personalInfo") ? "summary" : "experience";
          const payload = { section, copyPasteTemplate: match.suggestionText, suggestionId: match.id };
          const result = await createMissingSection(resume._id, section, match.suggestionText);
          if (result?.resume) useResumeBuilderStore.setState({ resume: result.resume as ResumeDocument });
          setSuggestionStatus((prev) => ({ ...prev, [suggestion.id]: "applied" }));
        } catch (fallbackErr: any) {
          setError(fallbackErr?.response?.data?.message || "Failed to apply suggestion. Try re-running analysis.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to apply suggestion");
      }
    } finally {
      setApplyingIds((prev) => { const next = new Set(prev); next.delete(suggestion.id); return next; });
    }
  }, [resume._id, analysisDocId, report]);

  const handleApplyAll = useCallback(async () => {
    for (const s of pendingSuggestions) {
      if (suggestionStatus[s.id] === "applied") continue;
      await handleApplySuggestion(s);
    }
  }, [pendingSuggestions, suggestionStatus, handleApplySuggestion]);

  const handleAddKeyword = useCallback(async (keyword: string, section: string) => {
    if (!resume._id) return;
    setApplyingKeywords((prev) => new Set(prev).add(keyword));
    try {
      const result = await applyKeywordPlacement(resume._id, keyword, section);
      if (result?.resume) useResumeBuilderStore.setState({ resume: result.resume as ResumeDocument });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add keyword");
    } finally {
      setApplyingKeywords((prev) => { const next = new Set(prev); next.delete(keyword); return next; });
    }
  }, [resume._id]);

  const handleAddKeywordToAll = useCallback(async (keyword: string, sections: string[]) => {
    if (!resume._id || sections.length === 0) return;
    setApplyingToAllKey(keyword);
    try {
      for (const section of sections) {
        const result = await applyKeywordPlacement(resume._id, keyword, section);
        if (result?.resume) useResumeBuilderStore.setState({ resume: result.resume as ResumeDocument });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add keyword");
    } finally {
      setApplyingToAllKey(null);
    }
  }, [resume._id]);

  const handleCreateSection = useCallback(async (section: string, copyPasteTemplate?: string) => {
    if (!resume._id) return;
    setCreatingSections((prev) => new Set(prev).add(section));
    try {
      const result = await createMissingSection(resume._id, section, copyPasteTemplate);
      if (result?.resume) useResumeBuilderStore.setState({ resume: result.resume as ResumeDocument });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create section");
    } finally {
      setCreatingSections((prev) => { const next = new Set(prev); next.delete(section); return next; });
    }
  }, [resume._id]);

  const handleApplyFormatFix = useCallback(async (fix: AtsFormatIssue) => {
    if (!resume._id || !fix.clickToApply) return;
    setApplyingFormatFixes((prev) => new Set(prev).add(fix.id));
    try {
      // Apply via the rewrite suggestions endpoint — treat as a text replacement
      await applyAtsSuggestion(resume._id, analysisDocId ?? "", fix.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply format fix");
    } finally {
      setApplyingFormatFixes((prev) => { const next = new Set(prev); next.delete(fix.id); return next; });
    }
  }, [resume._id, analysisDocId]);

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
                <div className="ats-progress-fill" style={{ width: `${adjustedScore}%`, background: scoreColor(adjustedScore) }} />
              </div>
            </div>

            {/* Verdict */}
            <div className="ats-section-label"><Lightbulb size={13} style={{ marginRight: 6 }} /> Verdict</div>
            <div className="ats-card">
              <div className="ats-card-detail" style={{ color: "#fafafa" }}>{report.verdict || report.summary}</div>
            </div>

            {/* Missing Keywords with Placement */}
            {report.keywordAnalysis?.missingKeywords && report.keywordAnalysis.missingKeywords.length > 0 && (
              <>
                <div className="ats-section-label"><AlertCircle size={13} style={{ marginRight: 6 }} /> Missing Keywords</div>
                <div style={{ fontSize: 11, color: "#a1a1aa", padding: "0 18px 8px" }}>
                  Click a section button to add the keyword there, or use <strong>Apply to all</strong> to add it to every suggested section. The italic text shows how to naturally include the keyword.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 18px 10px" }}>
                  {report.keywordAnalysis.missingKeywords.slice(0, 8).map((kw, i) => {
                    const keyword = typeof kw === "string" ? kw : kw.keyword;
                    const reason = typeof kw === "string" ? "" : kw.reason;
                    const placement = report.keywordPlacement?.find((kp) => kp.keyword.toLowerCase() === keyword.toLowerCase());
                    const isApplyingAll = applyingToAllKey === keyword;
                    return (
                      <div key={i} className="ats-card" style={{ margin: 0, borderLeft: "3px solid #ef4444" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span className="ats-card-title" style={{ fontSize: 13 }}>
                            <span className="ats-tag ats-tag-bad" style={{ fontSize: 12 }}>{keyword}</span>
                          </span>
                          {typeof kw !== "string" && kw.importance === "critical" && (
                            <span className="ats-tag ats-tag-bad" style={{ fontSize: 10 }}>Critical</span>
                          )}
                        </div>
                        {reason && <div className="ats-card-detail" style={{ marginBottom: 6, color: "#a1a1aa" }}>{reason}</div>}
                        {placement && (
                          <>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                              {placement.placeIn.map((section) => (
                                <span key={section} className="ats-tag" style={{ background: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.15)", fontSize: 10 }}>
                                  + {section}
                                </span>
                              ))}
                            </div>
                            {placement.exampleUsage && (
                              <div style={{ fontSize: 11, color: "#d4d4d8", background: "rgba(255,255,255,0.02)", padding: "8px 10px", borderRadius: 6, border: "1px solid #3f3f46", fontStyle: "italic" }}>
                                "{placement.exampleUsage}"
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                              {placement.placeIn.map((section) => (
                                <button
                                  key={section}
                                  className="ats-btn-apply ats-btn-apply-ready"
                                  onClick={() => handleAddKeyword(keyword, section)}
                                  disabled={applyingKeywords.has(keyword) || isApplyingAll}
                                >
                                  {applyingKeywords.has(keyword) && !isApplyingAll ? <Loader2 size={12} className="ai-spin" /> : <Wand2 size={12} />}
                                  + {section}
                                </button>
                              ))}
                              {placement.placeIn.length > 1 && (
                                <button
                                  className="ats-btn-apply"
                                  style={{ background: "#6366f1", color: "#fff" }}
                                  onClick={() => handleAddKeywordToAll(keyword, placement.placeIn)}
                                  disabled={applyingKeywords.has(keyword) || isApplyingAll}
                                >
                                  {isApplyingAll ? <Loader2 size={12} className="ai-spin" /> : <Wand2 size={12} />}
                                  Apply to all
                                </button>
                              )}
                            </div>
                          </>
                        )}
                        {!placement && (
                          <div className="ats-card-detail" style={{ color: "#71717a", fontSize: 11 }}>
                            Add to skills or experience section
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

            {/* Format Issues (v2) */}
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
                      <div className="ats-card-detail" style={{ color: "#fafafa", fontSize: 12, marginBottom: fix.clickToApply ? 8 : 0 }}>{fix.fixSuggestion}</div>
                      {fix.clickToApply && (
                        <button
                          className="ats-btn-apply ats-btn-apply-ready"
                          onClick={() => handleApplyFormatFix(fix)}
                          disabled={applyingFormatFixes.has(fix.id)}
                        >
                          {applyingFormatFixes.has(fix.id) ? <Loader2 size={12} className="ai-spin" /> : <Wand2 size={12} />}
                          Apply Fix
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Section Audit */}
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
                      <button
                        className="ats-btn-apply ats-btn-apply-ready"
                        onClick={() => handleCreateSection(audit.section, audit.fix.copyPasteTemplate)}
                        disabled={creatingSections.has(audit.section)}
                        style={{ marginTop: 10 }}
                      >
                        {creatingSections.has(audit.section) ? <Loader2 size={12} className="ai-spin" /> : <Wand2 size={12} />}
                        Create {audit.section.replace("_", " ")} Section
                      </button>
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

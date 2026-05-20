import React, { useState } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { api } from "../../services/api";
import type { AtsAnalysisResult, AtsSuggestion } from "../../types/resume-types";

const IMPACT_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#6B7280",
};

const IMPACT_LABELS: Record<string, string> = {
  high: "High Impact",
  medium: "Medium",
  low: "Low",
};

function ScoreRing({ score, size = 80, label }: { score: number; size?: number; label?: string }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? "#4ADE80" :
    score >= 50 ? "#F59E0B" :
    "#EF4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#27272a" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={size * 0.28} fontWeight={800}
          fontFamily="'Outfit', sans-serif"
          style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
        >
          {score}
        </text>
      </svg>
      {label && <span style={{ fontSize: 10, color: "#666", fontWeight: 600 }}>{label}</span>}
    </div>
  );
}

function SectionScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 75 ? "#4ADE80" :
    score >= 50 ? "#F59E0B" :
    "#EF4444";

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#e4e4e7", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{score}%</span>
      </div>
      <div style={{ height: 6, background: "#27272a", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score}%`, background: color,
          borderRadius: 3, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  applying,
}: {
  suggestion: AtsSuggestion;
  onApply: () => void;
  applying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const impactColor = IMPACT_COLORS[suggestion.impact] ?? "#6B7280";

  return (
    <div style={{
      background: "#09090b", border: "1px solid #27272a", borderRadius: 10,
      padding: "12px 14px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: impactColor,
              background: `${impactColor}18`, padding: "2px 6px", borderRadius: 4,
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              {IMPACT_LABELS[suggestion.impact]}
            </span>
            <span style={{ fontSize: 11, color: "#555" }}>{suggestion.reason}</span>
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
            <span style={{ color: "#555" }}>Original:</span>{" "}
            <span style={{ textDecoration: "line-through", opacity: 0.7 }}>
              {suggestion.originalText.length > 80
                ? suggestion.originalText.slice(0, 80) + "…"
                : suggestion.originalText}
            </span>
          </div>
          {expanded && (
            <div style={{
              fontSize: 12, color: "#FFFFFF", marginBottom: 8,
              padding: "8px 10px", background: "rgba(255,255,255,0.06)",
              borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
              lineHeight: 1.5,
            }}>
              {suggestion.suggestionText}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none", border: "1px solid #27272a", borderRadius: 6,
            color: "#888", fontSize: 11, fontWeight: 600, padding: "4px 10px",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {expanded ? "Hide" : "Preview"}
        </button>
        <button
          onClick={onApply}
          disabled={applying}
          style={{
            background: applying ? "#18181b" : "rgba(255,255,255,0.12)",
            border: `1px solid ${applying ? "#27272a" : "rgba(255,255,255,0.3)"}`,
            borderRadius: 6, color: applying ? "#555" : "#FFFFFF",
            fontSize: 11, fontWeight: 700, padding: "4px 10px",
            cursor: applying ? "wait" : "pointer", fontFamily: "inherit",
          }}
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use ATSAnalysisPanel instead. This file is dead code. */
export function AtsPanel() {
  const { resume } = useResumeBuilderStore();
  const resumeId = resume.id ?? resume._id;

  const [analysis, setAnalysis] = useState<AtsAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState(resume.personalInfo.title);
  const [keywords, setKeywords] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!resumeId) {
      setError("Save your resume first to run ATS analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const kws = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const response = await api.post(`/resumes/${resumeId}/ats-analysis`, {
        jobTitle,
        keywords: kws,
      });
      setAnalysis(response.data.analysis);
    } catch {
      setError("Failed to run ATS analysis. Make sure your resume is saved.");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (suggestion: AtsSuggestion) => {
    if (!resumeId || !analysis?._id) return;
    setApplyingId(suggestion.id);
    try {
      await api.post(`/resumes/${resumeId}/apply-suggestion`, {
        analysisId: analysis._id,
        suggestionId: suggestion.id,
      });
      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rewriteSuggestions: prev.rewriteSuggestions.filter((s) => s.id !== suggestion.id),
        };
      });
    } catch {
      setError("Failed to apply suggestion.");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div style={{ overflowY: "auto", height: "100%", fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #27272a" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EFE8" }}>ATS Score Analysis</div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
          Check how well your resume passes applicant tracking systems
        </div>
      </div>

      {/* Input Section */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #27272a" }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 5 }}>
            Target Job Title
          </span>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            style={{
              width: "100%", padding: "7px 10px", background: "#09090b",
              border: "1px solid #27272a", borderRadius: 7, color: "#e4e4e7",
              fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: 5 }}>
            Keywords (comma-separated)
          </span>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. React, TypeScript, AWS, CI/CD"
            style={{
              width: "100%", padding: "7px 10px", background: "#09090b",
              border: "1px solid #27272a", borderRadius: 7, color: "#e4e4e7",
              fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading || !resumeId}
          style={{
            width: "100%", padding: "10px", borderRadius: 8,
            border: "none",
            background: loading ? "#18181b" : "#FFFFFF",
            color: loading ? "#555" : "#0E0E0E",
            fontSize: 13, fontWeight: 800, cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {loading ? "Analyzing…" : "Run ATS Analysis"}
        </button>

        {!resumeId && (
          <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 6, textAlign: "center" }}>
            Save your resume first to enable ATS analysis
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: "12px 16px", padding: "10px 12px", background: "#7F1D1D",
          color: "#FCA5A5", borderRadius: 8, fontSize: 12, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div style={{ padding: "14px 16px" }}>
          {/* Overall Score */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px 0", marginBottom: 16,
          }}>
            <ScoreRing score={analysis.scoreOverall} size={100} label="Overall ATS Score" />
          </div>

          {/* Section Scores */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
              Section Breakdown
            </div>
            <SectionScoreBar label="Summary" score={analysis.sectionScores.summary} />
            <SectionScoreBar label="Experience" score={analysis.sectionScores.experience} />
            <SectionScoreBar label="Skills" score={analysis.sectionScores.skills} />
            <SectionScoreBar label="Education" score={analysis.sectionScores.education} />
            <SectionScoreBar label="Formatting" score={analysis.sectionScores.formatting} />
          </div>

          {/* Missing Keywords */}
          {analysis.missingKeywords.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Missing Keywords
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {analysis.missingKeywords.map((kw) => (
                  <span key={kw} style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: "rgba(239,68,68,0.1)", color: "#EF4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
                Add these keywords to your resume to improve ATS matching
              </div>
            </div>
          )}

          {/* Rewrite Suggestions */}
          {analysis.rewriteSuggestions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                Improvement Suggestions ({analysis.rewriteSuggestions.length})
              </div>
              {analysis.rewriteSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={() => applySuggestion(suggestion)}
                  applying={applyingId === suggestion.id}
                />
              ))}
            </div>
          )}

          {analysis.rewriteSuggestions.length === 0 && analysis.missingKeywords.length === 0 && (
            <div style={{
              textAlign: "center", padding: "20px", color: "#4ADE80",
              fontSize: 13, fontWeight: 600,
            }}>
              Your resume looks great! No major improvements needed.
            </div>
          )}
        </div>
      )}

      {/* Empty state before analysis */}
      {!analysis && !loading && !error && (
        <div style={{
          padding: "40px 20px", textAlign: "center", color: "#444", fontSize: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#666" }}>No analysis yet</div>
          <div>Enter your target role and run the analysis to see your ATS compatibility score</div>
        </div>
      )}
    </div>
  );
}

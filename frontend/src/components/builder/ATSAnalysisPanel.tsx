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

type Props = {
  expanded?: boolean;
};

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

  useEffect(() => {
    setJobTitle(resume.personalInfo.title || resume.title);
  }, [resume.personalInfo.title, resume.title]);

  useEffect(() => {
    if (!resumeId) return;

    getLatestAtsAnalysis(resumeId)
      .then((response) => {
        setAnalysis(response.analysis);
        setLastUpdatedAt(response.analysis.analyzedAt ?? null);
      })
      .catch(() => {
        // A missing report is fine; the user may not have run ATS analysis yet.
      });
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
          setIsRunning(false);
          setQueuedJobId(null);
          window.clearInterval(interval);
        }
      } catch (pollError) {
        if (!active) return;
        setError(pollError instanceof Error ? pollError.message : "ATS analysis polling failed");
        setIsRunning(false);
        setQueuedJobId(null);
        window.clearInterval(interval);
      }
    }, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [queuedJobId, resumeId]);

  const handleAnalyze = async () => {
    if (!resumeId) {
      setError("Save the resume before running ATS analysis.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const response = await queueAtsAnalysis(resumeId, {
        jobTitle,
        jobDescription,
        keywords: fallbackKeywords,
        tone,
        reportType: jobDescription.trim().length > 0 ? "job-description-match" : "resume-analysis",
      });

      setQueuedJobId(response.jobId);
      setAnalysis((current) => current && current.jobId === response.jobId ? current : current);
      setLastUpdatedAt(new Date().toISOString());
    } catch (queueError) {
      setIsRunning(false);
      setError(queueError instanceof Error ? queueError.message : "Failed to queue ATS analysis");
    }
  };

  const currentAnalysis = analysis;

  if (!expanded) {
    return null;
  }

  return (
    <div style={{ background: "#0F0F0F", borderBottom: "1px solid #1E1E1E" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#F0EFE8" }}>ATS analysis</div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Queued in BullMQ after resume completion. Historical reports stay persisted.</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setShowDetails((value) => !value)}
          style={{ background: "#121212", border: "1px solid #252525", color: "#C8C7C0", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
        >
          {showDetails ? "Hide" : "Show"}
        </button>
      </div>

      {showDetails && (
        <div style={{ padding: "14px", display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Job title or target role"
              style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, color: "#F0EFE8", padding: "10px 12px", fontSize: 12 }}
            />
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value as AiTone)}
              style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, color: "#C8C7C0", padding: "10px 12px", fontSize: 12 }}
            >
              {TONES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the job description here to calculate a match percentage and missing skills."
            rows={5}
            style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, color: "#F0EFE8", padding: "10px 12px", fontSize: 12, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={isRunning}
              style={{ background: "rgba(200,245,90,0.12)", border: "1px solid rgba(200,245,90,0.25)", color: "#E7F7B2", borderRadius: 10, padding: "9px 12px", fontSize: 12, fontWeight: 800, cursor: isRunning ? "not-allowed" : "pointer" }}
            >
              {isRunning ? "Analyzing..." : "Analyze Resume"}
            </button>
            <div style={{ fontSize: 11, color: "#666", alignSelf: "center" }}>
              {queuedJobId ? `Queued job ${queuedJobId.slice(0, 10)}...` : lastUpdatedAt ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "No ATS analysis yet"}
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(127,29,29,0.35)", border: "1px solid rgba(248,113,113,0.2)", color: "#FCA5A5", padding: "10px 12px", borderRadius: 10, fontSize: 12 }}>
              {error}
            </div>
          )}

          {currentAnalysis && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <StatCard label="ATS Score" value={`${currentAnalysis.overallScore}/100`} />
                <StatCard label="Match Score" value={`${currentAnalysis.matchScore}%`} />
                <StatCard label="Status" value={currentAnalysis.status.toUpperCase()} />
              </div>

              <div style={{ background: "#101010", border: "1px solid #252525", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Section scores</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {Object.entries(currentAnalysis.sectionScores).map(([label, value]) => (
                    <div key={label} style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#F0EFE8" }}>{value}/100</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
                <Panel title="Keyword analysis">
                  <TagList label="Matched" values={currentAnalysis.keywordAnalysis.matchedKeywords} tone="good" />
                  <TagList label="Missing" values={currentAnalysis.keywordAnalysis.missingKeywords} tone="warn" />
                  <TagList label="Repeated" values={currentAnalysis.keywordAnalysis.repeatedKeywords} tone="neutral" />
                  <TagList label="ATS-friendly" values={currentAnalysis.keywordAnalysis.atsFriendlyKeywords} tone="good" />
                </Panel>

                <Panel title="Formatting checks">
                  <div style={{ display: "grid", gap: 8 }}>
                    {currentAnalysis.formattingChecks.map((check) => (
                      <div key={check.id} style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, padding: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#F0EFE8" }}>{check.label}</div>
                          <div style={{ fontSize: 11, color: check.passed ? "#86EFAC" : "#FCA5A5" }}>{check.passed ? "PASS" : "REVIEW"}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{check.reason}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <Panel title="Grammar + rewriting suggestions">
                <div style={{ display: "grid", gap: 10 }}>
                  {currentAnalysis.grammarIssues.slice(0, 4).map((issue) => (
                    <div key={issue.id} style={{ background: "#141414", border: "1px solid #252525", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F0EFE8" }}>{issue.reason}</div>
                      <div style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>{issue.suggestionText}</div>
                    </div>
                  ))}

                  {currentAnalysis.rewriteSuggestions.slice(0, 4).map((suggestion) => (
                    <div key={suggestion.id} style={{ background: "#101010", border: "1px solid #252525", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#F0EFE8" }}>{suggestion.reason}</div>
                      <div style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>{suggestion.suggestionText}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Report summary">
                <div style={{ fontSize: 12, color: "#C8C7C0", lineHeight: 1.6 }}>{currentAnalysis.summary}</div>
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#101010", border: "1px solid #252525", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#F0EFE8" }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#101010", border: "1px solid #252525", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function TagList({ label, values, tone }: { label: string; values: string[]; tone: "good" | "warn" | "neutral" }) {
  const colors = tone === "good"
    ? { bg: "rgba(34,197,94,0.12)", color: "#86EFAC", border: "rgba(34,197,94,0.25)" }
    : tone === "warn"
      ? { bg: "rgba(245,158,11,0.12)", color: "#FBBF24", border: "rgba(245,158,11,0.25)" }
      : { bg: "rgba(148,163,184,0.12)", color: "#CBD5E1", border: "rgba(148,163,184,0.25)" };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {values.length > 0 ? values.map((value) => (
          <span key={value} style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color, borderRadius: 999, padding: "4px 8px", fontSize: 11 }}>
            {value}
          </span>
        )) : <span style={{ color: "#666", fontSize: 11 }}>None</span>}
      </div>
    </div>
  );
}

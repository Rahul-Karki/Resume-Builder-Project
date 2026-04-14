import { CSSProperties, useMemo, useState } from "react";
import {
  analyzeResumeAts,
  applyResumeAtsSuggestion,
  compareResumeVersions,
  createRoleTailoredVariant,
  getResumeShareAnalytics,
  listResumeVersions,
  restoreResumeVersion,
  upsertResumeShareSettings,
} from "@/services/api";
import { useResumeBuilderStore } from "@/store/useResumeBuilderStore";
import { AtsAnalysis, ExportPreset, ResumeVersionMeta } from "@/types/resume-types";

interface Props {
  onDownload: () => void;
  canDownload: boolean;
}

const sectionCard: CSSProperties = {
  background: "#121212",
  border: "1px solid #222",
  borderRadius: 12,
  padding: 12,
  marginBottom: 10,
};

export function ProPanel({ onDownload, canDownload }: Props) {
  const { resume, ui, setExportPreset, loadResume } = useResumeBuilderStore();

  const [jobTitle, setJobTitle] = useState(resume.personalInfo.title);
  const [keywords, setKeywords] = useState("");
  const [analysis, setAnalysis] = useState<AtsAnalysis | null>(null);
  const [versions, setVersions] = useState<ResumeVersionMeta[]>([]);
  const [leftVersion, setLeftVersion] = useState<number | null>(null);
  const [rightVersion, setRightVersion] = useState<number | null>(null);
  const [compareSummary, setCompareSummary] = useState<string>("");
  const [targetRole, setTargetRole] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareVisibility, setShareVisibility] = useState<"public" | "unlisted" | "password">("unlisted");
  const [shareDownloadsAllowed, setShareDownloadsAllowed] = useState(true);
  const [shareViews, setShareViews] = useState<number | null>(null);
  const [shareDownloads, setShareDownloads] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const resumeId = resume.id ?? resume._id;

  const keywordList = useMemo(
    () => keywords.split(",").map((value) => value.trim()).filter(Boolean),
    [keywords],
  );

  const withSafeCall = async (work: () => Promise<void>, successMessage: string) => {
    setLoading(true);
    setNotice("");
    try {
      await work();
      setNotice(successMessage);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Request failed";
      setNotice(message);
    } finally {
      setLoading(false);
    }
  };

  const requireResumeId = () => {
    if (!resumeId) {
      setNotice("Save the resume first to use pro features.");
      return false;
    }

    return true;
  };

  return (
    <div style={{ padding: 12, overflowY: "auto", fontFamily: "'Outfit', sans-serif" }}>
      <div style={sectionCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#d2d2d2", marginBottom: 8 }}>ATS Scoring + Rewrite Suggestions</div>
        <input
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
          placeholder="Target job title"
          style={{ width: "100%", marginBottom: 8, background: "#0e0e0e", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "8px 10px" }}
        />
        <input
          value={keywords}
          onChange={(event) => setKeywords(event.target.value)}
          placeholder="Keywords (comma separated)"
          style={{ width: "100%", marginBottom: 8, background: "#0e0e0e", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "8px 10px" }}
        />
        <button
          disabled={loading}
          onClick={() => withSafeCall(async () => {
            if (!requireResumeId()) return;
            const result = await analyzeResumeAts(resumeId!, { jobTitle, keywords: keywordList });
            setAnalysis(result);
          }, "ATS analysis updated")}
          style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
        >
          Analyze ATS
        </button>

        {analysis && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#b8b8b8" }}>
            <div>Overall Score: <strong style={{ color: "#c8f55a" }}>{analysis.scoreOverall}%</strong></div>
            <div style={{ marginTop: 4 }}>Missing keywords: {analysis.missingKeywords.join(", ") || "None"}</div>
            <div style={{ marginTop: 8 }}>
              {analysis.rewriteSuggestions.slice(0, 3).map((suggestion) => (
                <div key={suggestion.id} style={{ border: "1px solid #282828", borderRadius: 8, padding: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: "#909090", marginBottom: 4 }}>{suggestion.reason}</div>
                  <div style={{ fontSize: 11, color: "#cbcbcb", marginBottom: 6 }}>{suggestion.suggestionText}</div>
                  <button
                    disabled={loading}
                    onClick={() => withSafeCall(async () => {
                      if (!requireResumeId()) return;
                      await applyResumeAtsSuggestion(resumeId!, { analysisId: analysis._id, suggestionId: suggestion.id });
                      await loadResume(resumeId!);
                      const refreshed = await analyzeResumeAts(resumeId!, { jobTitle, keywords: keywordList });
                      setAnalysis(refreshed);
                    }, "Suggestion applied")}
                    style={{ padding: "5px 8px", border: "1px solid #2f2f2f", background: "#101010", color: "#d8d8d8", borderRadius: 6, cursor: "pointer" }}
                  >
                    Apply rewrite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={sectionCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#d2d2d2", marginBottom: 8 }}>Version History + Compare</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            disabled={loading}
            onClick={() => withSafeCall(async () => {
              if (!requireResumeId()) return;
              const items = await listResumeVersions(resumeId!);
              setVersions(items);
              if (items.length >= 2) {
                setLeftVersion(items[1].versionNo);
                setRightVersion(items[0].versionNo);
              }
            }, "Version history loaded")}
            style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
          >
            Load Versions
          </button>
          <button
            disabled={loading || !leftVersion || !rightVersion}
            onClick={() => withSafeCall(async () => {
              if (!requireResumeId() || !leftVersion || !rightVersion) return;
              const compared = await compareResumeVersions(resumeId!, leftVersion, rightVersion);
              const delta = compared.diff.sectionCountDelta;
              setCompareSummary(`Title changed: ${compared.diff.titleChanged ? "yes" : "no"} | Summary changed: ${compared.diff.summaryChanged ? "yes" : "no"} | Experience delta: ${delta.experience}`);
            }, "Compare completed")}
            style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
          >
            Compare
          </button>
        </div>

        {versions.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <select value={leftVersion ?? ""} onChange={(event) => setLeftVersion(Number(event.target.value))} style={{ flex: 1, background: "#101010", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "6px 8px" }}>
              {versions.map((item) => <option key={`left_${item.versionNo}`} value={item.versionNo}>Version {item.versionNo}</option>)}
            </select>
            <select value={rightVersion ?? ""} onChange={(event) => setRightVersion(Number(event.target.value))} style={{ flex: 1, background: "#101010", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "6px 8px" }}>
              {versions.map((item) => <option key={`right_${item.versionNo}`} value={item.versionNo}>Version {item.versionNo}</option>)}
            </select>
            <button
              disabled={loading || !rightVersion}
              onClick={() => withSafeCall(async () => {
                if (!requireResumeId() || !rightVersion) return;
                await restoreResumeVersion(resumeId!, rightVersion);
                await loadResume(resumeId!);
              }, `Restored version ${rightVersion}`)}
              style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
            >
              Restore
            </button>
          </div>
        )}

        {compareSummary && <div style={{ fontSize: 11, color: "#a5a5a5" }}>{compareSummary}</div>}
      </div>

      <div style={sectionCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#d2d2d2", marginBottom: 8 }}>Export Presets + Role-Tailored Variant</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {(["web", "standard", "print"] as ExportPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setExportPreset(preset)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${ui.exportPreset === preset ? "#c8f55a" : "#2f2f2f"}`,
                background: "#121212",
                color: ui.exportPreset === preset ? "#c8f55a" : "#bdbdbd",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        <button
          disabled={!canDownload}
          onClick={onDownload}
          style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: canDownload ? "pointer" : "not-allowed" }}
        >
          Download with preset
        </button>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="Target role e.g. Senior Backend Engineer"
            style={{ flex: 1, background: "#0e0e0e", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "8px 10px" }}
          />
          <button
            disabled={loading}
            onClick={() => withSafeCall(async () => {
              if (!requireResumeId()) return;
              await createRoleTailoredVariant(resumeId!, { targetRole, keywords: keywordList });
            }, "Role-tailored variant created")}
            style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
          >
            Create Variant
          </button>
        </div>
      </div>

      <div style={sectionCard}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#d2d2d2", marginBottom: 8 }}>Public Share + Privacy + Analytics</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={shareVisibility} onChange={(event) => setShareVisibility(event.target.value as "public" | "unlisted" | "password")} style={{ flex: 1, background: "#101010", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "6px 8px" }}>
            <option value="public">public</option>
            <option value="unlisted">unlisted</option>
            <option value="password">password</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#bdbdbd" }}>
            <input type="checkbox" checked={shareDownloadsAllowed} onChange={(event) => setShareDownloadsAllowed(event.target.checked)} /> Allow downloads
          </label>
        </div>

        {shareVisibility === "password" && (
          <input
            type="password"
            value={sharePassword}
            onChange={(event) => setSharePassword(event.target.value)}
            placeholder="Share password"
            style={{ width: "100%", marginBottom: 8, background: "#0e0e0e", border: "1px solid #2a2a2a", color: "#d0d0d0", borderRadius: 8, padding: "8px 10px" }}
          />
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            disabled={loading}
            onClick={() => withSafeCall(async () => {
              if (!requireResumeId()) return;
              const share = await upsertResumeShareSettings(resumeId!, {
                visibility: shareVisibility,
                password: shareVisibility === "password" ? sharePassword : undefined,
                allowDownload: shareDownloadsAllowed,
                isActive: true,
              });
              setShareUrl(share.url);
            }, "Share link ready")}
            style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
          >
            Create / Update Share Link
          </button>
          <button
            disabled={loading}
            onClick={() => withSafeCall(async () => {
              if (!requireResumeId()) return;
              const analytics = await getResumeShareAnalytics(resumeId!);
              setShareViews(analytics.views);
              setShareDownloads(analytics.downloads);
            }, "Share analytics updated")}
            style={{ padding: "7px 10px", border: "1px solid #2f2f2f", background: "#181818", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
          >
            Load Analytics
          </button>
        </div>

        {shareUrl && <div style={{ marginTop: 8, fontSize: 11, color: "#9dc3ff", wordBreak: "break-all" }}>{shareUrl}</div>}
        {(shareViews !== null || shareDownloads !== null) && (
          <div style={{ marginTop: 8, fontSize: 11, color: "#b5b5b5" }}>
            Views: {shareViews ?? 0} · Downloads: {shareDownloads ?? 0}
          </div>
        )}
      </div>

      {notice && <div style={{ fontSize: 11, color: "#c8f55a" }}>{notice}</div>}
    </div>
  );
}

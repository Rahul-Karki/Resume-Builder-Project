import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicSharedResume, trackSharedResumeDownload } from "@/services/api";
import { ResumeDocument } from "@/types/resume-types";
import { ResumeRenderer } from "@/templates/ResumeRenderer";

export default function SharedResume() {
  const { slug = "" } = useParams();
  const [password, setPassword] = useState("");
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [allowDownload, setAllowDownload] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const canLoad = useMemo(() => slug.trim().length > 0, [slug]);

  const loadShare = async () => {
    if (!canLoad) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await getPublicSharedResume(slug, password || undefined);
      setResume(response.resume);
      setAllowDownload(Boolean(response.share?.allowDownload));
      setMessage("");
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? "Failed to load shared resume");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!canLoad) return;
    try {
      await trackSharedResumeDownload(slug, password || undefined);
      setMessage("Download event recorded. Use browser print to save as PDF.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? "Failed to record download");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0efe8", fontFamily: "'Outfit', sans-serif", padding: "24px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>Shared Resume</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (if required)"
            style={{ flex: 1, background: "#121212", border: "1px solid #2a2a2a", color: "#d8d8d8", borderRadius: 8, padding: "9px 12px" }}
          />
          <button
            onClick={loadShare}
            disabled={loading}
            style={{ padding: "9px 12px", border: "1px solid #2f2f2f", background: "#161616", color: "#d8d8d8", borderRadius: 8, cursor: "pointer" }}
          >
            Load
          </button>
          <button
            onClick={handleDownload}
            disabled={!resume || !allowDownload}
            style={{ padding: "9px 12px", border: "1px solid #2f2f2f", background: "#161616", color: "#d8d8d8", borderRadius: 8, cursor: !resume || !allowDownload ? "not-allowed" : "pointer" }}
          >
            Download
          </button>
        </div>
        {message && <div style={{ marginBottom: 12, color: "#9db7ff", fontSize: 13 }}>{message}</div>}

        {resume && (
          <div style={{ width: 794, height: 1123, margin: "0 auto", background: "#fff", color: "#000", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
            <ResumeRenderer resume={resume} />
          </div>
        )}
      </div>
    </div>
  );
}

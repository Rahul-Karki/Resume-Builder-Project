import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import type { ResumeDocument } from "@/types/resume-types";
import { A4_WIDTH_PX, A4_HEIGHT_PX } from "@/utils/resumePagination";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

function apiUrl(path: string) {
  const base = API_BASE.replace(/\/api\/?$/, "");
  return `${base}${path}`;
}

const ResumeExportPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const previewToken = searchParams.get("previewToken");

  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setError("Missing job ID");
      return;
    }

    const params = new URLSearchParams();
    if (previewToken) params.set("previewToken", previewToken);

    fetch(`${apiUrl("/api/resumes/preview-data")}/${encodeURIComponent(jobId)}?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load resume: ${r.status}`);
        return r.json();
      })
      .then((data) => setResume(data.resume as ResumeDocument))
      .catch((err) => setError(err.message));
  }, [jobId, previewToken]);

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff", color: "#999", fontFamily: "sans-serif", fontSize: 14 }}>
        {error}
      </div>
    );
  }

  if (!resume) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff", color: "#999", fontFamily: "sans-serif", fontSize: 14 }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ background: "#e8e8e8", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0" }}>
      <div
        id="resume-export-root"
        style={{
          width: `${A4_WIDTH_PX}px`,
          background: "#ffffff",
          minHeight: `${A4_HEIGHT_PX}px`,
          margin: "0 auto",
          overflow: "visible",
        }}
      >
        <style>{`
          #resume-export-root {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          #resume-export-root .section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          #resume-export-root .item {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          #resume-export-root li {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @media print {
            body { margin: 0; padding: 0; background: #fff; }
            #resume-export-root { min-height: auto; box-shadow: none; margin: 0; }
          }
        `}</style>
        <ResumeRenderer resume={resume} />
      </div>
    </div>
  );
};

export default ResumeExportPage;

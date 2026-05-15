import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api } from "@/services/api";
import { ResumeDocument } from "@/types/resume-types";
import ResumeRenderer from "@/templates/ResumeRenderer";

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printTriggeredRef = useRef(false);
  const isPrintMode = new URLSearchParams(search).get("print") === "1";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return setError("Missing preview id");
      try {
        const params = new URLSearchParams(window.location.search);
        const previewToken = params.get("previewToken");
        const url = previewToken
          ? `/resumes/preview-data/${encodeURIComponent(id)}?previewToken=${encodeURIComponent(previewToken)}`
          : `/resumes/preview-data/${encodeURIComponent(id)}`;
        const res = await api.get(url);
        if (!mounted) return;
        setResume(res.data?.resume ?? null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load preview");
      }
    };

    void load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (!isPrintMode || !resume || printTriggeredRef.current) {
      return;
    }

    printTriggeredRef.current = true;

    let cancelled = false;
    const waitForAssets = async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        await Promise.all(Array.from(document.images).map((image) => {
          if (image.complete && image.naturalWidth > 0) {
            return Promise.resolve();
          }

          return new Promise<void>((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
          });
        }));

        if (cancelled) return;

        window.addEventListener("afterprint", () => {
          try {
            window.close();
          } catch {
            // ignore
          }
        }, { once: true });

        window.setTimeout(() => {
          if (!cancelled) {
            window.print();
          }
        }, 100);
      } catch {
        if (!cancelled) {
          window.print();
        }
      }
    };

    void waitForAssets();

    return () => {
      cancelled = true;
    };
  }, [isPrintMode, resume]);

  if (error) {
    return <div style={{ padding: 24, color: "#f55" }}>Preview error: {error}</div>;
  }

  if (!resume) {
    return <div style={{ padding: 24, color: "#ccc" }}>Loading preview…</div>;
  }

  // Minimal, print-friendly container used by Puppeteer
  return (
    <div className="resume-print-shell" style={{ width: "100%", minHeight: "100vh", background: resume.style?.backgroundColor ?? "#fff", padding: 0 }}>
      <style>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: ${resume.style?.backgroundColor ?? "#fff"};
        }

        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .resume-print-shell {
          min-height: 100vh;
          background: ${resume.style?.backgroundColor ?? "#fff"};
        }

        .resume-print-root {
          width: 210mm;
          max-width: 210mm;
          margin: 0 auto;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .resume-print-root,
        .resume-print-root * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .resume-print-root img {
          max-width: 100%;
          height: auto;
        }

        .resume-print-root h1,
        .resume-print-root h2,
        .resume-print-root h3,
        .resume-print-root p,
        .resume-print-root ul,
        .resume-print-root li,
        .resume-print-root img {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .resume-print-root a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>
      <div id="resume-export-root" className="resume-print-root" style={{ width: "794px", margin: "0 auto", boxSizing: "border-box" }}>
        <ResumeRenderer resume={resume} />
      </div>
      <script dangerouslySetInnerHTML={{ __html: "window.__RESUME_PREVIEW_READY = true;" }} />
    </div>
  );
}

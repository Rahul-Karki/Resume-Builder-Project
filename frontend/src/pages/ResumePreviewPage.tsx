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
  const [payloadKey] = useState(() => new URLSearchParams(search).get("payloadKey") ?? "");
  const isPrintMode = new URLSearchParams(search).get("print") === "1";
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [printScale, setPrintScale] = useState<number>(1);
  const [printAttempted, setPrintAttempted] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) return setError("Missing preview id");

      if (isPrintMode && payloadKey) {
        const rawPayload = window.localStorage.getItem(payloadKey);
        if (rawPayload) {
          try {
            const parsed = JSON.parse(rawPayload) as { resume?: ResumeDocument };
            if (parsed.resume) {
              if (!mounted) return;
              setResume(parsed.resume);
              return;
            }
          } catch {
            // fall back to API
          }
        }
      }

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
        if (isPrintMode && payloadKey) {
          const rawPayload = window.localStorage.getItem(payloadKey);
          if (rawPayload) {
            try {
              const parsed = JSON.parse(rawPayload) as { resume?: ResumeDocument };
              if (parsed.resume) {
                if (!mounted) return;
                setResume(parsed.resume);
                return;
              }
            } catch {
              // ignore and surface API error below
            }
          }
        }

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

        // compute a print scale so content fits a single A4 page if it slightly exceeds it
        try {
          const el = document.getElementById('resume-export-root');
          if (el) {
            contentRef.current = el as HTMLDivElement;
            const contentHeight = el.scrollHeight;
            const mmToPx = (mm: number) => mm * (96 / 25.4);
            const pageHeightPx = 297 * (96 / 25.4); // A4 height in px at 96dpi (≈1122.52)
            const marginPx = mmToPx(12) * 2; // top+bottom
            const printableHeight = pageHeightPx - marginPx;
            if (contentHeight > printableHeight) {
              // scale down to fit a single page if content isn't massively longer
              const scale = printableHeight / contentHeight;
              // don't scale below 0.7 to maintain readability
              setPrintScale(Math.max(0.7, scale));
            } else {
              setPrintScale(1);
            }
          }
        } catch {
          // ignore
        }

        window.addEventListener("afterprint", () => {
          try {
            if (payloadKey) {
              window.localStorage.removeItem(payloadKey);
            }
          } catch {
            // ignore
          }
          // mark that we attempted printing so UI can offer retry
          setPrintAttempted(true);
        }, { once: true });

        window.setTimeout(() => {
          if (!cancelled) {
            try { window.print(); } finally { setPrintAttempted(true); }
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
  }, [isPrintMode, resume, payloadKey]);

  if (error) {
    return <div style={{ padding: 24, color: "#f55" }}>Preview error: {error}</div>;
  }

  if (!resume) {
    return null;
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
      <div id="resume-export-root" className="resume-print-root" style={{ width: "794px", margin: "0 auto", boxSizing: "border-box", transform: `scale(${printScale})`, transformOrigin: 'top left' }}>
        <ResumeRenderer resume={resume} />
      </div>

      {printAttempted && (
        <div style={{ position: 'fixed', right: 18, top: 18, zIndex: 9999 }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 12px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>Print dialog completed or cancelled.</span>
            <button onClick={() => { try { window.print(); } catch {} }} style={{ background: '#C8F55A', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Print again</button>
          </div>
        </div>
      )}
      <script dangerouslySetInnerHTML={{ __html: "window.__RESUME_PREVIEW_READY = true;" }} />
    </div>
  );
}

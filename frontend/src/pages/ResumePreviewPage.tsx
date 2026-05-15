import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api } from "@/services/api";
import type { ResumeDocument } from "@/types/resume-types";
import { ResumeTemplate } from "@/components/resume/ResumeTemplate";
import { clearResumePrintPayload, readResumePrintPayload } from "@/utils/resumePrintPreview";

const previewPageStyles = `
  html,
  body {
    margin: 0;
    padding: 0;
    background: #eef2f7;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .resume-preview-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #f7f8fb 0%, #edf1f6 100%);
  }

  .resume-preview-page__status {
    position: fixed;
    top: 16px;
    left: 50%;
    z-index: 2;
    transform: translateX(-50%);
    border-radius: 9999px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.88);
    padding: 8px 14px;
    font-size: 12px;
    color: #334155;
    backdrop-filter: blur(10px);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  }

  .resume-preview-page__error {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: #991b1b;
    background: #fff1f2;
    font-size: 14px;
  }

  @media print {
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    .resume-preview-page {
      background: #ffffff;
    }

    .resume-preview-page__status {
      display: none !important;
    }
  }
`;

const waitForImages = async () => {
  const imageElements = Array.from(document.images);
  await Promise.all(
    imageElements.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    }),
  );
};

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const [resume, setResume] = useState<ResumeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const printTriggeredRef = useRef(false);

  const isPrintMode = searchParams.get("print") === "1";
  const payloadKey = searchParams.get("payloadKey") ?? "";
  const previewToken = searchParams.get("previewToken") ?? "";

  useEffect(() => {
    let cancelled = false;

    const loadResume = async () => {
      if (!id) {
        setError("Missing preview id");
        return;
      }

      if (isPrintMode && payloadKey) {
        const payloadResume = readResumePrintPayload(payloadKey);
        if (payloadResume) {
          if (!cancelled) {
            setResume(payloadResume);
          }
          return;
        }
      }

      try {
        const previewUrl = previewToken
          ? `/resumes/preview-data/${encodeURIComponent(id)}?previewToken=${encodeURIComponent(previewToken)}`
          : `/resumes/preview-data/${encodeURIComponent(id)}`;
        const response = await api.get(previewUrl);

        if (!cancelled) {
          setResume(response.data?.resume ?? null);
        }
      } catch (requestError: any) {
        if (isPrintMode && payloadKey) {
          const payloadResume = readResumePrintPayload(payloadKey);
          if (payloadResume) {
            if (!cancelled) {
              setResume(payloadResume);
            }
            return;
          }
        }

        if (!cancelled) {
          setError(requestError?.response?.data?.message || "Failed to load preview");
        }
      }
    };

    void loadResume();

    return () => {
      cancelled = true;
    };
  }, [id, isPrintMode, payloadKey, previewToken]);

  useEffect(() => {
    if (!isPrintMode || !resume || printTriggeredRef.current) {
      return;
    }

    printTriggeredRef.current = true;
    let cancelled = false;

    const removePayload = () => {
      if (payloadKey) {
        clearResumePrintPayload(payloadKey);
      }
    };

    const runPrint = async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        await waitForImages();

        if (cancelled) {
          return;
        }

        const handleAfterPrint = () => {
          removePayload();
        };

        window.addEventListener("afterprint", handleAfterPrint, { once: true });

        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            if (!cancelled) {
              window.print();
            }
          }, 120);
        });
      } catch {
        if (!cancelled) {
          window.print();
        }
      }
    };

    void runPrint();

    return () => {
      cancelled = true;
    };
  }, [isPrintMode, payloadKey, resume]);

  if (error) {
    return <div className="resume-preview-page__error">Preview error: {error}</div>;
  }

  if (!resume) {
    return (
      <div className="resume-preview-page__error" style={{ color: "#334155", background: "#eef2f7" }}>
        Loading print preview...
      </div>
    );
  }

  return (
    <div className="resume-preview-page">
      <style>{previewPageStyles}</style>
      {isPrintMode && <div className="resume-preview-page__status">Opening print preview...</div>}
      <ResumeTemplate resume={resume} mode="print" />
    </div>
  );
}
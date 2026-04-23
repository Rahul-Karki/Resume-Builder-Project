import React, { useRef } from "react";
import { useResumeBuilderStore } from "../../store/useResumeBuilderStore";
import { ResumeRenderer } from "../../templates/ResumeRenderer";
import type { PreviewScale, ResumeDocument } from "../../types/resume-types";

interface Props {
  onDownload: () => void;
  canDownload: boolean;
}

export function PreviewPanel({ onDownload, canDownload }: Props) {
  const { resume, ui, setPreviewScale } = useResumeBuilderStore();
  const scale = ui.previewScale;
  const previewRef = useRef<HTMLDivElement>(null);
  const scaleOptions: PreviewScale[] = [0.5, 0.6, 0.7, 0.75, 0.85, 1];
  const scaleIndex = scaleOptions.indexOf(scale);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

  // A4 dimensions in px at 96dpi
  const A4_W = 794;
  const A4_H = 1123;

  const scaledW = A4_W * scale;
  const scaledH = A4_H * scale;

  return (
    <div style={{
      flex: 1, background: "#0A0A0A", display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Preview toolbar */}
      <div style={{
        minHeight: 40, background: "#0F0F0F", borderBottom: "1px solid #1A1A1A",
        display: "flex", alignItems: "center", padding: isMobile ? "6px 10px" : "0 16px", gap: 12,
        flexWrap: isMobile ? "wrap" : "nowrap",
        fontFamily: "'Outfit', sans-serif", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: "#444", fontWeight: 500 }}>LIVE PREVIEW</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#333" }}>A4 · 210 × 297 mm</span>
        <span style={{ fontSize: 10, color: "#333" }}>·</span>
        <button
          onClick={() => {
            if (scaleIndex > 0) setPreviewScale(scaleOptions[scaleIndex - 1]);
          }}
          disabled={scaleIndex <= 0}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "1px solid #3A3A3A",
            background: "#171717",
            color: scaleIndex <= 0 ? "#555" : "#F0EFE8",
            cursor: scaleIndex <= 0 ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
          title="Zoom out"
        >
          -
        </button>
        <span style={{ fontSize: 10, color: "#C8F55A", fontWeight: 700 }}>{Math.round(scale * 100)}%</span>
        <button
          onClick={() => {
            if (scaleIndex < scaleOptions.length - 1) setPreviewScale(scaleOptions[scaleIndex + 1]);
          }}
          disabled={scaleIndex >= scaleOptions.length - 1}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "1px solid #3A3A3A",
            background: "#171717",
            color: scaleIndex >= scaleOptions.length - 1 ? "#555" : "#F0EFE8",
            cursor: scaleIndex >= scaleOptions.length - 1 ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
          title="Zoom in"
        >
          +
        </button>
      </div>

      {/* Preview scroll area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "14px 8px" : "32px 24px" }}>
        <div style={{ position: "relative" }}>
          {/* Page shadow */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 4,
            boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)",
          }} />

          {/* Scale wrapper */}
          <div
            style={{
              width: scaledW,
              height: scaledH,
              position: "relative",
              overflow: "hidden",
              borderRadius: 4,
              background: resume.style.backgroundColor,
            }}
          >
            {/* Inner content at 1:1 then scaled */}
            <div
              ref={previewRef}
              style={{
                width: A4_W,
                height: A4_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                overflow: "hidden",
                background: resume.style.backgroundColor,
              }}
            >
              <div style={{ width: "100%", height: "100%", minHeight: "100%" }}>
                <ResumeRenderer resume={resume} />
              </div>
            </div>
          </div>

          {/* Page number label */}
          <div style={{
            position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)",
            fontSize: 10, color: "#333", fontFamily: "'Outfit', sans-serif",
          }}>
            Page 1
          </div>
        </div>
      </div>

      {/* Bottom bar with quick actions */}
      <div style={{
        height: 44, background: "#0F0F0F", borderTop: "1px solid #1A1A1A",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
        fontFamily: "'Outfit', sans-serif", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }} />
        <button
          onClick={onDownload}
          disabled={!canDownload}
          title={canDownload ? "Download as PDF" : "Save resume first to enable download"}
          style={{
            background: "none", border: "1px solid #2A2A2A", borderRadius: 6,
            color: canDownload ? "#888" : "#444", fontSize: 12, fontWeight: 600, padding: "5px 12px",
            cursor: canDownload ? "pointer" : "not-allowed", fontFamily: "inherit",
            opacity: canDownload ? 1 : 0.65,
          }}
        >
          ↓ Download PDF
        </button>
      </div>
    </div>
  );
}


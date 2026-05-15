import React, { useState, useRef } from 'react';
import { useResumeBuilderStore } from '../../store/useResumeBuilderStore';
import { ResumeRenderer } from '../../templates/ResumeRenderer';
import EnhancedDownloadPdfModal from '../../components/EnhancedDownloadPdfModal';
import type { PreviewScale, ResumeDocument } from '../../types/resume-types';

interface Props {
  onDownload: () => void;
  canDownload: boolean;
  isExporting?: boolean;
  exportStatus?: string | null;
}

export function EnhancedResumeStudio({ onDownload, canDownload, isExporting = false, exportStatus = null }: Props) {
  const { resume, ui, setPreviewScale } = useResumeBuilderStore();
  const scale = ui.previewScale;
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  
  const scaleOptions: PreviewScale[] = [0.5, 0.6, 0.7, 0.75, 0.85, 1];
  const scaleIndex = scaleOptions.indexOf(scale);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

  // A4 dimensions in px at 96dpi
  const A4_W = 794;
  const A4_H = 1123;

  const scaledW = A4_W * scale;
  const scaledH = A4_H * scale;

  const handleDownloadComplete = () => {
    // Optional: Update analytics, show success message, etc.
    console.log('PDF download completed successfully');
  };

  return (
    <div style={{
      flex: 1, background: "#0A0A0A", display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative",
    }}>
      {/* Preview toolbar */}
      <div style={{
        minHeight: 48, background: "#0F0F0F", borderBottom: "1px solid #18181b",
        display: "flex", alignItems: "center", padding: isMobile ? "8px 12px" : "0 20px", gap: 14,
        flexWrap: isMobile ? "wrap" : "nowrap",
        fontFamily: "'Outfit', sans-serif", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: "#444", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Live Preview</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#333", fontWeight: 500 }}>A4 · 210 × 297 mm</span>
        <span style={{ fontSize: 11, color: "#333" }}>·</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#171717", borderRadius: 8, padding: "4px", border: "1px solid #27272a" }}>
          <button
            onClick={() => {
              if (scaleIndex > 0) setPreviewScale(scaleOptions[scaleIndex - 1]);
            }}
            disabled={scaleIndex <= 0}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: scaleIndex <= 0 ? "#555" : "#F0EFE8",
              cursor: scaleIndex <= 0 ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Zoom out"
          >
            −
          </button>
          <span style={{ fontSize: 11, color: "#FFFFFF", fontWeight: 700, minWidth: 32, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
          <button
            onClick={() => {
              if (scaleIndex < scaleOptions.length - 1) setPreviewScale(scaleOptions[scaleIndex + 1]);
            }}
            disabled={scaleIndex >= scaleOptions.length - 1}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: scaleIndex >= scaleOptions.length - 1 ? "#555" : "#F0EFE8",
              cursor: scaleIndex >= scaleOptions.length - 1 ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            title="Zoom in"
          >
            +
          </button>
        </div>
        
        {/* Enhanced Download Button */}
        <button
          onClick={() => setDownloadModalOpen(true)}
          disabled={!canDownload || isExporting}
          title={isExporting ? (exportStatus ?? "Preparing PDF export") : canDownload ? "Download as PDF" : "Save resume first to enable download"}
          style={{
            background: canDownload && !isExporting ? "#FFFFFF" : "transparent", border: canDownload && !isExporting ? "none" : "1px solid #27272a", borderRadius: 8,
            color: canDownload && !isExporting ? "#0A0A0A" : "#444", fontSize: 13, fontWeight: 700, padding: "7px 16px",
            cursor: canDownload && !isExporting ? "pointer" : "not-allowed", fontFamily: "inherit",
            opacity: canDownload && !isExporting ? 1 : 0.65, transition: "all 0.2s ease",
          }}
        >
          {isExporting ? "Exporting..." : "↓ Download PDF"}
        </button>
      </div>

      {/* Preview scroll area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "16px 10px" : "40px 28px" }}>
        <div style={{ position: "relative" }}>
          {/* Page shadow */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 6,
            boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)",
          }} />

          {/* Scale wrapper */}
          <div
            ref={previewRef}
            style={{
              width: scaledW,
              height: scaledH,
              position: "relative",
              overflow: "hidden",
              borderRadius: 6,
              background: resume?.style?.backgroundColor ?? "#FFFFFF",
            }}
          >
            {/* Inner content at 1:1 then scaled */}
            <div
              style={{
                  width: A4_W,
                  height: A4_H,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  overflow: "hidden",
                  background: resume?.style?.backgroundColor ?? "#FFFFFF",
                }}
            >
              <div style={{ all: "initial", display: "block", width: "100%", height: "100%", minHeight: "100%" }}>
                <ResumeRenderer resume={resume} />
              </div>
            </div>
          </div>

          {/* Page number label */}
          <div style={{
            position: "absolute", bottom: -32, left: "50%", transform: "translateX(-50%)",
            fontSize: 11, color: "#333", fontFamily: "'Outfit', sans-serif", fontWeight: 500,
          }}>
            Page 1
          </div>
        </div>
      </div>

      {/* Enhanced Download Modal */}
      <EnhancedDownloadPdfModal 
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        resumeSelector="#resume-preview-root"
        onDownloadComplete={handleDownloadComplete}
      />

      {/* Bottom bar with quick actions */}
      <div style={{
        height: 52, background: "#0F0F0F", borderTop: "1px solid #18181b",
        display: "flex", alignItems: "center", padding: "0 20px", gap: 12,
        fontFamily: "'Outfit', sans-serif", flexShrink: 0,
      }}>
        {isExporting && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#FFFFFF", fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#FFFFFF", animation: "spin 0.8s linear infinite" }} />
            <span>{exportStatus ?? "Preparing export..."}</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}
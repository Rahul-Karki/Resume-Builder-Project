import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { waitForFonts } from "../utils/enhancedPDFGenerator";
import { openPrintPreviewForSelector } from "../utils/printPreview";

type Props = {
  open: boolean;
  onClose: () => void;
  resumeSelector: string;
  onDownloadComplete?: () => void;
};

const PAGE_SIZE_MM: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
};

async function fetchImageAsDataUrl(url: string) {
  try {
    const resp = await fetch(url, { mode: "cors" });
    const blob = await resp.blob();
    return await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  for (const img of imgs) {
    const src = img.getAttribute("src") ?? "";
    if (!src || src.startsWith("data:")) continue;
    try {
      const dataUrl = await fetchImageAsDataUrl(src);
      img.setAttribute("src", dataUrl);
    } catch {
      // ignore
    }
  }
}

/** Clone element with ALL computed styles frozen as inline styles */
function cloneNodeWithInlineStyles(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  const originals = Array.from(node.querySelectorAll<HTMLElement>("*"));
  const clones = Array.from(clone.querySelectorAll<HTMLElement>("*"));
  const copyStyle = (src: HTMLElement, dst: HTMLElement) => {
    try {
      const cs = window.getComputedStyle(src);
      dst.style.cssText = cs.cssText;
    } catch {
      // ignore
    }
  };
  copyStyle(node, clone);
  for (let i = 0; i < originals.length; i++) {
    copyStyle(originals[i], clones[i]);
  }
  return clone;
}

/** After cloning with inline styles, sanitize for PDF capture */
function sanitizeCloneForPdf(clone: HTMLElement) {
  const all = Array.from(clone.querySelectorAll<HTMLElement>("*"));

  for (const el of [clone, ...all]) {
    // Get computed overflow (may be from CSS classes, not inline)
    const cs = window.getComputedStyle(el);
    const ov = cs.overflow;
    if (ov === "hidden" || ov === "scroll" || ov === "auto") {
      el.style.overflow = "visible";
    }
    // Remove any transforms (may be from CSS classes)
    const tr = cs.transform;
    if (tr && tr !== "none") {
      el.style.transform = "none";
      el.style.webkitTransform = "none";
    }
    // Remove fixed heights on the resume-root container only
    // (keep height auto so content can flow multiple pages)
  }

  // Root-level overrides for the container
  clone.style.position = "fixed";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.zIndex = "-1000";
  clone.style.transform = "none";
  clone.style.webkitTransform = "none";
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.borderRadius = "0";
  clone.style.boxShadow = "none";
}

export default function EnhancedDownloadPdfModal({ open, onClose, resumeSelector, onDownloadComplete }: Props) {
  const [filename, setFilename] = useState("resume.pdf");
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generatePdf = async () => {
    setGenerating(true);
    setMessage(null);
    setProgress(0);

    try {
      const root = document.querySelector<HTMLElement>(resumeSelector);
      if (!root) throw new Error('Resume element not found');

      setMessage('Preparing PDF layout...');
      setProgress(10);

      // Clone with all computed styles frozen as inline, then sanitize
      const clone = cloneNodeWithInlineStyles(root);
      sanitizeCloneForPdf(clone);
      clone.classList.add('__pdf-export-clone');
      document.body.appendChild(clone);

      // Wait a frame for layout to settle
      await new Promise(r => requestAnimationFrame(r));

      setMessage('Inlining images...');
      setProgress(25);
      await inlineImages(clone);

      setMessage('Waiting for fonts...');
      setProgress(35);
      await waitForFonts();

      const size = PAGE_SIZE_MM[pageSize] || PAGE_SIZE_MM.A4;
      const pageWidthMm = orientation === 'portrait' ? size.width : size.height;
      const pageHeightMm = orientation === 'portrait' ? size.height : size.width;

      setMessage('Rendering canvas...');
      setProgress(50);

      const scale = 2;
      const canvas = await html2canvas(clone, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      // Remove clone
      clone.remove();

      setMessage('Assembling PDF...');
      setProgress(70);

      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: [pageWidthMm, pageHeightMm],
      });

      const imgWidth = pageWidthMm;
      const canvasPageHeightPx = (pageHeightMm * canvas.width) / pageWidthMm;
      const totalImgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

      if (totalImgHeightMm <= pageHeightMm) {
        // Single page
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          0,
          imgWidth,
          totalImgHeightMm
        );
      } else {
        // Multi-page: slice canvas at page-height intervals
        let srcY = 0;
        let pageNum = 0;

        while (srcY < canvas.height) {
          if (pageNum > 0) pdf.addPage();

          const sliceH = Math.min(canvasPageHeightPx, canvas.height - srcY);
          const sliceMm = (sliceH * pageWidthMm) / canvas.width;

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            pdf.addImage(
              pageCanvas.toDataURL("image/png"),
              "PNG",
              0,
              0,
              imgWidth,
              sliceMm
            );
          }

          srcY += sliceH;
          pageNum++;
        }
      }

      setProgress(90);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename.endsWith(".pdf") ? filename : filename + ".pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMessage('PDF downloaded successfully!');
      setProgress(100);

      setTimeout(() => {
        onClose();
        onDownloadComplete?.();
      }, 1000);

    } catch (err: any) {
      console.error('PDF generation error:', err);
      setMessage(err?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
      document.querySelectorAll('.__pdf-export-clone').forEach(n => n.remove());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !generating) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={() => !generating && onClose()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div 
        className="relative z-60 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-2xl"
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            Download PDF
          </h2>
          <button
            onClick={() => !generating && onClose()}
            disabled={generating}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Filename */}
          <div>
            <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">
              Filename
            </label>
            <input
              id="filename"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={generating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter filename..."
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="orientation" className="block text-sm font-medium text-gray-700 mb-2">
                Orientation
              </label>
              <select
                id="orientation"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                disabled={generating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label htmlFor="pageSize" className="block text-sm font-medium text-gray-700 mb-2">
                Page Size
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as 'A4' | 'Letter')}
                disabled={generating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">Letter (216 × 279 mm)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality
              </label>
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                High (2x resolution)
              </div>
            </div>
          </div>

          {/* Progress */}
          {generating && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Generating PDF...</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-md text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Ensure fonts and images are fully loaded for best fidelity</p>
            <p>• Large resumes may take longer to generate</p>
            <p>• PDF will open in your browser's save dialog</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => !generating && onClose()}
            disabled={generating}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generatePdf}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate & Download'
            )}
          </button>
          <button
            onClick={() => { if (!generating) { setGenerating(true); openPrintPreviewForSelector(resumeSelector).catch(e => setMessage(e?.message || 'Failed to open print preview')).finally(()=>setGenerating(false)); } }}
            disabled={generating}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Open Print Preview
          </button>
        </div>
      </div>
    </div>
  );
}
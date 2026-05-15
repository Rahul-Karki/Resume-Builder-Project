import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { waitForFonts } from "../utils/enhancedPDFGenerator";

type Props = {
  open: boolean;
  onClose: () => void;
  resumeSelector: string;
  onDownloadComplete?: () => void;
};

const A4_W_PX = 794;
const A4_H_PX = 1123;

export default function EnhancedDownloadPdfModal({ open, onClose, resumeSelector, onDownloadComplete }: Props) {
  const [filename, setFilename] = useState("resume.pdf");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generatePdf = async () => {
    setGenerating(true);
    setMessage(null);
    setProgress(0);

    let wrapper: HTMLDivElement | null = null;

    try {
      const el = document.querySelector<HTMLElement>(resumeSelector);
      if (!el) throw new Error('Resume element not found');

      setMessage('Preparing layout...');
      setProgress(10);

      // ── Pre-compute styles from IN-DOM elements (always reliable) ──
      const origAll = [el, ...el.querySelectorAll<HTMLElement>('*')];
      const origStyles = origAll.map(e => window.getComputedStyle(e));

      // ── Clone — never modify the original DOM ──
      const clone = el.cloneNode(true) as HTMLElement;
      const cloneAll = [clone, ...clone.querySelectorAll<HTMLElement>('*')];

      // ── Fix transform/overflow on clone using ORIGINAL computed styles ──
      for (let i = 0; i < origAll.length && i < cloneAll.length; i++) {
        const os = origStyles[i];
        const c = cloneAll[i];

        // Fix overflow (class-based or inline)
        const ov = os.overflow;
        if (ov === 'hidden' || ov === 'scroll' || ov === 'auto') {
          c.style.overflow = 'visible';
        }

        // Fix transform
        const tr = os.transform;
        if (tr && tr !== 'none') {
          c.style.transform = 'none';
          c.style.webkitTransform = 'none';
        }
      }

      // Root-specific fixes
      clone.style.position = 'static';
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '0';

      // ── Place clone offscreen ──
      wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.zIndex = '-1000';
      wrapper.style.width = A4_W_PX + 'px';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Allow layout to settle
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 100));

      // ── Wait for fonts ──
      setMessage('Loading fonts...');
      setProgress(25);
      await document.fonts?.ready;
      await waitForFonts();

      // ── Copy computed background colors (only solid — never overwrite gradients) ──
      setMessage('Applying styles...');
      setProgress(35);

      for (let i = 0; i < origAll.length && i < cloneAll.length; i++) {
        const os = origStyles[i];
        const c = cloneAll[i];

        // backgroundColor: only if solid visible color
        const bg = os.backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== '') {
          c.style.backgroundColor = bg;
        }

        // boxShadow
        const shadow = os.boxShadow;
        if (shadow && shadow !== 'none') {
          c.style.boxShadow = shadow;
        }

        // Do NOT copy computed border shorthand — it overwrites
        // inline border-top/bottom/left/right on elements like <hr>.
        // Inline borders are preserved by cloneNode. Class-based borders
        // are preserved by className on the clone.
        const radius = os.borderRadius;
        if (radius && radius !== 'none' && radius !== '') {
          c.style.borderRadius = radius;
        }
      }

      // Ensure root has white background
      clone.style.backgroundColor = '#ffffff';

      // ── Measure + auto-scale to fit single A4 page ──
      const contentHeight = clone.scrollHeight;

      if (contentHeight > A4_H_PX) {
        const fitScale = A4_H_PX / contentHeight;
        const inner = document.createElement('div');
        inner.style.width = (A4_W_PX / fitScale) + 'px';
        inner.style.transformOrigin = 'top left';
        inner.style.transform = `scale(${fitScale})`;
        inner.style.overflow = 'visible';
        // Set background on inner to ensure full coverage
        inner.style.backgroundColor = '#ffffff';

        while (clone.firstChild) {
          inner.appendChild(clone.firstChild);
        }
        clone.appendChild(inner);
      }

      // ── Capture ──
      setMessage('Rendering canvas...');
      setProgress(50);

      // Ensure clean white backdrop
      clone.style.backgroundColor = '#ffffff';

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      // Remove clone from DOM
      wrapper.remove();
      wrapper = null;

      // ── Generate single-page PDF ──
      setMessage('Assembling PDF...');
      setProgress(70);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210, ph = 297;
      const imgW = pw;
      const imgH = (canvas.height * pw) / canvas.width;
      const pdfFitScale = Math.min(1, ph / imgH);
      const displayH = imgH * pdfFitScale;
      const offsetY = (ph - displayH) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, offsetY, imgW, displayH);

      // ── Download ──
      setProgress(90);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.pdf') ? filename : filename + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMessage('PDF downloaded successfully!');
      setProgress(100);
      setTimeout(() => { onClose(); onDownloadComplete?.(); }, 1000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setMessage(err?.message || 'Failed to generate PDF');
    } finally {
      if (wrapper) wrapper.remove();
      setGenerating(false);
    }
  };

  // ... JSX (unchanged)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !generating) onClose();
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !generating && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-60 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">Download PDF</h2>
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

        <div className="p-6 space-y-6">
          <div>
            <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-2">Filename</label>
            <input
              id="filename" type="text" value={filename}
              onChange={(e) => setFilename(e.target.value)}
              disabled={generating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="my-resume.pdf"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            Captures your on-screen resume at 3x resolution for crisp PDF output.
          </div>

          {generating && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Generating PDF...</span>
                <span className="text-gray-500">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {message && (
            <div className={`p-3 rounded-md text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => !generating && onClose()}
            disabled={generating}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generatePdf}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : "Generate & Download"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

export default function EnhancedDownloadPdfModal({ open, onClose, resumeSelector, onDownloadComplete }: Props) {
  const [filename, setFilename] = useState("resume.pdf");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generatePdf = async () => {
    setGenerating(true);
    setMessage(null);
    setProgress(0);

    try {
      const el = document.querySelector<HTMLElement>(resumeSelector);
      if (!el) throw new Error('Resume element not found');

      // ── Save original styles to restore after capture ──
      const origTransform = el.style.transform;
      const origOverflow = el.style.overflow;
      const origHeight = el.style.height;
      const origPos = el.style.position;

      // Find inner overflow:hidden container
      const inner = el.firstElementChild as HTMLElement | null;
      const origInnerOverflow = inner?.style.overflow;

      setMessage('Preparing layout...');
      setProgress(10);

      // Temporarily remove transform/overflow so html2canvas captures full-size content at 1:1
      el.style.transform = 'none';
      el.style.webkitTransform = 'none';
      el.style.overflow = 'visible';
      el.style.height = 'auto';
      if (inner) inner.style.overflow = 'visible';

      // Allow browser to re-layout
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => setTimeout(r, 50));

      // ── Wait for fonts ──
      setMessage('Loading fonts...');
      setProgress(25);
      await document.fonts?.ready;
      await waitForFonts();

      // ── Capture the EXACT rendered DOM ──
      setMessage('Rendering canvas...');
      setProgress(45);

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      // ── Restore original element styles immediately ──
      el.style.transform = origTransform;
      el.style.webkitTransform = origTransform;
      el.style.overflow = origOverflow;
      el.style.height = origHeight;
      el.style.position = origPos;
      if (inner) inner.style.overflow = origInnerOverflow || 'hidden';

      // ── Generate single-page PDF (scale to fit A4) ──
      setMessage('Assembling PDF...');
      setProgress(70);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = 210, ph = 297;
      const imgW = pw;
      const imgH = (canvas.height * pw) / canvas.width;
      const fitScale = Math.min(1, ph / imgH);
      const displayH = imgH * fitScale;
      // Center vertically if smaller than page
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
      // Restore styles in case of error
      try {
        const el = document.querySelector<HTMLElement>(resumeSelector);
        if (el) {
          el.style.transform = '';
          el.style.webkitTransform = '';
          el.style.overflow = '';
          el.style.height = '';
        }
      } catch {}
      setMessage(err?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

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
            Captures your on-screen resume directly at 3x resolution for crisp output.
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

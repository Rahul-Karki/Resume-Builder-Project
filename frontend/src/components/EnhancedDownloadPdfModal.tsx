import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useResumeBuilderStore } from "../store/useResumeBuilderStore";
import { ResumeRenderer } from "../templates/ResumeRenderer";
import { waitForFonts } from "../utils/enhancedPDFGenerator";
import { openPrintPreviewForSelector } from "../utils/printPreview";

type Props = {
  open: boolean;
  onClose: () => void;
  resumeSelector: string;
  onDownloadComplete?: () => void;
};

const A4_W_PX = 794;
const A4_H_PX = 1123;

export default function EnhancedDownloadPdfModal({ open, onClose, resumeSelector, onDownloadComplete }: Props) {
  const resume = useResumeBuilderStore((s) => s.resume);
  const captureRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const [filename, setFilename] = useState("resume.pdf");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fitScale, setFitScale] = useState(1);

  // Measure true content height and calculate fit scale once resume data is available
  useEffect(() => {
    if (!open || !resume || !captureRef.current) return;
    const el = captureRef.current;
    // Temporarily make measurable
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    el.style.width = A4_W_PX + 'px';
    el.style.height = 'auto';
    el.style.overflow = 'visible';
    el.style.transform = 'none';

    requestAnimationFrame(() => {
      const h = el.scrollHeight;
      const s = Math.min(1, A4_H_PX / h);
      setFitScale(s);
      // Put back to hidden
      el.style.display = 'none';
    });
  }, [open, resume]);

  const generatePdf = async () => {
    setGenerating(true);
    setMessage(null);
    setProgress(0);

    try {
      if (!scaleRef.current) throw new Error('Capture element not ready');

      setMessage('Waiting for fonts...');
      setProgress(15);
      await waitForFonts();
      await new Promise(r => requestAnimationFrame(r));

      setMessage('Rendering canvas...');
      setProgress(40);

      // Ensure container dimensions are correct for capture
      const container = scaleRef.current;
      container.style.transform = fitScale < 1 ? `scale(${fitScale})` : 'none';
      container.style.transformOrigin = 'top left';
      container.style.width = fitScale < 1 ? (A4_W_PX / fitScale) + 'px' : '100%';

      // The outer wrapper is exactly A4 size, inner is scaled
      const wrapper = container.parentElement!;
      wrapper.style.width = A4_W_PX + 'px';
      wrapper.style.height = A4_H_PX + 'px';
      wrapper.style.overflow = 'hidden';

      await new Promise(r => requestAnimationFrame(r));

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth: wrapper.scrollWidth,
        windowHeight: wrapper.scrollHeight,
      });

      setMessage('Assembling PDF...');
      setProgress(70);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pw = 210;
      const ph = 297;
      const imgW = pw;
      const imgH = (canvas.height * pw) / canvas.width;

      // Add image — should fit in one page since we scaled
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, Math.min(imgH, ph));

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

      {/* Hidden render at true A4 dimensions — measures scaling, then captures */}
      <div
        ref={captureRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: A4_W_PX,
          zIndex: -1000,
          display: "none",
          background: resume?.style?.backgroundColor ?? "#ffffff",
        }}
      >
        <div className="bg-white" style={{ width: A4_W_PX }}>
          {resume ? <ResumeRenderer resume={resume} /> : null}
        </div>
      </div>

      {/* Capture target: outer = A4 exact, inner = possibly scaled */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: "0",
          width: A4_W_PX,
          height: A4_H_PX,
          overflow: "hidden",
          background: resume?.style?.backgroundColor ?? "#ffffff",
          zIndex: -1000,
        }}
      >
        <div ref={scaleRef} className="bg-white" style={{ width: '100%' }}>
          {resume ? <ResumeRenderer resume={resume} /> : null}
        </div>
      </div>

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
            {fitScale < 1
              ? `Content scales to ${Math.round(fitScale * 100)}% to fit one A4 page.`
              : 'Resume fits perfectly on one A4 page.'}
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

          <div className="text-xs text-gray-500 space-y-1">
            <p>• PDF is generated from a fresh render matching your on-screen preview exactly</p>
            <p>• Content is auto-scaled to fit a single A4 page if needed</p>
          </div>
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
          <button
            onClick={() => {
              if (!generating) {
                setGenerating(true);
                openPrintPreviewForSelector(resumeSelector)
                  .catch(e => setMessage(e?.message || 'Failed to open print preview'))
                  .finally(() => setGenerating(false));
              }
            }}
            disabled={generating}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 disabled:opacity-50 transition-colors"
          >
            Open Print Preview
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Props = {
  open: boolean;
  onClose: () => void;
  resumeSelector: string;
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

  // Remove transforms and overflow:hidden so html2canvas captures at true size
  // Use getComputedStyle to detect styles from CSS classes (not just inline)
  const allClones = Array.from(clone.querySelectorAll<HTMLElement>("*"));
  for (const el of [clone, ...allClones]) {
    const cs = window.getComputedStyle(el);
    const tr = cs.transform;
    if (tr && tr !== "none") {
      el.style.transform = "none";
      el.style.webkitTransform = "none";
    }
    const ov = cs.overflow;
    if (ov === "hidden" || ov === "scroll" || ov === "auto") {
      el.style.overflow = "visible";
    }
  }
  // Remove fixed height so content flows naturally
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxHeight = "none";

  // mark clone for cleanup
  clone.classList.add('__pdf-export-clone');
  return clone;
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

function sliceCanvasToPages(canvas: HTMLCanvasElement, pageWidthPx: number, pageHeightPx: number) {
  const pages: string[] = [];
  const totalHeight = canvas.height;
  let startY = 0;
  while (startY < totalHeight) {
    const sliceH = Math.min(pageHeightPx, totalHeight - startY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = pageWidthPx;
    pageCanvas.height = sliceH;
    const ctx = pageCanvas.getContext("2d")!;
    ctx.drawImage(canvas, 0, startY, canvas.width, sliceH, 0, 0, pageWidthPx, sliceH);
    pages.push(pageCanvas.toDataURL("image/jpeg", 0.95));
    startY += sliceH;
  }
  return pages;
}

export default function DownloadPdfModal({ open, onClose, resumeSelector }: Props) {
  const [filename, setFilename] = useState("resume.pdf");
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generatePdf = async () => {
    setGenerating(true);
    setMessage('Preparing preview...');
    try {
      const root = document.querySelector<HTMLElement>(resumeSelector);
      if (!root) throw new Error('Resume element not found');

      const clone = cloneNodeWithInlineStyles(root);
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.zIndex = '-1000';
      document.body.appendChild(clone);

      setMessage('Inlining images...');
      await inlineImages(clone);

      setMessage('Waiting for fonts...');
      if ((document as any).fonts?.ready) {
        try { await (document as any).fonts.ready; } catch { /* ignore */ }
      }

      const mmToPx = (mm: number) => mm * (96 / 25.4);
      const pageWidthPx = mmToPx(orientation === 'portrait' ? 210 : 297);
      const pageHeightPx = mmToPx(orientation === 'portrait' ? 297 : 210);
      const scale = Math.min(2, window.devicePixelRatio || 1) * 2;

      setMessage('Rendering canvas...');
      const canvas = await html2canvas(clone, {
        scale,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const desiredWidthPx = Math.round(pageWidthPx * scale);
      const scaleFactor = desiredWidthPx / canvas.width;
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = Math.round(canvas.width * scaleFactor);
      renderCanvas.height = Math.round(canvas.height * scaleFactor);
      const rctx = renderCanvas.getContext('2d')!;
      rctx.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);

      setMessage('Slicing pages...');
      const pageHeightOnCanvasPx = Math.round(pageHeightPx * scaleFactor);
      const pages = sliceCanvasToPages(renderCanvas, renderCanvas.width, pageHeightOnCanvasPx);

      setMessage('Assembling PDF...');
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      const pageSize = pdf.internal.pageSize;
      const pageWpt = pageSize.getWidth();

      for (let i = 0; i < pages.length; i++) {
        const imgData = pages[i];
        if (i > 0) pdf.addPage();
        const img = new Image();
        await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); img.src = imgData; });
        const imgW = pageWpt;
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, (img.height * imgW) / img.width, undefined, 'FAST');
      }

      setMessage('Starting download...');
      pdf.save(filename);
      setMessage(null);
      onClose();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
      // cleanup clones
      document.querySelectorAll('.__pdf-export-clone').forEach(n => n.remove());
    }
  };

  const openPrintPreview = async () => {
    setGenerating(true);
    setMessage('Preparing print preview...');
    try {
      const root = document.querySelector<HTMLElement>(resumeSelector);
      if (!root) throw new Error('Resume element not found');

      const clone = cloneNodeWithInlineStyles(root);
      await inlineImages(clone);

      // Collect stylesheets and inline styles to include in the new window
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map((n) => (n as HTMLElement).outerHTML)
        .join('\n');

      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Failed to open print window');

      const doc = printWindow.document;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Print Preview</title>${styles}</head><body></body></html>`);
      doc.body.appendChild(clone);
      doc.close();
      printWindow.focus();

      // Give the new window a moment to load fonts and images, then open print dialog
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          // ignore
        }
      }, 250);

      onClose();
    } catch (err: any) {
      setMessage(err?.message || 'Failed to open print preview');
    } finally {
      setGenerating(false);
      document.querySelectorAll('.__pdf-export-clone').forEach(n => n.remove());
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => { if (!generating) onClose(); }} />
      <div role="dialog" aria-modal className="relative z-60 w-[min(880px,96%)] max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Download PDF</h3>
          <button className="text-gray-600" onClick={() => { if (!generating) onClose(); }} aria-label="Close">✕</button>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">Filename</label>
          <input className="w-full border rounded p-2" value={filename} onChange={(e) => setFilename(e.target.value)} />

          <div className="flex gap-3">
            <div>
              <label className="block text-sm">Orientation</label>
              <select className="mt-1 border rounded p-2" value={orientation} onChange={(e) => setOrientation(e.target.value as any)}>
                <option value="portrait">Portrait (A4)</option>
                <option value="landscape">Landscape (A4)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-3">
              <button
                disabled={generating}
                onClick={() => void openPrintPreview()}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
              >
                {generating ? <span className="loader mr-2" /> : null}
                Open Print Preview
              </button>
              <button className="px-3 py-2 border rounded" onClick={() => { if (!generating) onClose(); }}>Cancel</button>
            </div>
            {message ? <div className="mt-2 text-sm text-gray-700">{message}</div> : null}
            <div className="mt-2 text-xs text-gray-500">Tip: ensure fonts and images are loaded for best fidelity.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

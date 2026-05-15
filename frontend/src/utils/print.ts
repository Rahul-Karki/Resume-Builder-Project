export async function printResume(selector = '.resume-preview') {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error('Resume element not found for printing');

  // Wait for fonts to load so printed text matches screen
  if (document.fonts && (document.fonts as any).ready) {
    try { await (document.fonts as any).ready; } catch {}
  }

  // Wait for images inside resume to load (handles lazy images)
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(res => { img.onload = img.onerror = () => res(); });
  }));

  // Small delay to ensure styles/layout stabilized
  await new Promise((resolve) => setTimeout(resolve, 120));

  // Create a printable clone appended to body so it's not affected by hidden ancestors
  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.add('__print-clone');
  clone.setAttribute('aria-hidden', 'true');
  // ensure clone is direct child of body
  document.body.appendChild(clone);

  const printStyle = document.createElement('style');
  printStyle.setAttribute('data-print-helper', 'true');
  printStyle.textContent = `
    @page {
      size: A4;
      margin: 12mm;
    }

    @media print {
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      body > :not(.__print-clone):not(style):not(script) {
        visibility: hidden !important;
      }

      .__print-clone,
      .__print-clone * {
        visibility: visible !important;
      }

      .__print-clone {
        position: absolute !important;
        inset: 0 !important;
        left: 0 !important;
        top: 0 !important;
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        text-shadow: none !important;
        overflow: visible !important;
        transform: none !important;
      }

      .__print-clone,
      .__print-clone * {
        box-shadow: none !important;
      }

      .__print-clone img {
        max-width: 100% !important;
        height: auto !important;
      }

      .__print-clone h1,
      .__print-clone h2,
      .__print-clone h3,
      .__print-clone h4,
      .__print-clone h5,
      .__print-clone h6,
      .__print-clone p,
      .__print-clone ul,
      .__print-clone ol,
      .__print-clone li,
      .__print-clone section,
      .__print-clone article,
      .__print-clone header,
      .__print-clone footer,
      .__print-clone img,
      .__print-clone svg {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
  document.head.appendChild(printStyle);

  const cleanup = () => {
    try { clone.remove(); } catch {}
    try { printStyle.remove(); } catch {}
    try { window.removeEventListener('afterprint', cleanup); } catch {}
  };

  window.addEventListener('afterprint', cleanup);

  // Call print
  try {
    window.print();
  } finally {
    // Fallback cleanup
    setTimeout(cleanup, 1000);
  }
}

export default printResume;

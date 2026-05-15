export async function printResume(selector = '.resume-preview') {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error('Resume element not found for printing');

  // Wait for fonts to load so printed text matches screen
  await document.fonts?.ready;

  // Explicitly check key font families are actually loaded
  const usedFamilies = new Set<string>();
  const allEls = root.querySelectorAll<HTMLElement>('*');
  for (const el of [root, ...allEls]) {
    const ff = document.defaultView?.getComputedStyle(el).fontFamily;
    if (ff) usedFamilies.add(ff.split(',')[0].replace(/["']/g, '').trim());
  }
  await Promise.allSettled(
    Array.from(usedFamilies).map(f => document.fonts?.load(`1em "${f}"`))
  );

  // Wait for images inside resume to load
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(res => { img.onload = img.onerror = () => res(); });
  }));

  await new Promise(resolve => setTimeout(resolve, 200));

  // --- clone and measure true content height ---

  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.add('__print-clone');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('style, script').forEach((n) => n.remove());

  // Remove all transforms so we measure at 1:1
  clone.style.transform = 'none';
  clone.style.webkitTransform = 'none';
  // Remove any overflow hidden on the root and children so content flows naturally
  clone.style.overflow = 'visible';
  const allChildren = Array.from(clone.querySelectorAll<HTMLElement>('*'));
  for (const el of allChildren) {
    const cs = el.style;
    if (cs.overflow === 'hidden' || cs.overflow === 'scroll' || cs.overflow === 'auto') {
      cs.overflow = 'visible';
    }
    if (cs.transform && cs.transform !== 'none') {
      cs.transform = 'none';
      cs.webkitTransform = 'none';
    }
  }

  // Position offscreen to measure
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  document.body.appendChild(clone);

  // Measure true content height at 794px width (=210mm A4 width at 96dpi)
  const A4_W_PX = 794;
  const A4_H_PX = 1123;
  clone.style.width = A4_W_PX + 'px';
  const contentHeight = clone.scrollHeight;
  const fitScale = Math.min(1, A4_H_PX / contentHeight);

  // Remove measurement clone
  document.body.removeChild(clone);

  // --- rebuild clone for print with correct sizing ---

  // Re-clone fresh (measurement may have mutated inline styles)
  const printClone = root.cloneNode(true) as HTMLElement;
  printClone.classList.add('__print-clone');
  printClone.setAttribute('aria-hidden', 'true');
  printClone.querySelectorAll('style, script').forEach((n) => n.remove());

  // Set up for print: A4 container
  printClone.style.position = '';
  printClone.style.left = '';
  printClone.style.top = '';
  printClone.style.margin = '0';
  printClone.style.padding = '0';
  printClone.style.width = A4_W_PX + 'px';
  printClone.style.height = A4_H_PX + 'px';
  printClone.style.overflow = 'hidden';
  printClone.style.transform = 'none';
  printClone.style.webkitTransform = 'none';
  printClone.style.boxShadow = 'none';
  printClone.style.borderRadius = '0';

  // Scale inner content if it overflows A4 height
  const innerDiv = document.createElement('div');
  innerDiv.style.width = '100%';
  innerDiv.style.transformOrigin = 'top left';
  innerDiv.style.overflow = 'visible';
  if (fitScale < 1) {
    innerDiv.style.transform = `scale(${fitScale})`;
    innerDiv.style.width = (A4_W_PX / fitScale) + 'px';
  }

  // Move all children from clone into innerDiv
  while (printClone.firstChild) {
    innerDiv.appendChild(printClone.firstChild);
  }
  printClone.appendChild(innerDiv);

  document.body.appendChild(printClone);

  const printStyle = document.createElement('style');
  printStyle.setAttribute('data-print-helper', 'true');
  printStyle.textContent = `
    @page {
      size: A4;
      margin: 0;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        min-height: 297mm !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body > *:not(.__print-clone):not(style):not(script) {
        display: none !important;
      }
      .__print-clone,
      .__print-clone * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .__print-clone {
        display: block !important;
        margin: 0 auto !important;
        background: white !important;
      }
      .__print-clone img {
        max-width: 100% !important;
      }
    }
  `;
  document.head.appendChild(printStyle);

  const cleanup = () => {
    try { printClone.remove(); } catch {}
    try { printStyle.remove(); } catch {}
    try { window.removeEventListener('afterprint', cleanup); } catch {}
  };
  window.addEventListener('afterprint', cleanup);

  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1000);
  }
}

export default printResume;

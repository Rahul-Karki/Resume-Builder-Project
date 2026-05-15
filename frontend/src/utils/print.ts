export async function printResume(selector = '.resume-preview') {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error('Resume element not found for printing');

  // ── Wait for fonts ──
  await document.fonts?.ready;
  const usedFamilies = new Set<string>();
  const allEls = root.querySelectorAll<HTMLElement>('*');
  for (const el of [root, ...allEls]) {
    const ff = document.defaultView?.getComputedStyle(el).fontFamily;
    if (ff) usedFamilies.add(ff.split(',')[0].replace(/["']/g, '').trim());
  }
  await Promise.allSettled(
    Array.from(usedFamilies).map(f => document.fonts?.load(`1em "${f}"`))
  );

  // ── Wait for images ──
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(res => { img.onload = img.onerror = () => res(); });
  }));

  await new Promise(resolve => setTimeout(resolve, 200));

  // ── Pre-compute styles from IN-DOM elements (always reliable) ──
  const origAll = [root, ...root.querySelectorAll<HTMLElement>('*')];
  const origStyles = origAll.map(e => window.getComputedStyle(e));

  // ── Clone the visible DOM ──
  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.add('__print-clone');
  clone.querySelectorAll('style, script').forEach((n) => n.remove());
  const cloneAll = [clone, ...clone.querySelectorAll<HTMLElement>('*')];

  // ── Fix transform/overflow on clone using ORIGINAL computed styles ──
  for (let i = 0; i < origAll.length && i < cloneAll.length; i++) {
    const os = origStyles[i];
    const c = cloneAll[i];

    const ov = os.overflow;
    if (ov === 'hidden' || ov === 'scroll' || ov === 'auto') {
      c.style.overflow = 'visible';
    }
    const tr = os.transform;
    if (tr && tr !== 'none') {
      c.style.transform = 'none';
      c.style.webkitTransform = 'none';
    }
  }

  // ── Copy computed background colors (only solid — never overwrite gradients) ──
  for (let i = 0; i < origAll.length && i < cloneAll.length; i++) {
    const os = origStyles[i];
    const c = cloneAll[i];

    const bg = os.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== '') {
      c.style.backgroundColor = bg;
    }
    const shadow = os.boxShadow;
    if (shadow && shadow !== 'none') {
      c.style.boxShadow = shadow;
    }
    const radius = os.borderRadius;
    if (radius && radius !== 'none' && radius !== '') {
      c.style.borderRadius = radius;
    }
  }

  // ── Measure content at A4 width ──
  const A4_W_PX = 794;
  const A4_H_PX = 1123;

  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = A4_W_PX + 'px';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.backgroundColor = '#ffffff';
  document.body.appendChild(clone);

  const contentHeight = clone.scrollHeight;
  document.body.removeChild(clone);

  // ── Rebuild for print: outer A4 container, inner auto-scaled ──
  const printClone = root.cloneNode(true) as HTMLElement;
  printClone.classList.add('__print-clone');
  printClone.querySelectorAll('style, script').forEach((n) => n.remove());

  const pcAll = [printClone, ...printClone.querySelectorAll<HTMLElement>('*')];

  // Apply same fixes to printClone
  for (let i = 0; i < origAll.length && i < pcAll.length; i++) {
    const os = origStyles[i];
    const c = pcAll[i];

    const ov = os.overflow;
    if (ov === 'hidden' || ov === 'scroll' || ov === 'auto') {
      c.style.overflow = 'visible';
    }
    const tr = os.transform;
    if (tr && tr !== 'none') {
      c.style.transform = 'none';
      c.style.webkitTransform = 'none';
    }

    const bg = os.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== '') {
      c.style.backgroundColor = bg;
    }
    const shadow = os.boxShadow;
    if (shadow && shadow !== 'none') {
      c.style.boxShadow = shadow;
    }
    const radius = os.borderRadius;
    if (radius && radius !== 'none' && radius !== '') {
      c.style.borderRadius = radius;
    }
  }
  // Note: we do NOT copy computed border shorthand — it would overwrite
  // inline border-top/bottom/left/right on <hr> dividers and similar.
  // Inline borders are preserved by cloneNode. Class-based borders are
  // preserved by className.

  // Set printClone to A4 size
  printClone.style.width = A4_W_PX + 'px';
  printClone.style.height = A4_H_PX + 'px';
  printClone.style.overflow = 'hidden';
  printClone.style.margin = '0';
  printClone.style.padding = '0';
  printClone.style.boxSizing = 'border-box';
  printClone.style.backgroundColor = '#ffffff';
  printClone.style.boxShadow = 'none';
  printClone.style.borderRadius = '0';

  // Scale inner content to fit single page if needed
  const fitScale = Math.min(1, A4_H_PX / contentHeight);
  if (fitScale < 1) {
    const inner = document.createElement('div');
    inner.style.width = (A4_W_PX / fitScale) + 'px';
    inner.style.transformOrigin = 'top left';
    inner.style.transform = `scale(${fitScale})`;
    inner.style.overflow = 'visible';
    inner.style.backgroundColor = '#ffffff';
    while (printClone.firstChild) {
      inner.appendChild(printClone.firstChild);
    }
    printClone.appendChild(inner);
  }

  document.body.appendChild(printClone);

  // ── Inject print CSS ──
  const style = document.createElement('style');
  style.setAttribute('data-print-helper', 'true');
  style.textContent = `
    @page { size: A4; margin: 0; }
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
        visibility: hidden !important;
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
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .__print-clone * {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .__print-clone img {
        max-width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    try { printClone.remove(); } catch {}
    try { style.remove(); } catch {}
    try { window.removeEventListener('afterprint', cleanup); } catch {}
  };
  window.addEventListener('afterprint', cleanup);

  try { window.print(); }
  finally { setTimeout(cleanup, 1000); }
}

export default printResume;

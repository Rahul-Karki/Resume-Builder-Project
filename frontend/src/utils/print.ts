export async function printResume(selector = '.resume-preview') {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error('Resume element not found for printing');

  // Wait for fonts
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

  // Wait for images
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>(res => { img.onload = img.onerror = () => res(); });
  }));

  await new Promise(resolve => setTimeout(resolve, 200));

  // Clone the visible DOM (no separate render — exact same element tree)
  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.add('__print-clone');
  clone.querySelectorAll('style, script').forEach((n) => n.remove());

  // Remove all transforms and overflow:hidden so layout is at full 1:1 size
  clone.style.transform = 'none';
  clone.style.webkitTransform = 'none';
  clone.style.overflow = 'visible';
  const allChildren = Array.from(clone.querySelectorAll<HTMLElement>('*'));
  for (const el of allChildren) {
    const cs = window.getComputedStyle(el);
    if (cs.overflow === 'hidden' || cs.overflow === 'scroll' || cs.overflow === 'auto') {
      el.style.overflow = 'visible';
    }
    if (cs.transform && cs.transform !== 'none') {
      el.style.transform = 'none';
      el.style.webkitTransform = 'none';
    }
  }

  // Measure content at A4 width (794px @ 96dpi = 210mm)
  const A4_W_PX = 794;
  const A4_H_PX = 1123;
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = A4_W_PX + 'px';
  document.body.appendChild(clone);

  const contentHeight = clone.scrollHeight;
  const fitScale = Math.min(1, A4_H_PX / contentHeight);

  // Rebuild for print: outer A4 container, inner scaled content
  document.body.removeChild(clone);

  const printClone = root.cloneNode(true) as HTMLElement;
  printClone.classList.add('__print-clone');
  printClone.querySelectorAll('style, script').forEach((n) => n.remove());

  // Set printClone to A4 size with overflow hidden
  printClone.style.cssText = '';
  printClone.style.width = A4_W_PX + 'px';
  printClone.style.height = A4_H_PX + 'px';
  printClone.style.overflow = 'hidden';
  printClone.style.margin = '0';
  printClone.style.padding = '0';
  printClone.style.boxSizing = 'border-box';
  printClone.style.backgroundColor = '#ffffff';
  printClone.style.background = '#ffffff';

  // Fix overflow/transform on all children of the print clone
  for (const c of [printClone, ...printClone.querySelectorAll<HTMLElement>('*')]) {
    const ov = c.style.overflow;
    if (ov === 'hidden' || ov === 'scroll' || ov === 'auto') {
      c.style.overflow = 'visible';
    }
    const tr = c.style.transform;
    if (tr && tr !== 'none') {
      c.style.transform = 'none';
      c.style.webkitTransform = 'none';
    }
  }

  // ── Copy computed background colors to clone (only solid — never overwrite gradients) ──
  const originals = [root, ...root.querySelectorAll<HTMLElement>('*')];
  const clones = [printClone, ...printClone.querySelectorAll<HTMLElement>('*')];
  for (let i = 0; i < originals.length && i < clones.length; i++) {
    const cs = window.getComputedStyle(originals[i]);
    // Only copy backgroundColor if it's a solid visible color
    const bg = cs.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== '') {
      clones[i].style.backgroundColor = bg;
    }
    // Copy boxShadow if present
    const shadow = cs.boxShadow;
    if (shadow && shadow !== 'none') {
      clones[i].style.boxShadow = shadow;
    }
    // Copy border if present
    const border = cs.border;
    if (border && border !== 'none' && border !== '') {
      clones[i].style.border = border;
    }
    const radius = cs.borderRadius;
    if (radius && radius !== 'none' && radius !== '') {
      clones[i].style.borderRadius = radius;
    }
  }

  // Wrap all children in a scaled inner div
  const inner = document.createElement('div');
  inner.style.width = fitScale < 1 ? (A4_W_PX / fitScale) + 'px' : '100%';
  inner.style.transformOrigin = 'top left';
  if (fitScale < 1) inner.style.transform = `scale(${fitScale})`;
  inner.style.overflow = 'visible';

  while (printClone.firstChild) {
    inner.appendChild(printClone.firstChild);
  }
  printClone.appendChild(inner);
  document.body.appendChild(printClone);

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

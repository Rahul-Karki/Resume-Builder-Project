async function fetchImageAsDataUrl(url: string) {
  try {
    const resp = await fetch(url, { mode: 'cors' });
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
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  for (const img of imgs) {
    const src = img.getAttribute('src') ?? '';
    if (!src || src.startsWith('data:')) continue;
    try {
      const dataUrl = await fetchImageAsDataUrl(src);
      img.setAttribute('src', dataUrl);
    } catch {
      // ignore
    }
  }
}

function cloneNodeWithInlineStyles(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  const originals = Array.from(node.querySelectorAll<HTMLElement>('*'));
  const clones = Array.from(clone.querySelectorAll<HTMLElement>('*'));
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
  clone.classList.add('__pdf-export-clone');
  return clone;
}

export async function openPrintPreviewForSelector(selector: string) {
  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error('Resume element not found for print preview');

  const clone = cloneNodeWithInlineStyles(root);
  clone.style.position = 'static';

  await inlineImages(clone);

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

  setTimeout(() => {
    try { printWindow.print(); } catch { }
  }, 250);

  // cleanup marker elements in the parent document
  document.querySelectorAll('.__pdf-export-clone').forEach(n => n.remove());
}

export async function openPrintPreviewForElement(root: HTMLElement) {
  if (!root) throw new Error('Element not provided');
  const clone = cloneNodeWithInlineStyles(root);
  await inlineImages(clone);
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
  setTimeout(() => { try { printWindow.print(); } catch {} }, 250);
  document.querySelectorAll('.__pdf-export-clone').forEach(n => n.remove());
}

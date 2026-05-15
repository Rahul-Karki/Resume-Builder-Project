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
  await new Promise(r => setTimeout(r, 120));

  // Apply a temporary printing class so the on-screen preview matches printed layout
  const printingClass = 'printing';
  root.classList.add(printingClass);

  // Ensure we remove the class after printing — use afterprint if available
  const cleanup = () => {
    try { root.classList.remove(printingClass); } catch {}
    try { window.removeEventListener('afterprint', cleanup); } catch {}
  };
  window.addEventListener('afterprint', cleanup);

  // Call print (this blocks in many browsers until print dialog closes)
  try {
    window.print();
  } finally {
    // Fallback cleanup in case afterprint doesn't fire
    setTimeout(cleanup, 1000);
  }
}

export default printResume;

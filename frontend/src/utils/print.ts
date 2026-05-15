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

  // Create a printable clone appended to body so it's not affected by hidden ancestors
  const clone = root.cloneNode(true) as HTMLElement;
  clone.classList.add('__print-clone');
  clone.classList.add('printing');
  // ensure clone is direct child of body
  document.body.appendChild(clone);

  // Hide original to avoid duplication
  const originalVisibility = root.style.visibility;
  root.style.visibility = 'hidden';

  const cleanup = () => {
    try { root.style.visibility = originalVisibility || ''; } catch {}
    try { clone.remove(); } catch {}
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

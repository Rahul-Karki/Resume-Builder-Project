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

  window.print();
}

export default printResume;

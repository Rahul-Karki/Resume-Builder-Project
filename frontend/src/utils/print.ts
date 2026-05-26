import { A4_WIDTH_PX as A4_W_PX, A4_HEIGHT_PX as A4_H_PX } from "@/utils/resumePagination";

function shouldPreservePaginationTransforms(node: HTMLElement): boolean {
  return (
    node.hasAttribute("data-page-slice")
    || node.getAttribute("data-preserve-transform") === "true"
  );
}

function shouldPreservePaginationOverflow(node: HTMLElement): boolean {
  return (
    node.hasAttribute("data-resume-page")
    || node.hasAttribute("data-page-slice")
  );
}

function shouldPreserveBoxSizing(node: HTMLElement): boolean {
  return node.hasAttribute("data-page-slice");
}

function normalizeCloneTree(originalRoot: HTMLElement, cloneRoot: HTMLElement): void {
  const originalNodes = [originalRoot, ...Array.from(originalRoot.querySelectorAll<HTMLElement>("*"))];
  const cloneNodes = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  for (let i = 0; i < originalNodes.length && i < cloneNodes.length; i += 1) {
    const originalNode = originalNodes[i];
    const cloneNode = cloneNodes[i];
    const computed = window.getComputedStyle(originalNode);

    if (!shouldPreservePaginationOverflow(cloneNode)) {
      const overflow = computed.overflow;
      if (overflow === "hidden" || overflow === "scroll" || overflow === "auto") {
        cloneNode.style.overflow = "visible";
      }
    }

    if (!shouldPreservePaginationTransforms(cloneNode)) {
      const transform = computed.transform;
      if (transform && transform !== "none") {
        cloneNode.style.transform = "none";
        cloneNode.style.webkitTransform = "none";
      }
    }

    const background = computed.backgroundColor;
    if (background && background !== "transparent" && background !== "rgba(0, 0, 0, 0)") {
      cloneNode.style.backgroundColor = background;
    }

    const boxShadow = computed.boxShadow;
    if (boxShadow && boxShadow !== "none") {
      cloneNode.style.boxShadow = boxShadow;
    }

    const borderRadius = computed.borderRadius;
    if (borderRadius && borderRadius !== "none") {
      cloneNode.style.borderRadius = borderRadius;
    }
  }
}

export async function printResume(selector = ".resume-preview", resume?: unknown, preset = "default") {
  // If a resume object is provided, prefer server-rendered canonical HTML
  if (resume) {
    try {
      const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
      const resp = await fetch(`${apiBaseURL}/resumes/preview-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, preset }),
        credentials: 'include',
      });

      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}: ${resp.statusText}`);
      }

      const html = await resp.text();
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.zIndex = '999999';
      iframe.style.border = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error('Failed to create print iframe');
      doc.open();
      doc.write(html);
      doc.close();

      // wait for fonts and images inside iframe
      try {
        await new Promise<void>((resolve, reject) => {
          const win = iframe.contentWindow as Window | null;
          if (!win) return reject(new Error('No iframe window'));
          const onLoaded = () => resolve();
          // fonts
          (win as any).document.fonts?.ready?.then(onLoaded).catch(() => setTimeout(onLoaded, 250));
          // images fallback timeout
          setTimeout(onLoaded, 1200);
        });
      } catch {
        // continue even if resources didn't fully load
      }

      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => { try { iframe.remove(); } catch {} }, 800);
      }
      return;
    } catch (err) {
      // If selector is empty, it means we should ONLY use server HTML, so don't fallback to cloning
      if (!selector) {
        throw err;
      }
      // fallback to clone approach below
      // eslint-disable-next-line no-console
      console.warn('Server preview HTML unavailable, falling back to client clone', err);
    }
  }

  // If we reach here with empty selector, it's an error - selector must be provided for DOM cloning
  if (!selector) {
    throw new Error('No selector provided and server HTML unavailable');
  }

  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error("Resume element not found for printing");

  await document.fonts?.ready;

  const usedFamilies = new Set<string>();
  const allElements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const element of allElements) {
    const family = document.defaultView?.getComputedStyle(element).fontFamily;
    if (!family) continue;
    usedFamilies.add(family.split(",")[0].replace(/["']/g, "").trim());
  }
  await Promise.allSettled(
    Array.from(usedFamilies).map((family) => document.fonts?.load(`1em "${family}"`)),
  );

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.onload = image.onerror = () => resolve();
    });
  }));

  await new Promise((resolve) => setTimeout(resolve, 160));

  const printClone = root.cloneNode(true) as HTMLElement;
  printClone.classList.add("__print-clone");
  printClone.querySelectorAll("style, script").forEach((node) => node.remove());

  normalizeCloneTree(root, printClone);

  printClone.style.margin = "0";
  printClone.style.padding = "0";
  printClone.style.width = `${A4_W_PX}px`;
  printClone.style.maxWidth = `${A4_W_PX}px`;
  printClone.style.boxSizing = "border-box";
  printClone.style.background = "#ffffff";
  printClone.style.boxShadow = "none";
  printClone.style.borderRadius = "0";
  printClone.style.overflow = "visible";

  document.body.appendChild(printClone);

  const style = document.createElement("style");
  style.setAttribute("data-print-helper", "true");
  style.textContent = `
    @page { size: ${A4_W_PX}px ${A4_H_PX}px; margin: 0; }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${A4_W_PX}px !important;
        min-height: ${A4_H_PX}px !important;
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
        width: ${A4_W_PX}px !important;
        max-width: ${A4_W_PX}px !important;
        background: white !important;
      }

      .__print-clone [data-resume-page] {
        width: ${A4_W_PX}px !important;
        height: ${A4_H_PX}px !important;
        overflow: hidden !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-before: auto !important;
      }
      .__print-clone [data-resume-page]:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .__print-clone [data-preview-scale] {
        width: ${A4_W_PX}px !important;
        height: ${A4_H_PX}px !important;
        transform: none !important;
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
        width: 210mm !important;
        max-width: 210mm !important;
        background: white !important;
      }

      /* Page containers — each rendered page prints on its own sheet */
      .__print-clone [data-resume-page] {
        width: 210mm !important;
        height: 297mm !important;
        overflow: hidden !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-before: auto !important;
      }
      .__print-clone [data-resume-page]:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      .__print-clone [data-preview-scale] {
        width: ${A4_W_PX}px !important;
        height: ${A4_H_PX}px !important;
        transform: none !important;
      }

      /* Never break inside section containers, articles, list items, or paragraphs */
      .__print-clone section,
      .__print-clone article,
      .__print-clone li,
      .__print-clone p,
      .__print-clone [data-pagination-block] {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Never break immediately after a heading */
      .__print-clone h1,
      .__print-clone h2,
      .__print-clone h3,
      .__print-clone h4,
      .__print-clone h5,
      .__print-clone h6,
      .__print-clone [class*="section-title"],
      .__print-clone [class*="sectionTitle"],
      .__print-clone [class*="heading"],
      .__print-clone [class*="label"] {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      /* Never start a new page before a section heading if it can fit on current page */
      .__print-clone section,
      .__print-clone [class*="section"],
      .__print-clone [class*="mod-section"],
      .__print-clone [class*="exec-section"],
      .__print-clone [class*="comp-row"] {
        page-break-before: auto !important;
      }

      .__print-clone img {
        max-width: 100% !important;
      }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    try { printClone.remove(); } catch { /* ignore */ }
    try { style.remove(); } catch { /* ignore */ }
    try { window.removeEventListener("afterprint", cleanup); } catch { /* ignore */ }
  };

  window.addEventListener("afterprint", cleanup);

  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1200);
  }
}

export default printResume;

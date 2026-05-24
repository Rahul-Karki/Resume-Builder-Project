const A4_W_PX = 794;
const A4_H_PX = 1123;

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

export async function printResume(selector = ".resume-preview") {
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
        width: 210mm !important;
        max-width: 210mm !important;
        background: white !important;
      }
      .__print-clone [data-resume-page] {
        width: 210mm !important;
        height: 297mm !important;
        overflow: hidden !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
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
      .__print-clone section,
      .__print-clone article,
      .__print-clone li,
      .__print-clone [data-pagination-block] {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .__print-clone .resume-page-continued {
        display: block !important;
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

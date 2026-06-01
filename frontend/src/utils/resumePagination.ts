export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const CONTENT_HEIGHT_PX = A4_HEIGHT_PX;

export function parsePageMarginTop(marginValue: string | undefined): number {
  if (!marginValue) return 0;
  const match = marginValue.match(/^(\d+)px/);
  return match ? parseInt(match[1], 10) : 0;
}

export function getEffectivePageHeight(pageMarginTop: number): number {
  return A4_HEIGHT_PX - pageMarginTop;
}

function getTopOffset(root: HTMLElement, node: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return Math.round(nodeRect.top - rootRect.top);
}

function isVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    parseFloat(style.opacity) > 0 &&
    el.offsetHeight > 0
  );
}

function collectBreakCandidates(root: HTMLElement): number[] {
  const result: Set<number> = new Set();
  const totalHeight = root.scrollHeight;

  const add = (offset: number) => {
    const r = Math.round(offset);
    if (r > 0 && r < totalHeight - 32) result.add(r);
  };

  const selectors = [
    /* Entry wrappers */
    "[class*='job']", "[class*='entry']", "[class*='item']",
    "[class*='project']", "[data-pagination-entry]",
    /* Section wrappers and headings */
    "[class*='section']", "[class*='sec-']", "section",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "[class*='section-title']", "[class*='heading']", "[class*='label']",
    /* Fine-grained content blocks inside entries */
    "li", "p",
    "[class*='bullet']", "[class*='desc']", "[class*='body']",
    "[class*='head']", "[class*='sub']",
    "[class*='company']", "[class*='role']", "[class*='date']",
    "[class*='location']", "[class*='school']", "[class*='degree']",
  ].join(",");

  root.querySelectorAll(selectors).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisible(node)) return;
    add(getTopOffset(root, node));
  });

  const sorted = [...result].sort((a, b) => a - b);

  /* Deduplicate: keep only the earliest candidate within 20px */
  const MIN_SPACING = 20;
  const deduped: number[] = [];
  for (const c of sorted) {
    if (!deduped.length || c - deduped[deduped.length - 1] >= MIN_SPACING) {
      deduped.push(c);
    }
  }

  return deduped;
}

export function computePageOffsets(
  totalHeight: number,
  pageHeight: number,
  candidates: number[],
): number[] {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return [0];
  if (totalHeight <= pageHeight) return [0];

  const sortedCandidates = candidates.filter(
    (c) => c > 0 && c < totalHeight,
  ).sort((a, b) => a - b);

  const offsets: number[] = [0];
  let cursor = 0;
  const maxPages = Math.ceil(totalHeight / (pageHeight * 0.5)) + 4;

  for (let i = 0; i < maxPages; i++) {
    const idealBreak = cursor + pageHeight;
    if (idealBreak >= totalHeight) break;

    /* Find the last safe candidate ≤ idealBreak */
    let breakPoint = idealBreak;
    for (const c of sortedCandidates) {
      if (c > cursor && c <= idealBreak) {
        breakPoint = c;
      }
    }

    breakPoint = Math.max(breakPoint, cursor + 32);
    breakPoint = Math.min(breakPoint, totalHeight);

    offsets.push(Math.round(breakPoint));
    cursor = breakPoint;
  }

  return offsets;
}

export function buildPageOffsetsFromElement(
  root: HTMLElement,
  pageHeight: number = CONTENT_HEIGHT_PX,
): number[] {
  const totalHeight = root.scrollHeight;
  if (totalHeight <= pageHeight) return [0];
  const candidates = collectBreakCandidates(root);
  return computePageOffsets(totalHeight, pageHeight, candidates);
}

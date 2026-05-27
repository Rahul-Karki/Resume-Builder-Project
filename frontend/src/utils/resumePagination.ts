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

function roundPx(v: number): number {
  return Math.round(v);
}

function getTopOffset(root: HTMLElement, node: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return roundPx(nodeRect.top - rootRect.top);
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

function collectSectionCandidates(root: HTMLElement): Set<number> {
  const candidates = new Set<number>();
  const totalHeight = root.scrollHeight;

  const addIfValid = (offset: number) => {
    const r = roundPx(offset);
    if (r > 0 && r < totalHeight - 32) candidates.add(r);
  };

  const sectionSelectors = [
    "section",
    "article",
    "header",
    "[class*='mod-section']",
    "[class*='exec-section']",
    "[class*='comp-row']",
    "[class*='classic-section']",
    "[class*='side-section']",
    "[class*='side-left-section']",
    "[class*='section']",
    "[class*='sec-']",
    "[class*='cmb-sec']",
    "[class*='chr-sec']",
    "[data-pagination-section]",
  ].join(",");

  root.querySelectorAll(sectionSelectors).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisible(node)) return;
    if (node.parentElement && node.parentElement !== root) {
      const parentSections = node.parentElement.closest(sectionSelectors);
      if (parentSections && parentSections !== root) return;
    }
    addIfValid(getTopOffset(root, node));
  });

  const headingSelectors = ["h1", "h2", "h3", "h4", "h5", "h6", "[class*='section-title']", "[class*='sectionTitle']", "[class*='heading']", "[class*='label']"].join(",");
  root.querySelectorAll(headingSelectors).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisible(node)) return;
    const parent = node.parentElement;
    if (parent && parent !== root) {
      const parentSection = parent.closest(sectionSelectors);
      if (parentSection && parentSection !== root) return;
    }
    addIfValid(getTopOffset(root, node));
  });

  root.querySelectorAll("[class*='job'], [class*='entry'], [class*='item'], [class*='project'], [data-pagination-entry]").forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisible(node) || node.offsetHeight < 20) return;
    addIfValid(getTopOffset(root, node));
  });

  return candidates;
}

function findBestBreak(
  candidates: number[],
  pageStart: number,
  pageHeight: number,
): number {
  const idealBreak = pageStart + pageHeight;
  const minBreak = pageStart + Math.round(pageHeight * 0.6);

  const before = candidates.filter((p) => p >= minBreak && p <= idealBreak);
  if (before.length > 0) return before[before.length - 1];

  return idealBreak;
}

export function computePageOffsets(
  totalHeight: number,
  pageHeight: number,
  candidates: number[],
  pageMarginTop: number = 0,
): number[] {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return [0];
  if (totalHeight <= pageHeight) return [0];

  const sortedCandidates = [...new Set(candidates)]
    .filter((p) => p > 0 && p < totalHeight)
    .sort((a, b) => a - b);

  const offsets: number[] = [0];
  let cursor = 0;
  const maxPages = Math.ceil(totalHeight / (pageHeight * 0.5)) + 4;

  for (let i = 0; i < maxPages; i++) {
    const effectivePageHeight = i === 0 ? pageHeight : pageHeight - pageMarginTop;
    if (cursor + effectivePageHeight >= totalHeight) break;

    const breakPoint = findBestBreak(sortedCandidates, cursor, effectivePageHeight);
    const clampedBreak = Math.min(Math.max(breakPoint, cursor + 32), totalHeight);

    offsets.push(roundPx(clampedBreak));
    cursor = clampedBreak;
  }

  return offsets;
}

export function buildPageOffsetsFromElement(
  root: HTMLElement,
  pageHeight: number = CONTENT_HEIGHT_PX,
  pageMarginTop: number = 0,
): number[] {
  const totalHeight = root.scrollHeight;

  if (totalHeight <= pageHeight) {
    return [0];
  }

  const candidateSet = collectSectionCandidates(root);
  const candidates = Array.from(candidateSet).sort((a, b) => a - b);
  return computePageOffsets(totalHeight, pageHeight, candidates, pageMarginTop);
}

export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;
export const CONTENT_HEIGHT_PX = A4_HEIGHT_PX;

/** Minimum gap threshold in px — if a break candidate would leave more
 *  empty space than this (because it's a section boundary far from the
 *  preceding content), we fall back to the page boundary to avoid waste. */
const MAX_ACCEPTABLE_GAP_PX = 30;

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

interface CandidateInfo {
  offset: number;
  /** 'entry' – individual repeatable item (job, project, edu, cert);
   *  'section' – section wrapper or heading boundary */
  kind: "entry" | "section";
}

/** Collect structural break candidates from the rendered DOM.
 *
 *  Returns them sorted with metadata so the break-finder can prefer
 *  finer-grained (entry) breaks over coarse (section) breaks. */
function collectBreakCandidates(root: HTMLElement): CandidateInfo[] {
  const result: CandidateInfo[] = [];
  const totalHeight = root.scrollHeight;
  const seen = new Set<number>();

  const add = (offset: number, kind: "entry" | "section") => {
    const r = roundPx(offset);
    if (r > 0 && r < totalHeight - 32 && !seen.has(r)) {
      seen.add(r);
      result.push({ offset: r, kind });
    }
  };

  /* --- section-level boundaries --- */
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
    add(getTopOffset(root, node), "section");
  });

  /* --- section heading boundaries --- */
  const headingSelectors = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "[class*='section-title']", "[class*='sectionTitle']",
    "[class*='heading']", "[class*='label']",
  ].join(",");

  root.querySelectorAll(headingSelectors).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisible(node)) return;
    const parent = node.parentElement;
    if (parent && parent !== root) {
      const parentSection = parent.closest(sectionSelectors);
      if (parentSection && parentSection !== root) return;
    }
    add(getTopOffset(root, node), "section");
  });

  /* --- individual, repeatable entry boundaries (jobs, projects, edu, certs) --- */
  const entrySelectors = [
    "[class*='job']",
    "[class*='entry']",
    "[class*='item']",
    "[class*='project']",
    "[data-pagination-entry]",
  ].join(",");

  root.querySelectorAll(entrySelectors).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisible(node) || node.offsetHeight < 20) return;
    add(getTopOffset(root, node), "entry");
  });

  /* --- stable sort: offset asc, entries before sections at same offset --- */
  result.sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return a.kind === "entry" ? -1 : 1;
  });

  return result;
}

/**
 * Smart break-finder that avoids wasteful gaps.
 *
 * Strategy:
 *  1. Scan candidates that fall inside the page window.
 *  2. Prefer ENTRY breaks near the bottom of the page (≤25% waste).
 *     Entry breaks within a section mean content flows naturally across
 *     pages instead of whole sections being pushed down.
 *  3. If no good entry break, try SECTION breaks very close to ideal
 *     (≤5% waste) that don't create large gaps from preceding content.
 *  4. Fall back to the natural page boundary (idealBreak).
 */
function findBestBreak(
  candidates: CandidateInfo[],
  pageStart: number,
  pageHeight: number,
): number {
  const idealBreak = pageStart + pageHeight;
  const minBreak = pageStart + Math.round(pageHeight * 0.5);
  const windowEnd = idealBreak;

  const inWindow = candidates.filter(
    (c) => c.offset >= minBreak && c.offset <= windowEnd,
  );

  /* --- Entry breaks near the bottom of the page --- */
  for (let i = inWindow.length - 1; i >= 0; i--) {
    const c = inWindow[i];
    if (c.kind !== "entry") continue;
    const wasteRatio = (idealBreak - c.offset) / pageHeight;
    if (wasteRatio <= 0.25) return c.offset;
  }

  /* --- Section breaks very close to ideal --- */
  for (let i = inWindow.length - 1; i >= 0; i--) {
    const c = inWindow[i];
    if (c.kind !== "section") continue;
    const wasteRatio = (idealBreak - c.offset) / pageHeight;
    if (wasteRatio <= 0.05) {
      /* Check gap from preceding content */
      const prevIdx = candidates.indexOf(c) - 1;
      const prevEnd = prevIdx >= 0 ? candidates[prevIdx].offset : pageStart;
      const gap = c.offset - prevEnd;
      if (gap <= MAX_ACCEPTABLE_GAP_PX) return c.offset;
    }
  }

  /* --- Fall back to the natural page boundary --- */
  return idealBreak;
}

export function computePageOffsets(
  totalHeight: number,
  pageHeight: number,
  candidates: CandidateInfo[],
  pageMarginTop: number = 0,
): number[] {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return [0];
  if (totalHeight <= pageHeight) return [0];

  const sortedCandidates = candidates.filter(
    (c) => c.offset > 0 && c.offset < totalHeight,
  );

  const offsets: number[] = [0];
  let cursor = 0;
  const maxPages = Math.ceil(totalHeight / (pageHeight * 0.5)) + 4;

  for (let i = 0; i < maxPages; i++) {
    const effectivePageHeight =
      i === 0 ? pageHeight : pageHeight - pageMarginTop;
    if (cursor + effectivePageHeight >= totalHeight) break;

    const breakPoint = findBestBreak(
      sortedCandidates,
      cursor,
      effectivePageHeight,
    );
    const clampedBreak = Math.min(
      Math.max(breakPoint, cursor + 32),
      totalHeight,
    );

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

  const candidates = collectBreakCandidates(root);
  return computePageOffsets(
    totalHeight,
    pageHeight,
    candidates,
    pageMarginTop,
  );
}

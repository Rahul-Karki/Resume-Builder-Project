export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const MIN_PAGE_FILL_RATIO = 0.55;
const MAX_FORWARD_SHIFT_RATIO = 0.22;
const MIN_PAGE_DELTA_PX = 64;

const BLOCK_SELECTORS = [
  "section",
  "article",
  "header",
  "li",
  "[data-pagination-block]",
  "[class*='section']",
  "[class*='job']",
  "[class*='entry']",
  "[class*='project']",
  "[class*='proj']",
  "[class*='skill']",
  "[class*='cert']",
  "[class*='edu']",
].join(",");

function roundPx(value: number): number {
  return Math.round(value);
}

function getTopOffset(root: HTMLElement, node: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return roundPx(nodeRect.top - rootRect.top);
}

function isBlockCandidate(node: HTMLElement): boolean {
  const tagName = node.tagName.toLowerCase();
  if (tagName === "section" || tagName === "article" || tagName === "header") {
    return true;
  }

  const style = window.getComputedStyle(node);
  if (style.display === "inline" || style.display === "contents") {
    return false;
  }

  return node.offsetHeight >= 18;
}

export function collectPaginationCandidates(root: HTMLElement): number[] {
  const totalHeight = root.scrollHeight;
  const candidates = new Set<number>();

  const addCandidate = (value: number) => {
    if (value <= 0 || value >= totalHeight - MIN_PAGE_DELTA_PX) return;
    candidates.add(roundPx(value));
  };

  Array.from(root.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      addCandidate(getTopOffset(root, child));
    }
  });

  root.querySelectorAll(BLOCK_SELECTORS).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (!isBlockCandidate(node)) return;
    addCandidate(getTopOffset(root, node));
  });

  return Array.from(candidates).sort((a, b) => a - b);
}

export function computePageOffsets(
  totalHeight: number,
  pageHeight: number,
  candidates: number[],
): number[] {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return [0];
  if (!Number.isFinite(pageHeight) || pageHeight <= 0) return [0];

  const safeTotalHeight = roundPx(totalHeight);
  if (safeTotalHeight <= pageHeight) return [0];

  const normalizedCandidates = candidates
    .filter((point) => Number.isFinite(point) && point > 0 && point < safeTotalHeight)
    .sort((a, b) => a - b);

  const offsets: number[] = [0];
  let cursor = 0;
  const maxIterations = Math.ceil(safeTotalHeight / MIN_PAGE_DELTA_PX) + 4;

  for (let i = 0; i < maxIterations; i += 1) {
    if (cursor + pageHeight >= safeTotalHeight) break;

    const idealBreak = cursor + pageHeight;
    const minimumAllowed = cursor + Math.floor(pageHeight * MIN_PAGE_FILL_RATIO);
    const minimumDelta = cursor + MIN_PAGE_DELTA_PX;
    const minimumBreak = Math.max(minimumAllowed, minimumDelta);

    let nextBreak = idealBreak;

    const beforeIdeal = normalizedCandidates.filter(
      (point) => point >= minimumBreak && point <= idealBreak,
    );
    if (beforeIdeal.length > 0) {
      nextBreak = beforeIdeal[beforeIdeal.length - 1];
    } else {
      const afterIdeal = normalizedCandidates.find((point) => point > idealBreak);
      const maxForward = idealBreak + Math.floor(pageHeight * MAX_FORWARD_SHIFT_RATIO);
      if (afterIdeal && afterIdeal <= maxForward) {
        nextBreak = afterIdeal;
      }
    }

    if (nextBreak <= cursor + MIN_PAGE_DELTA_PX) {
      nextBreak = idealBreak;
    }

    nextBreak = Math.min(Math.max(nextBreak, cursor + 1), safeTotalHeight);
    offsets.push(roundPx(nextBreak));
    cursor = nextBreak;
  }

  return offsets;
}

export function buildPageOffsetsFromElement(
  root: HTMLElement,
  pageHeight: number = A4_HEIGHT_PX,
): number[] {
  const totalHeight = root.scrollHeight;
  const candidates = collectPaginationCandidates(root);
  return computePageOffsets(totalHeight, pageHeight, candidates);
}

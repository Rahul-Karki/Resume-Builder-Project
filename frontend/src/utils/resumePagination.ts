export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const MIN_PAGE_FILL_RATIO = 0.72;
const MAX_FORWARD_SHIFT_RATIO = 0.22;
const MIN_PAGE_DELTA_PX = 64;
const ORPHAN_PROTECTION_ZONE = 50;
const CLIP_SAFETY_MARGIN = 4;

function roundPx(value: number): number {
  return Math.round(value);
}

function getTopOffset(root: HTMLElement, node: HTMLElement): number {
  const rootRect = root.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  return roundPx(nodeRect.top - rootRect.top);
}

function getBottomOffset(root: HTMLElement, node: HTMLElement): number {
  return roundPx(getTopOffset(root, node) + node.offsetHeight);
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

interface PaginationCandidates {
  section: number[];
  entry: number[];
  fine: number[];
}

export function collectPaginationCandidates(root: HTMLElement): PaginationCandidates {
  const totalHeight = root.scrollHeight;
  const sectionSet = new Set<number>();
  const entrySet = new Set<number>();
  const fineSet = new Set<number>();

  const add = (set: Set<number>, value: number) => {
    const r = roundPx(value);
    if (r > 0 && r < totalHeight - MIN_PAGE_DELTA_PX) set.add(r);
  };

  // Tier 1: Direct children of root (section-level blocks)
  Array.from(root.children).forEach((child) => {
    if (child instanceof HTMLElement) add(sectionSet, getTopOffset(root, child));
  });

  // Also match section-like containers deeper in the tree
  root.querySelectorAll(
    "section, article, [class*='mod-section'], [class*='exec-section'], [class*='comp-row'], [class*='section'], [class*='sec'], [data-pagination-section]",
  ).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (root !== node.parentElement) add(sectionSet, getTopOffset(root, node));
  });

  // Tier 2: Entry boundaries (individual job/project/edu entries within sections)
  root.querySelectorAll(
    "[class*='mod-job'], [class*='mod-proj'], [class*='exec-job'], [class*='exec-proj'], [class*='comp-job'], [class*='comp-proj'], [class*='job'], [class*='project'], [class*='entry'], [class*='item'], [class*='row'], [data-pagination-entry]",
  ).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isBlockCandidate(node)) return;
    const parent = node.parentElement;
    if (parent && parent !== root) add(entrySet, getTopOffset(root, node));
  });

  // Tier 3: Fine-grained (paragraphs, list items, explicit break markers)
  root.querySelectorAll("p, li, [data-pagination-block]").forEach((node) => {
    if (!(node instanceof HTMLElement) || !isBlockCandidate(node)) return;
    add(fineSet, getTopOffset(root, node));
  });

  return {
    section: Array.from(sectionSet).sort((a, b) => a - b),
    entry: Array.from(entrySet).sort((a, b) => a - b),
    fine: Array.from(fineSet).sort((a, b) => a - b),
  };
}

function findBestBreak(
  candidates: number[],
  minimum: number,
  ideal: number,
  maxForward: number,
): number | null {
  const before = candidates.filter((p) => p >= minimum && p <= ideal);
  if (before.length > 0) return before[before.length - 1];
  const after = candidates.find((p) => p > ideal && p <= maxForward);
  return after !== undefined ? after : null;
}

export function computePageOffsets(
  totalHeight: number,
  pageHeight: number,
  candidates: PaginationCandidates,
): number[] {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return [0];
  if (!Number.isFinite(pageHeight) || pageHeight <= 0) return [0];

  const safeTotalHeight = roundPx(totalHeight);
  if (safeTotalHeight <= pageHeight) return [0];

  const merge = (arr: number[]) =>
    arr
      .filter((p) => Number.isFinite(p) && p > 0 && p < safeTotalHeight)
      .sort((a, b) => a - b);

  const sections = merge(candidates.section);
  const entries = merge(candidates.entry);
  const allCandidates = merge([
    ...candidates.section,
    ...candidates.entry,
    ...candidates.fine,
  ]);

  const offsets: number[] = [0];
  let cursor = 0;
  const maxIterations = Math.ceil(safeTotalHeight / MIN_PAGE_DELTA_PX) + 4;

  for (let i = 0; i < maxIterations; i++) {
    if (cursor + pageHeight >= safeTotalHeight) break;

    const idealBreak = cursor + pageHeight;
    const minimumBreak = Math.max(
      cursor + Math.floor(pageHeight * MIN_PAGE_FILL_RATIO),
      cursor + MIN_PAGE_DELTA_PX,
    );
    const maxForward = idealBreak + Math.floor(pageHeight * MAX_FORWARD_SHIFT_RATIO);

    // Tier 1: Prefer section-level breaks
    let nextBreak = findBestBreak(sections, minimumBreak, idealBreak, maxForward);

    // Tier 2: Fall through to entry-level breaks (individual jobs/projects)
    if (nextBreak === null) {
      nextBreak = findBestBreak(entries, minimumBreak, idealBreak, maxForward);
    }

    // Tier 3: Fall through to any candidate (paragraphs, list items, etc.)
    if (nextBreak === null) {
      nextBreak = findBestBreak(allCandidates, minimumBreak, idealBreak, maxForward);
    }

    // Fallback: find the nearest element start after idealBreak
    if (nextBreak === null) {
      const nearestAfter = allCandidates.find((p) => p > idealBreak);
      if (nearestAfter && nearestAfter <= cursor + pageHeight + 300) {
        nextBreak = nearestAfter;
      } else {
        nextBreak = idealBreak;
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

function findOrphanSectionStart(
  root: HTMLElement,
  pageStart: number,
  pageEnd: number,
): number | null {
  const headingSelectors = [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "[class*='section-title']", "[class*='sectionTitle']",
    "[class*='mod-section-title']",
    "[class*='exec-section-title']", "[class*='comp-label']",
    "[class*='heading']", "[class*='title']",
  ].join(",");

  const headings = root.querySelectorAll(headingSelectors);
  for (const heading of headings) {
    if (!(heading instanceof HTMLElement)) continue;
    const top = getTopOffset(root, heading);
    const bottom = top + heading.offsetHeight;

    if (top >= pageStart && top < pageEnd && bottom < pageEnd) {
      const distanceFromEnd = pageEnd - bottom;
      if (distanceFromEnd < ORPHAN_PROTECTION_ZONE) {
        const sectionParent = heading.closest(
          "section, [class*='mod-section'], [class*='exec-section'], [class*='comp-row'], [class*='section'], [class*='sec'], [data-pagination-section]",
        );
        if (sectionParent instanceof HTMLElement) {
          return getTopOffset(root, sectionParent);
        }
      }
    }
  }
  return null;
}

function findClippedElementBreak(
  root: HTMLElement,
  pageStart: number,
  pageEnd: number,
): number | null {
  const clipSelectors = "p, li, [data-pagination-block]";
  const elements = root.querySelectorAll(clipSelectors);
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    const top = getTopOffset(root, el);
    const bottom = getBottomOffset(root, el);

    if (top < pageEnd && bottom > pageEnd + CLIP_SAFETY_MARGIN) {
      return top;
    }
  }
  return null;
}

function enforceCleanBreaks(
  root: HTMLElement,
  pageHeight: number,
  offsets: number[],
): number[] {
  if (offsets.length <= 2) return offsets;

  const result: number[] = [offsets[0]];
  for (let i = 1; i < offsets.length; i++) {
    const currentPageStart = result[result.length - 1];
    const nextOriginalOffset = offsets[i];

    const clippedElementStart = findClippedElementBreak(root, currentPageStart, nextOriginalOffset);
    if (clippedElementStart !== null && clippedElementStart > currentPageStart) {
      const minBreak = currentPageStart + Math.floor(pageHeight * MIN_PAGE_FILL_RATIO);
      if (clippedElementStart >= minBreak) {
        result.push(clippedElementStart);
        continue;
      }
    }

    const orphanSectionStart = findOrphanSectionStart(root, currentPageStart, nextOriginalOffset);
    if (orphanSectionStart !== null && orphanSectionStart > currentPageStart) {
      const minBreak = currentPageStart + Math.floor(pageHeight * MIN_PAGE_FILL_RATIO);
      if (orphanSectionStart >= minBreak) {
        result.push(orphanSectionStart);
        continue;
      }
    }

    result.push(nextOriginalOffset);
  }

  return result;
}

export function buildPageOffsetsFromElement(
  root: HTMLElement,
  pageHeight: number = A4_HEIGHT_PX,
): number[] {
  const totalHeight = root.scrollHeight;
  const candidates = collectPaginationCandidates(root);
  const offsets = computePageOffsets(totalHeight, pageHeight, candidates);
  return enforceCleanBreaks(root, pageHeight, offsets);
}

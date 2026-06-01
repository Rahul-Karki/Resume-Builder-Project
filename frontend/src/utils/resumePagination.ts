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

export function computePageOffsets(
  totalHeight: number,
  pageHeight: number,
): number[] {
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return [0];
  if (totalHeight <= pageHeight) return [0];

  const offsets: number[] = [0];
  let cursor = 0;
  const maxPages = Math.ceil(totalHeight / (pageHeight * 0.5)) + 4;

  for (let i = 0; i < maxPages; i++) {
    if (cursor + pageHeight >= totalHeight) break;
    cursor += pageHeight;
    offsets.push(Math.round(cursor));
  }

  return offsets;
}

export function buildPageOffsetsFromElement(
  root: HTMLElement,
  pageHeight: number = CONTENT_HEIGHT_PX,
): number[] {
  const totalHeight = root.scrollHeight;
  if (totalHeight <= pageHeight) return [0];
  return computePageOffsets(totalHeight, pageHeight);
}

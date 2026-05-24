import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import type { ResumeDocument } from "@/types/resume-types";
import { marginMap } from "@/types/resume-types";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  buildPageOffsetsFromElement,
} from "@/utils/resumePagination";

const PAGE_GAP_PX = 18;
const RECALC_DEBOUNCE_MS = 70;

function offsetsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function parseTopMarginPx(marginStr: string): number {
  const match = marginStr.match(/^(\d+)px/);
  return match ? parseInt(match[1], 10) : 40;
}

type PaginatedResumePreviewProps = {
  resume: ResumeDocument;
  scale: number;
};

export function PaginatedResumePreview({
  resume,
  scale,
}: PaginatedResumePreviewProps): ReactElement {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pageOffsets, setPageOffsets] = useState<number[]>([0]);

  const topMarginPx = useMemo(
    () => parseTopMarginPx(marginMap[resume.style.pageMargin]),
    [resume.style.pageMargin],
  );

  useEffect(() => {
    let timeoutId: number | null = null;
    let frameId: number | null = null;

    const compute = () => {
      const measureEl = measureRef.current;
      if (!measureEl) return;

      const nextOffsets = buildPageOffsetsFromElement(measureEl, A4_HEIGHT_PX);
      setPageOffsets((prev) => (offsetsEqual(prev, nextOffsets) ? prev : nextOffsets));
    };

    const schedule = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(compute);
      }, RECALC_DEBOUNCE_MS);
    };

    schedule();

    const measureEl = measureRef.current;
    const observer = measureEl ? new ResizeObserver(schedule) : null;
    if (measureEl && observer) observer.observe(measureEl);

    window.addEventListener("resize", schedule);
    document.fonts?.ready.then(schedule).catch(() => {});

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [resume]);

  const scaledWidth = useMemo(() => A4_WIDTH_PX * scale, [scale]);
  const scaledPageHeight = useMemo(() => A4_HEIGHT_PX * scale, [scale]);

  const isMultiPage = pageOffsets.length > 1;

  return (
    <div
      style={{
        width: `${scaledWidth}px`,
        display: "flex",
        flexDirection: "column",
        gap: `${PAGE_GAP_PX * scale}px`,
      }}
    >
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-20000px",
          top: 0,
          width: `${A4_WIDTH_PX}px`,
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -1,
          overflow: "visible",
        }}
      >
        <ResumeRenderer resume={resume} />
      </div>

      {pageOffsets.map((offset, index) => {
        const isLastPage = index === pageOffsets.length - 1;
        const nextOffset = isLastPage
          ? offset + A4_HEIGHT_PX
          : pageOffsets[index + 1];
        const contentHeight = Math.min(A4_HEIGHT_PX, nextOffset - offset);

        // First page: uses the resume container's own padding, no extra spacing needed.
        // Middle pages: add top padding matching the resume's page margin so content
        //   starts at the same vertical position as on page 1.
        // Last page: no extra spacing (natural end of content).
        const isMiddlePage = index > 0 && !isLastPage;
        const effectivePaddingTop = isMiddlePage ? topMarginPx : 0;
        const effectiveHeight = isMiddlePage
          ? Math.min(A4_HEIGHT_PX, contentHeight + effectivePaddingTop)
          : contentHeight;

        return (
          <div
            key={`${offset}-${index}`}
            data-resume-page="true"
            data-page-index={index}
            className="bg-white rounded-sm"
            style={{
              width: `${scaledWidth}px`,
              height: `${scaledPageHeight}px`,
              overflow: "hidden",
              position: "relative",
              background: resume.style.backgroundColor,
            }}
          >
            <div
              data-preview-scale="true"
              style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <div
                data-page-slice="true"
                data-preserve-transform="true"
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  height: `${effectiveHeight}px`,
                  paddingTop: `${effectivePaddingTop}px`,
                  boxSizing: "border-box",
                  overflow: "hidden",
                  transform: `translateY(-${offset}px)`,
                  transformOrigin: "top left",
                  willChange: "transform",
                }}
              >
                <ResumeRenderer resume={resume} />
              </div>
            </div>

            {isMultiPage && !isLastPage && (
              <div
                className="resume-page-continued"
                style={{
                  position: "absolute",
                  bottom: `${12 * scale}px`,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  fontSize: `${8 * scale}px`,
                  color: resume.style.mutedColor || "#999",
                  letterSpacing: "0.5px",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                Continued on next page
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import type { ResumeDocument } from "@/types/resume-types";
import { marginMap } from "@/types/resume-types";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  buildPageOffsetsFromElement,
  getEffectivePageHeight,
  parsePageMarginTop,
} from "@/utils/resumePagination";
import { ResumePage } from "@/components/builder/ResumePage";

const PAGE_GAP_PX = 24;
const RECALC_DEBOUNCE_MS = 200;

function offsetsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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

  const pageMarginTop = useMemo(
    () => parsePageMarginTop(marginMap[resume.style.pageMargin]),
    [resume.style.pageMargin],
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let frameId: number | null = null;

    const compute = () => {
      const measureEl = measureRef.current;
      if (!measureEl) return;

      const nextOffsets = buildPageOffsetsFromElement(measureEl, A4_HEIGHT_PX, pageMarginTop);
      setPageOffsets((prev) => (offsetsEqual(prev, nextOffsets) ? prev : nextOffsets));
    };

    const schedule = () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(compute, RECALC_DEBOUNCE_MS);
    };

    const scheduleFrame = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(schedule);
    };

    // Initial computation
    schedule();

    // ResizeObserver for the measure container
    const measureEl = measureRef.current;
    const observer = measureEl ? new ResizeObserver(scheduleFrame) : null;
    if (measureEl && observer) observer.observe(measureEl);

    // MutationObserver to detect content changes
    const mutationObserver = measureEl ? new MutationObserver(scheduleFrame) : null;
    if (measureEl && mutationObserver) {
      mutationObserver.observe(measureEl, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
    }

    // Window resize
    const onResize = () => scheduleFrame();
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(schedule).catch(() => {});

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [resume, pageMarginTop]);

  const scaledWidth = useMemo(() => A4_WIDTH_PX * scale, [scale]);
  const scaledPageHeight = useMemo(() => A4_HEIGHT_PX * scale, [scale]);

  const effectivePageHeight = useMemo(
    () => getEffectivePageHeight(pageMarginTop),
    [pageMarginTop],
  );

  return (
    <div
      className="resume-pages-root"
      style={{
        width: `${scaledWidth}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `${PAGE_GAP_PX * scale}px`,
        position: "relative",
      }}
    >
      <div
        ref={measureRef}
        aria-hidden
        className="resume-measure-container"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: `${A4_WIDTH_PX}px`,
          height: "auto",
          visibility: "visible",
          pointerEvents: "none",
          zIndex: -1,
          display: "block",
          overflow: "visible",
          margin: 0,
          padding: 0,
          border: "none",
        }}
      >
        <ResumeRenderer resume={resume} />
      </div>

      {pageOffsets.map((offset, index) => {
        const isLastPage = index === pageOffsets.length - 1;
        const nextOffset = isLastPage
          ? offset + A4_HEIGHT_PX
          : pageOffsets[index + 1];
        const sliceHeight = nextOffset - offset;
        const isFirstPage = index === 0;

        return (
          <ResumePage
            key={`page-${index}`}
            index={index}
            backgroundColor={resume.style.backgroundColor}
            style={{
              width: `${scaledWidth}px`,
              minHeight: `${scaledPageHeight}px`,
            }}
          >
            <div
              data-preview-scale="true"
              style={{
                width: A4_WIDTH_PX,
                height: A4_HEIGHT_PX,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {!isFirstPage && (
                <div
                  data-page-spacer="true"
                  style={{
                    width: A4_WIDTH_PX,
                    height: pageMarginTop,
                    flexShrink: 0,
                    background: resume.style.backgroundColor,
                  }}
                />
              )}
              <div
                data-page-slice="true"
                data-page-index={index}
                style={{
                  width: A4_WIDTH_PX,
                  height: Math.min(
                    isFirstPage ? A4_HEIGHT_PX : effectivePageHeight,
                    sliceHeight,
                  ),
                  overflow: "hidden",
                  transform: `translateY(-${offset}px)`,
                  transformOrigin: "top left",
                }}
              >
                <ResumeRenderer resume={resume} />
              </div>
            </div>
          </ResumePage>
        );
      })}

      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .resume-pages-root { gap: 0 !important; }
          .resume-measure-container { display: none !important; }
          [data-resume-page] {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            min-height: 1123px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          [data-resume-page]:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          section, article, li, p, [class*='job'], [class*='entry'], [class*='item'], [class*='project'], [class*='skill'], [data-pagination-block] {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          h1, h2, h3, h4, h5, h6, [class*='section-title'], [class*='sectionTitle'], [class*='heading'], [class*='label'] {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

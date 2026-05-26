import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import type { ResumeDocument } from "@/types/resume-types";
import {
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  PAGE_PADDING_PX,
  CONTENT_HEIGHT_PX,
  buildPageOffsetsFromElement,
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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const compute = () => {
      const measureEl = measureRef.current;
      if (!measureEl) return;

      const nextOffsets = buildPageOffsetsFromElement(measureEl, CONTENT_HEIGHT_PX);
      setPageOffsets((prev) => (offsetsEqual(prev, nextOffsets) ? prev : nextOffsets));
    };

    const schedule = () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(compute, RECALC_DEBOUNCE_MS);
    };

    schedule();

    const measureEl = measureRef.current;
    const observer = measureEl ? new ResizeObserver(schedule) : null;
    if (measureEl && observer) observer.observe(measureEl);

    const onResize = () => schedule();
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(schedule).catch(() => {});

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [resume]);

  const scaledWidth = useMemo(() => A4_WIDTH_PX * scale, [scale]);
  const scaledPageHeight = useMemo(() => A4_HEIGHT_PX * scale, [scale]);

  return (
    <div
      className="resume-pages-root"
      style={{
        width: `${scaledWidth}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `${PAGE_GAP_PX * scale}px`,
      }}
    >
      <div
        ref={measureRef}
        aria-hidden
        className="resume-measure-container"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: A4_WIDTH_PX,
          padding: PAGE_PADDING_PX,
          boxSizing: "border-box",
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
          ? offset + CONTENT_HEIGHT_PX
          : pageOffsets[index + 1];
        const sliceHeight = nextOffset - offset;

        return (
          <ResumePage
            key={`page-${index}`}
            index={index}
            backgroundColor={resume.style.backgroundColor}
            style={{
              width: `${scaledWidth}px`,
              minHeight: `${scaledPageHeight}px`,
              padding: `${PAGE_PADDING_PX * scale}px`,
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
              <div
                data-page-slice="true"
                style={{
                  width: A4_WIDTH_PX,
                  height: Math.min(CONTENT_HEIGHT_PX, sliceHeight),
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

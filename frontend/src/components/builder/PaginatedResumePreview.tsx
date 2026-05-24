import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import type { ResumeDocument } from "@/types/resume-types";
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
    document.fonts?.ready.then(schedule).catch(() => {
      // best effort
    });

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [resume]);

  const scaledWidth = useMemo(() => A4_WIDTH_PX * scale, [scale]);
  const scaledPageHeight = useMemo(() => A4_HEIGHT_PX * scale, [scale]);

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

      {pageOffsets.map((offset, index) => (
        <div
          key={`${offset}-${index}`}
          data-resume-page="true"
          className="bg-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] rounded-sm"
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
                transform: `translateY(-${offset}px)`,
                transformOrigin: "top left",
                willChange: "transform",
              }}
            >
              <ResumeRenderer resume={resume} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

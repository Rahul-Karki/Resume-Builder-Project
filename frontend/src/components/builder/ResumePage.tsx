import type { CSSProperties, ReactNode } from "react";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "@/utils/resumePagination";

type ResumePageProps = {
  children: ReactNode;
  index: number;
  backgroundColor?: string;
  style?: CSSProperties;
  className?: string;
};

const basePageStyle: CSSProperties = {
  width: A4_WIDTH_PX,
  minHeight: A4_HEIGHT_PX,
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
  background: "#ffffff",
};

export function ResumePage({
  children,
  index,
  backgroundColor = "#ffffff",
  style,
  className,
}: ResumePageProps) {
  return (
    <div
      data-resume-page="true"
      data-page-index={index}
      className={className}
      style={{
        ...basePageStyle,
        background: backgroundColor,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

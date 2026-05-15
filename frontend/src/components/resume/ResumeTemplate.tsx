import type { ReactNode } from "react";
import { ResumeRenderer } from "@/templates/ResumeRenderer";
import type { ResumeDocument } from "@/types/resume-types";

type ResumeTemplateMode = "screen" | "print";

type ResumeTemplateProps = {
  resume: ResumeDocument;
  mode?: ResumeTemplateMode;
  className?: string;
  children?: ReactNode;
};

const resumeTemplateStyles = `
  .resume-template {
    width: 100%;
  }

  .resume-template__canvas {
    width: 210mm;
    min-height: 297mm;
    box-sizing: border-box;
    overflow: visible;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .resume-template__canvas,
  .resume-template__canvas * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .resume-template__canvas img {
    max-width: 100%;
    height: auto;
  }

  .resume-template__canvas h1,
  .resume-template__canvas h2,
  .resume-template__canvas h3,
  .resume-template__canvas h4,
  .resume-template__canvas h5,
  .resume-template__canvas h6,
  .resume-template__canvas p,
  .resume-template__canvas ul,
  .resume-template__canvas ol,
  .resume-template__canvas li,
  .resume-template__canvas section,
  .resume-template__canvas article,
  .resume-template__canvas header,
  .resume-template__canvas footer,
  .resume-template__canvas img,
  .resume-template__canvas svg {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .resume-template--screen {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 24px 16px;
    background: linear-gradient(180deg, #f6f7f9 0%, #eceff3 100%);
  }

  .resume-template--screen .resume-template__canvas {
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
  }

  .resume-template--print {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0;
    background: #ffffff;
  }

  .resume-template--print .resume-template__canvas {
    box-shadow: none;
    margin: 0 auto;
  }

  @page {
    size: A4;
    margin: 0;
  }

  @media print {
    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .resume-template {
      min-height: auto;
      padding: 0;
      background: #ffffff;
    }

    .resume-template__canvas {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      box-shadow: none;
    }
  }
`;

export function ResumeTemplate({ resume, mode = "screen", className, children }: ResumeTemplateProps) {
  const rootClassName = ["resume-template", `resume-template--${mode}`, className].filter(Boolean).join(" ");

  return (
    <section className={rootClassName} aria-label="Resume preview">
      <style>{resumeTemplateStyles}</style>
      {children}
      <div className="resume-template__canvas">
        <ResumeRenderer resume={resume} forExport />
      </div>
    </section>
  );
}

export default ResumeTemplate;
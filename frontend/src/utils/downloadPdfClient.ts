import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "@/utils/resumePagination";

const OKLCH_VARS = [
  "--background", "--foreground", "--card", "--card-foreground",
  "--popover", "--popover-foreground", "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--destructive",
  "--border", "--input", "--ring",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
  "--sidebar", "--sidebar-foreground",
  "--sidebar-primary", "--sidebar-primary-foreground",
  "--sidebar-accent", "--sidebar-accent-foreground",
  "--sidebar-border", "--sidebar-ring",
];

function buildCssVarOverride(): string {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const lines: string[] = [":root {"];
  for (const v of OKLCH_VARS) {
    const val = style.getPropertyValue(v).trim();
    if (val) lines.push(`  ${v}: ${val};`);
  }
  lines.push("}");
  return lines.join("\n");
}

function inlineComputedColors(root: HTMLElement): void {
  const colorProps = [
    "color", "background-color",
    "border-top-color", "border-right-color",
    "border-bottom-color", "border-left-color",
    "outline-color", "text-decoration-color",
  ];
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of elements) {
    const computed = getComputedStyle(el);
    for (const prop of colorProps) {
      const value = computed.getPropertyValue(prop);
      if (value && value !== "transparent" && value !== "rgba(0, 0, 0, 0)") {
        el.style.setProperty(prop, value);
      }
    }
  }
}

export async function downloadResumePDF(): Promise<void> {
  const pageElements = document.querySelectorAll<HTMLElement>("[data-resume-page]");
  if (!pageElements.length) throw new Error("No resume pages found for export");

  const cssOverride = buildCssVarOverride();

  const pdf = new jsPDF({
    unit: "px",
    format: [A4_WIDTH_PX, A4_HEIGHT_PX],
    hotfixes: ["px_scaling"],
  });

  for (let i = 0; i < pageElements.length; i++) {
    const original = pageElements[i];
    const clone = original.cloneNode(true) as HTMLElement;

    clone.querySelectorAll<HTMLElement>("[data-preview-scale]").forEach((el) => {
      el.style.transform = "none";
      el.style.width = `${A4_WIDTH_PX}px`;
      el.style.height = `${A4_HEIGHT_PX}px`;
    });

    clone.style.position = "fixed";
    clone.style.left = "-9999px";
    clone.style.top = "0";
    clone.style.width = `${A4_WIDTH_PX}px`;
    clone.style.minHeight = `${A4_HEIGHT_PX}px`;
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    clone.style.transform = "none";
    clone.style.zIndex = "-1";

    document.body.appendChild(clone);

    await new Promise((resolve) => requestAnimationFrame(resolve));

    inlineComputedColors(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement("style");
          style.textContent = cssOverride;
          clonedDoc.head.appendChild(style);

          clonedDoc
            .querySelectorAll(".no-print, .edit-overlay, [data-ui-only]")
            .forEach((el) => el.remove());
        },
      });

      const imgData = canvas.toDataURL("image/png");
      if (i > 0) pdf.addPage([A4_WIDTH_PX, A4_HEIGHT_PX]);
      pdf.addImage(imgData, "PNG", 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
    } finally {
      clone.remove();
    }
  }

  pdf.save("resume.pdf");
}

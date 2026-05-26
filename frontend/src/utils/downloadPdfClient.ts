import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { A4_HEIGHT_PX, A4_WIDTH_PX } from "@/utils/resumePagination";

const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
];

function inlineComputedColors(root: HTMLElement): void {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of elements) {
    const computed = getComputedStyle(el);
    for (const prop of COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (
        value &&
        value !== "transparent" &&
        value !== "rgba(0, 0, 0, 0)"
      ) {
        el.style.setProperty(prop, value);
      }
    }
  }
}

export async function downloadResumePDF(): Promise<void> {
  const pageElements = document.querySelectorAll<HTMLElement>("[data-resume-page]");
  if (!pageElements.length) throw new Error("No resume pages found for export");

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

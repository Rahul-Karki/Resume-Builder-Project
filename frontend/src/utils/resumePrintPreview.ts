import type { ResumeDocument } from "@/types/resume-types";

export const RESUME_PRINT_PAYLOAD_PREFIX = "resume-print-payload:";

export const buildResumePrintPreviewUrl = (resumeId: string, payloadKey: string) =>
  `/resume/preview/${encodeURIComponent(resumeId)}?print=1&payloadKey=${encodeURIComponent(payloadKey)}`;

export const storeResumePrintPayload = (resumeId: string, resume: ResumeDocument) => {
  const payloadKey = `${RESUME_PRINT_PAYLOAD_PREFIX}${resumeId}`;
  window.localStorage.setItem(payloadKey, JSON.stringify({ resume, createdAt: Date.now() }));
  return payloadKey;
};

export const readResumePrintPayload = (payloadKey: string): ResumeDocument | null => {
  try {
    const rawPayload = window.localStorage.getItem(payloadKey);
    if (!rawPayload) return null;

    const parsed = JSON.parse(rawPayload) as { resume?: ResumeDocument };
    return parsed.resume ?? null;
  } catch {
    return null;
  }
};

export const clearResumePrintPayload = (payloadKey: string) => {
  window.localStorage.removeItem(payloadKey);
};

export const openResumePrintPreview = (resumeId: string, resume: ResumeDocument) => {
  const payloadKey = storeResumePrintPayload(resumeId, resume);
  const previewUrl = buildResumePrintPreviewUrl(resumeId, payloadKey);
  const previewWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");

  if (!previewWindow) {
    clearResumePrintPayload(payloadKey);
    throw new Error("Your browser blocked the print preview tab. Allow pop-ups and try again.");
  }

  previewWindow.focus();
  return { payloadKey, previewUrl };
};
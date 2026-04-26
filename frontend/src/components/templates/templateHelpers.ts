import type { CertEntry, Project, WorkEntry } from "@/types/resume-types";

export function formatDateRange(start: string, end: string, current: boolean): string {
  const from = start.trim();
  const to = current ? "Present" : end.trim();

  if (!from && !to) return "";
  if (!from) return to;
  if (!to) return from;
  return `${from} - ${to}`;
}

export function formatProjectTech(project: Project): string {
  return project.tech
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .join(" · ");
}

export function formatCertification(certification: CertEntry): string {
  const issuer = certification.issuer?.trim();
  const year = certification.year?.trim();

  if (issuer && year) return `${certification.name} - ${issuer} (${year})`;
  if (issuer) return `${certification.name} - ${issuer}`;
  if (year) return `${certification.name} (${year})`;
  return certification.name;
}

export function getDisplayBullets(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

export function isParagraphMode(mode: "bullets" | "paragraph"): boolean {
  return mode === "paragraph";
}

export function getExperienceParagraph(entry: WorkEntry): string {
  return entry.description?.trim() ?? "";
}

export function getProjectParagraph(project: Project): string {
  return project.description?.trim() ?? "";
}

function hasScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

export function toAbsoluteUrl(raw: string): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (hasScheme(value)) return value;
  return `https://${value}`;
}

export function toMailto(rawEmail: string): string {
  const value = (rawEmail ?? "").trim();
  if (!value) return "";
  if (value.toLowerCase().startsWith("mailto:")) return value;
  return `mailto:${value}`;
}

export function toTel(rawPhone: string): string {
  const value = (rawPhone ?? "").trim();
  if (!value) return "";
  if (value.toLowerCase().startsWith("tel:")) return value;
  const normalized = value.replace(/[^\d+]/g, "");
  return `tel:${normalized || value}`;
}

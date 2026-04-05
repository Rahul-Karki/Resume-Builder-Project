import type { CertEntry, Project } from "@/types/resume-types";

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
